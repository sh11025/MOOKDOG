let currentSlide = 0;
let totalSlides = 0;
let slideInterval;

function getHighQualityThumbnail(url) {
  if (!url || typeof url !== "string") return url;
  return url.replace(/thumb\/R120x174/g, "thumb/R300x0");
}

async function fetchKakaoBooks(query, size = 6, sort = "accuracy") {
  // 항상 안전하게 로컬 JSON 백업 데이터를 먼저 참조하거나 API 실패 시 폴백하도록 구성
  try {
    if (KAKAO_REST_API_KEY && KAKAO_REST_API_KEY !== "YOUR_KAKAO_REST_API_KEY") {
      const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&sort=${sort}&size=${size}`, {
        headers: getKakaoHeaders(),
      });
      const data = await res.json();
      if (data && data.documents && data.documents.length > 0) {
        const docs = data.documents
          .filter((b) => {
            if (!b || !b.thumbnail || typeof b.thumbnail !== "string" || b.thumbnail.trim() === "") return false;
            const isNoImage = b.thumbnail.includes("no_image") || b.thumbnail.includes("kyobobook.co.kr/images/no_img") || b.thumbnail.length < 15;
            return !isNoImage;
          })
          .map((b) => ({
            ...b,
            thumbnail: getHighQualityThumbnail(b.thumbnail)
          }));
        if (docs.length > 0) return docs;
      }
    }
  } catch (err) {
    console.warn("카카오 API 호출 실패, 로컬 데이터로 대체합니다.", err);
  }

  // API 키가 없거나 호출 실패 시 로컬 JSON(main_books.json) 데이터 반환
  try {
    const res = await fetch("json/main_books.json");
    const data = await res.json();
    let list = [];
    if (query === "hero_5_categories" || query.includes("베스트") || query.includes("인문") || query.includes("예술") || query.includes("소설")) list = data.hero || [];
    else if (query.includes("신간") || query.includes("도서")) list = data.newReleases || [];
    else if (query.includes("베스트셀러")) list = data.bestSellers || [];
    else if (query.includes("문학") || query.includes("세계문학")) list = data.literatureBooks || [];
    else list = data.newReleases || [];
    
    return (list || []).filter((b) => {
      if (!b || !b.thumbnail || typeof b.thumbnail !== "string" || b.thumbnail.trim() === "") return false;
      const isNoImage = b.thumbnail.includes("no_image") || b.thumbnail.includes("kyobobook.co.kr/images/no_img") || b.thumbnail.length < 15;
      return !isNoImage;
    });
  } catch (localErr) {
    console.error("로컬 JSON 로드 실패:", localErr);
    return [];
  }
}

// 1. 5대 대분류에 맞춘 히어로 슬라이더 초기화
async function initHeroSlider() {
  const sliderContainer = document.getElementById("hero-slider-container");
  const dotsContainer = document.getElementById("hero-dots-container");
  let heroBooks = [];

  const categories = [
    { name: "소설/문학", query: "한국소설" },
    { name: "경제/경영", query: "경제경영" },
    { name: "자기계발", query: "자기계발" },
    { name: "인문/역사/철학", query: "인문학" },
    { name: "기타 분야", query: "예술" }
  ];

  const results = await Promise.all(categories.map((cat) => fetchKakaoBooks(cat.query, 5, "accuracy")));
  heroBooks = results.map((docs, idx) => {
    const book = docs.find(b => b.thumbnail && b.thumbnail.trim() !== "");
    if (book) book.displayCategory = categories[idx].name;
    return book;
  }).filter(Boolean);

  if (heroBooks.length === 0) {
    // 최후의 보조 데이터
    const localRes = await fetch("json/main_books.json");
    const localData = await localRes.json();
    heroBooks = localData.hero || [];
  }

  if (!sliderContainer || heroBooks.length === 0) return;

  sliderContainer.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  totalSlides = heroBooks.length;

  heroBooks.forEach((book, idx) => {
    const primaryIsbn = (book.isbn || "").trim().split(" ")[0] || "";
    const activeClass = idx === 0 ? "active" : "";
    const categoryName = book.displayCategory || book.category || "이달의 추천 도서";

    const slideEl = document.createElement("div");
    slideEl.className = `hero-slide ${activeClass} p-6 md:p-12`;
    slideEl.innerHTML = `
      <div class="flex flex-col md:flex-row gap-8 items-center w-full">
        <div class="w-full md:w-1/2 flex justify-center items-center relative z-10">
          <a href="shop_page.html?isbn=${primaryIsbn}&title=${encodeURIComponent(book.title)}" class="block">
            <div class="relative w-48 md:w-64 aspect-[2/3] border border-black bg-white shadow-sm transform transition-transform hover:scale-105 duration-500 overflow-hidden">
              <img class="w-full h-full object-cover" src="${book.thumbnail}" alt="${book.title}" />
            </div>
          </a>
        </div>
        <div class="w-full md:w-1/2 flex flex-col items-start gap-3 z-10">
          <span class="text-xs font-semibold uppercase tracking-widest text-neutral-500 border border-black px-3 py-1">${categoryName}</span>
          <h1 class="font-serif text-3xl md:text-5xl font-bold leading-tight line-clamp-2">${book.title}</h1>
          <p class="text-base text-neutral-600">${(book.authors || []).join(", ") || '저자 미상'} 저 / ${book.publisher || ''}</p>
          <blockquote class="font-serif text-base md:text-lg italic text-neutral-700 border-l-2 border-black pl-4 my-3 max-w-md line-clamp-3">
            "${book.contents || '작품 설명이 제공되지 않는 도서입니다.'}"
          </blockquote>
          <a href="shop_page.html?isbn=${primaryIsbn}&title=${encodeURIComponent(book.title)}" class="mt-2 inline-block bg-black text-white text-xs font-semibold uppercase px-8 py-4 tracking-wider border border-black hover:bg-white hover:text-black transition-colors">지금 확인하기</a>
        </div>
      </div>`;
    sliderContainer.appendChild(slideEl);

    if (dotsContainer) {
      const dot = document.createElement("button");
      dot.className = `hero-dot w-2 h-2 rounded-full transition-colors ${idx === 0 ? 'bg-black' : 'bg-neutral-300 hover:bg-neutral-500'}`;
      dot.onclick = () => {
        goToSlide(idx);
        restartAutoSlide();
      };
      dotsContainer.appendChild(dot);
    }
  });

  setupSliderControls();
  startAutoSlide();
}

function updateSlider(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  slides.forEach((slide, i) => {
    if (i === index) slide.classList.add("active");
    else slide.classList.remove("active");
  });

  dots.forEach((dot, i) => {
    if (i === index) {
      dot.className = "hero-dot w-2 h-2 rounded-full bg-black";
    } else {
      dot.className = "hero-dot w-2 h-2 rounded-full bg-neutral-300 hover:bg-neutral-500 transition-colors";
    }
  });
}

function nextSlide() {
  if (totalSlides === 0) return;
  currentSlide = (currentSlide + 1) % totalSlides;
  updateSlider(currentSlide);
}

function prevSlide() {
  if (totalSlides === 0) return;
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  updateSlider(currentSlide);
}

function goToSlide(index) {
  currentSlide = index;
  updateSlider(currentSlide);
}

function setupSliderControls() {
  const prevBtn = document.getElementById("hero-prev");
  const nextBtn = document.getElementById("hero-next");

  if (prevBtn) {
    prevBtn.onclick = () => {
      prevSlide();
      restartAutoSlide();
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      nextSlide();
      restartAutoSlide();
    };
  }
}

function startAutoSlide() {
  clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 7000);
}

function restartAutoSlide() {
  clearInterval(slideInterval);
  startAutoSlide();
}

// 2. 섹션별 캐러셀 로드
async function renderCarouselSection(keyword, elementId, sortType = "accuracy") {
  const books = await fetchKakaoBooks(keyword, 20, sortType);
  let validBooks = (books || []).filter(b => b && b.thumbnail && b.thumbnail.trim() !== "").slice(0, 8);
  
  // 만약 API 및 기본 검색결과가 비어있다면 로컬 파일에서 직접 강제 주입
  if (validBooks.length === 0) {
    try {
      const res = await fetch("json/main_books.json");
      const data = await res.json();
      if (elementId === "new-releases-list") validBooks = data.newReleases || [];
      else if (elementId === "bestsellers-list") validBooks = data.bestSellers || [];
      else if (elementId === "literature-books-list") validBooks = data.literatureBooks || [];
    } catch (e) {
      console.error(e);
    }
  }

  const container = document.getElementById(elementId);
  if (!container) return;

  if (validBooks.length === 0) {
    container.innerHTML = `<p class="text-xs text-neutral-400 pl-2">등록된 도서가 없습니다.</p>`;
    return;
  }

  container.innerHTML = validBooks
    .map((book) => {
      const isbn = (book.isbn || "").trim().split(" ")[0] || "";
      const priceVal = book.sale_price > 0 ? book.sale_price : (book.price || 0);
      return `
        <a href="shop_page.html?isbn=${isbn}&title=${encodeURIComponent(book.title || '')}" class="flex flex-col group/item shrink-0 w-44">
          <div class="w-full aspect-[2/3] border border-black mb-3 overflow-hidden bg-white">
            <img src="${book.thumbnail}" alt="${book.title || ''}" class="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105" />
          </div>
          <h3 class="font-serif text-sm font-bold line-clamp-1 mb-0.5 group-hover/item:underline">${book.title || '제목 없음'}</h3>
          <p class="text-xs text-neutral-500 mb-1.5 line-clamp-1">${(book.authors || []).join(", ") || '저자 미상'}</p>
          <p class="text-xs font-bold">₩${priceVal.toLocaleString()}</p>
        </a>`;
    })
    .join("");
}

function scrollCarousel(elementId, distance) {
  const container = document.getElementById(elementId);
  if (container) container.scrollBy({ left: distance, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  initHeroSlider();
  renderCarouselSection("소설", "new-releases-list", "recency");
  renderCarouselSection("베스트셀러", "bestsellers-list", "accuracy");
  renderCarouselSection("세계문학", "literature-books-list", "accuracy");
});