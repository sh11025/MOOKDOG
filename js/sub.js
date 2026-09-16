function getHighQualityThumbnail(url) {
  if (!url || typeof url !== "string") return url;
  return url.replace(/thumb\/R120x174/g, "thumb/R300x0");
}

let rawBooks = [];
let currentPage = 1;
let totalCount = 0;
const pageSize = 12;

let selectedBookFormats = {};

const SLIDER_MAX = 50000;

let currentFilters = {
  categories: [],
  format: "all",
  minPrice: 0,
  maxPrice: 50000,
  sort: "accuracy",
  search: "문학",
};

function getBookFormats(book) {
  if (book.formats && Array.isArray(book.formats) && book.formats.length > 0) {
    return book.formats;
  }
  if (book.format) {
    return [book.format];
  }
  return ["종이책", "전자책"];
}

function getBookPriceByFormat(book, format) {
  const basePrice = book.sale_price > 0 ? book.sale_price : (book.price || 0);
  if (format === "전자책") {
    return Math.floor((basePrice * 0.7) / 100) * 100;
  }
  return basePrice;
}

// [핵심] API로 가져온 도서에 카테고리 자동 분류 태깅 부여 함수
function assignBookCategories(book) {
  if (book.category && book.category.length > 2) return book.category; // 이미 카테고리가 있으면 유지

  const text = `${book.title || ""} ${book.contents || ""} ${book.publisher || ""}`.toLowerCase();
  let assigned = [];

  // 1. 소설/문학 매칭
  if (text.includes("소설") || text.includes("문학") || text.includes("장편") || text.includes("이야기") || text.includes("시집") || text.includes("시인") || text.includes("산문") || text.includes("에세이") || text.includes("수필")) {
    assigned.push("소설/문학");
    if (text.includes("한국")) assigned.push("한국소설");
    else if (text.includes("영미") || text.includes("번역")) assigned.push("영미소설");
    else assigned.push("영미소설"); // 기본값

    if (text.includes("추리") || text.includes("미스터리") || text.includes("스릴러")) assigned.push("추리/미스터리");
    if (text.includes("시집") || text.includes("시인") || text.includes("시")) assigned.push("시");
    if (text.includes("에세이") || text.includes("수필") || text.includes("산문")) assigned.push("에세이");
  }

  // 2. 경제/경영 매칭
  if (text.includes("경제") || text.includes("경영") || text.includes("투자") || text.includes("주식") || text.includes("재테크") || text.includes("마케팅") || text.includes("부동산") || text.includes("ceo") || text.includes("재무")) {
    assigned.push("경제/경영");
    if (text.includes("투자") || text.includes("재테크") || text.includes("부동산")) assigned.push("재테크");
    if (text.includes("주식") || text.includes("증권")) assigned.push("주식");
    if (text.includes("마케팅") || text.includes("브랜드")) assigned.push("마케팅");
    if (text.includes("경영")) assigned.push("경영 일반");
  }

  // 3. 자기계발 매칭
  if (text.includes("성공") || text.includes("습관") || text.includes("처세") || text.includes("대화") || text.includes("태도") || text.includes("마인드") || text.includes("시간관리") || text.includes("자기계발") || text.includes("시간 관리")) {
    assigned.push("자기계발");
    if (text.includes("성공") || text.includes("동기부여")) assigned.push("성공");
    if (text.includes("처세") || text.includes("인간관계")) assigned.push("처세");
    if (text.includes("대화") || text.includes("말투") || text.includes("스피치")) assigned.push("대화");
    if (text.includes("시간") || text.includes("습관")) assigned.push("시간 관리");
  }

  // 4. 인문/역사/철학 매칭
  if (text.includes("철학") || text.includes("역사") || text.includes("심리") || text.includes("인문") || text.includes("세계사") || text.includes("종교") || text.includes("사상") || text.includes("역사학")) {
    assigned.push("인문/역사/철학");
    if (text.includes("역사") || text.includes("세계사") || text.includes("한국사")) assigned.push("역사");
    if (text.includes("심리")) assigned.push("심리학");
    if (text.includes("종교") || text.includes("신앙")) assigned.push("종교");
    if (text.includes("철학") || text.includes("사상")) assigned.push("철학 도서");
  }

  // 5. 기타 분야 매칭 (위 대분류 중 매칭된 것이 없을 때만 폴백)
  if (assigned.length === 0) {
    assigned.push("기타 분야");
    if (text.includes("과학") || text.includes("물리") || text.includes("우주")) assigned.push("과학");
    else if (text.includes("컴퓨터") || text.includes("코딩") || text.includes("it") || text.includes("프로그래밍")) assigned.push("컴퓨터/IT");
    else if (text.includes("예술") || text.includes("미술") || text.includes("디자인") || text.includes("건축") || text.includes("음악")) assigned.push("예술");
    else if (text.includes("여행") || text.includes("가이드")) assigned.push("여행");
    else assigned.push("가정/육아");
  }

  return assigned.join(",");
}

// 1. 도서 데이터 가져오기 및 자동 분류 적용
async function fetchBooksFromAPI(query = "문학", sort = "accuracy", page = 1) {
  currentFilters.search = query;
  currentFilters.sort = sort;
  currentPage = page;

  if (!KAKAO_REST_API_KEY || KAKAO_REST_API_KEY === "YOUR_KAKAO_REST_API_KEY") {
    try {
      const res = await fetch("json/catalog_books.json");
      const list = await res.json();
      rawBooks = (list || []).filter((b) => b.thumbnail && b.thumbnail.trim() !== "");
      totalCount = rawBooks.length;
      applyClientFilters();
      renderPagination(totalCount, 1);
    } catch (err) {
      console.error("로컬 카탈로그 로드 실패:", err);
      renderBookGrid([]);
    }
    return;
  }

  const apiSort = sort === "recency" ? "recency" : "accuracy";
  try {
    const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&sort=${apiSort}&page=${page}&size=20`, {
      headers: getKakaoHeaders(),
    });
    const data = await res.json();
    const docs = data.documents || [];
    
    // 가져온 도서들에 카테고리 자동 태깅 부여 및 대체 이미지 필터링
    rawBooks = docs
      .filter((b) => {
        if (!b || !b.thumbnail || typeof b.thumbnail !== "string" || b.thumbnail.trim() === "") return false;
        const isNoImage = b.thumbnail.includes("no_image") || b.thumbnail.includes("kyobobook.co.kr/images/no_img") || b.thumbnail.length < 15;
        return !isNoImage;
      })
      .map((b) => ({
        ...b,
        thumbnail: getHighQualityThumbnail(b.thumbnail),
        category: assignBookCategories(b)
      }))
      .slice(0, pageSize);

    totalCount = data.meta ? data.meta.total_count : 0;
    applyClientFilters();
    renderPagination(totalCount, page);
  } catch (err) {
    console.error("도서 로드 실패:", err);
    renderBookGrid([]);
    renderPagination(0, 1);
  }
}

function toggleSubCategory(subId, btn) {
  const target = document.getElementById(subId);
  const icon = btn.querySelector(".material-symbols-outlined");
  if (!target) return;

  const isHidden = target.classList.contains("hidden");
  if (isHidden) {
    target.classList.remove("hidden");
    if (icon) icon.style.transform = "rotate(180deg)";
  } else {
    target.classList.add("hidden");
    if (icon) icon.style.transform = "rotate(0deg)";
  }
}

// 카테고리 체크박스 선택 시 API 재검색 연동 함수
function handleCategoryChange() {
  const mainChecked = Array.from(document.querySelectorAll(".main-category-cb:checked"))
    .flatMap((cb) => cb.value.split(","));
  const subChecked = Array.from(document.querySelectorAll(".category-checkbox:checked"))
    .flatMap((cb) => cb.value.split(","));

  const activeKeywords = [...new Set([...mainChecked, ...subChecked])].filter(Boolean);

  let newQuery = activeKeywords.slice(0, 3).join(" ");
  if (!newQuery.trim()) {
    newQuery = "문학";
  }

  fetchBooksFromAPI(newQuery, currentFilters.sort, 1);
}

// 2. 필터링 로직
function applyClientFilters() {
  const mainChecked = Array.from(document.querySelectorAll(".main-category-cb:checked"))
    .flatMap((cb) => cb.value.split(","));
  const subChecked = Array.from(document.querySelectorAll(".category-checkbox:checked"))
    .flatMap((cb) => cb.value.split(","));

  const activeKeywords = [...new Set([...mainChecked, ...subChecked])].filter(Boolean);
  currentFilters.categories = activeKeywords;

  let filtered = rawBooks.filter((book) => {
    if (!book.thumbnail || book.thumbnail.trim() === "") return false;

    const formats = getBookFormats(book);
    if (currentFilters.format !== "all" && !formats.includes(currentFilters.format)) {
      return false;
    }

    const currentSelectedFormat = selectedBookFormats[book.isbn] || (currentFilters.format !== "all" ? currentFilters.format : formats[0]);
    const effectivePrice = getBookPriceByFormat(book, currentSelectedFormat);
    const matchesPrice = effectivePrice >= currentFilters.minPrice && effectivePrice <= currentFilters.maxPrice;

    const matchesCategory =
      activeKeywords.length === 0 ||
      activeKeywords.some(
        (kw) =>
          book.category &&
          book.category.split(",").some((cat) => cat.includes(kw) || kw.includes(cat))
      );

    return matchesPrice && matchesCategory;
  });

  if (currentFilters.sort === "price-asc") {
    filtered.sort((a, b) => {
      const pA = getBookPriceByFormat(a, selectedBookFormats[a.isbn] || getBookFormats(a)[0]);
      const pB = getBookPriceByFormat(b, selectedBookFormats[b.isbn] || getBookFormats(b)[0]);
      return pA - pB;
    });
  } else if (currentFilters.sort === "price-desc") {
    filtered.sort((a, b) => {
      const pA = getBookPriceByFormat(a, selectedBookFormats[a.isbn] || getBookFormats(a)[0]);
      const pB = getBookPriceByFormat(b, selectedBookFormats[b.isbn] || getBookFormats(b)[0]);
      return pB - pA;
    });
  }

  renderBookGrid(filtered);
}

// 3. 도서 카드 렌더링
function renderBookGrid(books) {
  const grid = document.getElementById("books-grid");
  const emptyState = document.getElementById("empty-state");
  const countLabel = document.getElementById("results-count");

  if (!grid) return;
  grid.innerHTML = "";

  if (!books || books.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (countLabel) countLabel.textContent = "0개 결과 표시 중";
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (countLabel) countLabel.textContent = `전체 결과 중 ${books.length}개 표시 중 (페이지 ${currentPage})`;

  grid.innerHTML = books
    .map((book) => {
      const isbn = (book.isbn || "").trim().split(" ")[0] || "";
      const formats = getBookFormats(book);

      if (!selectedBookFormats[isbn]) {
        selectedBookFormats[isbn] =
          currentFilters.format !== "all" && formats.includes(currentFilters.format) ? currentFilters.format : formats[0];
      }
      const currentActiveFormat = selectedBookFormats[isbn];
      const price = getBookPriceByFormat(book, currentActiveFormat);
      const safeTitle = (book.title || "").replace(/'/g, "\\'");

      const formatButtonsHtml = formats
        .map((fmt) => {
          const isActive = fmt === currentActiveFormat;
          const btnClass = isActive
            ? "bg-black text-white border-black font-bold"
            : "bg-transparent text-neutral-500 border-neutral-300 hover:border-black hover:text-black";
          return `
            <button 
              type="button" 
              onclick="changeCardFormat('${isbn}', '${fmt}')" 
              class="text-[10px] uppercase border px-1.5 py-0.5 transition-colors ${btnClass}"
            >
              ${fmt}
            </button>
          `;
        })
        .join("");

      return `
        <div class="group relative flex flex-col h-full" id="card-${isbn}">
          <div class="relative aspect-[2/3] w-full overflow-hidden border border-black bg-white mb-3">
            <a href="shop_page.html?isbn=${isbn}&title=${encodeURIComponent(book.title || '')}" class="block w-full h-full">
              <img src="${book.thumbnail}" alt="${book.title || ''}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </a>
            <div class="absolute bottom-0 left-0 right-0 p-3 flex gap-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm border-t border-black">
              <button type="button" onclick="addToCart('${safeTitle}', ${price}, '${currentActiveFormat}', '${book.thumbnail}', '${isbn}')" class="flex-1 bg-black text-white text-xs font-semibold uppercase py-2.5 border border-black hover:bg-white hover:text-black transition-colors">장바구니 담기</button>
              <button type="button" onclick="openQuickView('${isbn}')" class="w-10 flex justify-center items-center bg-white text-black border border-black hover:bg-black hover:text-white transition-colors">
                <span class="material-symbols-outlined text-base">visibility</span>
              </button>
            </div>
          </div>
          <div class="flex flex-col flex-grow">
            <div class="flex justify-between items-start mb-1">
              <a href="shop_page.html?isbn=${isbn}&title=${encodeURIComponent(book.title || '')}" class="hover:underline">
                <h3 class="font-serif text-base font-bold line-clamp-1">${book.title || '제목 없음'}</h3>
              </a>
              <span id="price-${isbn}" class="text-sm font-semibold ml-2">₩${price.toLocaleString()}</span>
            </div>
            <p class="text-xs text-neutral-500 mb-3 line-clamp-1">${(book.authors || []).join(", ") || '저자 미상'}</p>
            <div class="mt-auto flex items-center justify-between">
              <div class="flex items-center gap-1">
                ${formatButtonsHtml}
              </div>
              <span class="text-xs text-neutral-400 line-clamp-1">${book.publisher || ''}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

function changeCardFormat(isbn, newFormat) {
  selectedBookFormats[isbn] = newFormat;
  applyClientFilters();
}

function setFormatFilter(format, btn) {
  currentFilters.format = format;
  document.querySelectorAll(".format-btn").forEach((b) => {
    b.className = "format-btn border border-neutral-400 px-3 py-1.5 text-neutral-600 hover:border-black hover:text-black transition-colors";
  });
  btn.className = "format-btn border border-black px-3 py-1.5 bg-black text-white transition-colors";

  if (format !== "all") {
    rawBooks.forEach((book) => {
      const isbn = (book.isbn || "").trim().split(" ")[0] || "";
      selectedBookFormats[isbn] = format;
    });
  }
  applyClientFilters();
}

// 듀얼 슬라이더 & 직접 입력 연동 핸들러
function handleMinChange(val) {
  let minVal = parseInt(val, 10);
  if (minVal > currentFilters.maxPrice) {
    minVal = currentFilters.maxPrice;
    document.getElementById("range-min").value = minVal;
  }
  currentFilters.minPrice = minVal;
  updatePriceUI(true);
  applyClientFilters();
}

function handleMaxChange(val) {
  let maxVal = parseInt(val, 10);
  if (maxVal < currentFilters.minPrice) {
    maxVal = currentFilters.minPrice;
    document.getElementById("range-max").value = maxVal;
  }
  currentFilters.maxPrice = maxVal;
  updatePriceUI(true);
  applyClientFilters();
}

function handleMinInputBlur(val) {
  let minVal = parseInt(val, 10);
  if (isNaN(minVal) || minVal < 0) minVal = 0;
  if (minVal > currentFilters.maxPrice) minVal = currentFilters.maxPrice;
  if (minVal > SLIDER_MAX) minVal = SLIDER_MAX;

  currentFilters.minPrice = minVal;
  document.getElementById("range-min").value = minVal;
  document.getElementById("input-min-price").value = minVal;
  updatePriceUI(false);
  applyClientFilters();
}

function handleMaxInputBlur(val) {
  let maxVal = parseInt(val, 10);
  if (isNaN(maxVal) || maxVal < currentFilters.minPrice) maxVal = currentFilters.minPrice;
  if (maxVal > SLIDER_MAX) maxVal = SLIDER_MAX;

  currentFilters.maxPrice = maxVal;
  document.getElementById("range-max").value = maxVal;
  document.getElementById("input-max-price").value = maxVal;
  updatePriceUI(false);
  applyClientFilters();
}

function updatePriceUI(syncInputs = true) {
  const minPercent = (currentFilters.minPrice / SLIDER_MAX) * 100;
  const maxPercent = (currentFilters.maxPrice / SLIDER_MAX) * 100;

  const highlight = document.getElementById("slider-track-highlight");
  if (highlight) {
    highlight.style.left = `${minPercent}%`;
    highlight.style.right = `${100 - maxPercent}%`;
  }

  const label = document.getElementById("price-range-label");
  if (label) {
    label.textContent = `₩${currentFilters.minPrice.toLocaleString()} ~ ₩${currentFilters.maxPrice.toLocaleString()}`;
  }

  if (syncInputs) {
    const inputMin = document.getElementById("input-min-price");
    const inputMax = document.getElementById("input-max-price");
    if (inputMin) inputMin.value = currentFilters.minPrice;
    if (inputMax) inputMax.value = currentFilters.maxPrice;
  }
}

function renderPagination(total, page) {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  const totalPages = Math.min(Math.ceil(total / pageSize) || 1, 50);
  let html = `
    <button type="button" onclick="goToPage(${page - 1})" ${page === 1 ? "disabled" : ""} class="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none">
      <span class="material-symbols-outlined text-sm">chevron_left</span>
    </button>`;

  const startPage = Math.floor((page - 1) / 5) * 5 + 1;
  const endPage = Math.min(startPage + 4, totalPages);

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html += `<button type="button" class="w-9 h-9 border border-black flex items-center justify-center bg-black text-white text-xs font-semibold select-none">${i}</button>`;
    } else {
      html += `<button type="button" onclick="goToPage(${i})" class="w-9 h-9 border border-neutral-300 flex items-center justify-center hover:border-black hover:bg-neutral-100 transition-colors text-xs font-semibold">${i}</button>`;
    }
  }

  if (endPage < totalPages) {
    html += `<span class="text-sm px-1">...</span>`;
    html += `<button type="button" onclick="goToPage(${totalPages})" class="w-9 h-9 border border-neutral-300 flex items-center justify-center hover:border-black hover:bg-neutral-100 transition-colors text-xs font-semibold">${totalPages}</button>`;
  }

  html += `
    <button type="button" onclick="goToPage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none">
      <span class="material-symbols-outlined text-sm">chevron_right</span>
    </button>`;

  container.innerHTML = html;
}

function goToPage(pageNum) {
  if (pageNum < 1) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  fetchBooksFromAPI(currentFilters.search || "문학", currentFilters.sort, pageNum);
}

function executeSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (q) fetchBooksFromAPI(q, currentFilters.sort, 1);
}

function handleSortChange(sortVal) {
  currentFilters.sort = sortVal;
  if (sortVal === "recency" || sortVal === "accuracy") {
    fetchBooksFromAPI(currentFilters.search || "문학", sortVal, 1);
  } else {
    applyClientFilters();
  }
}

function resetFilters() {
  document.querySelectorAll(".main-category-cb").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".category-checkbox").forEach((cb) => (cb.checked = false));

  currentFilters.minPrice = 0;
  currentFilters.maxPrice = 50000;
  document.getElementById("range-min").value = 0;
  document.getElementById("range-max").value = 50000;
  document.getElementById("input-min-price").value = 0;
  document.getElementById("input-max-price").value = 50000;
  updatePriceUI(true);

  document.getElementById("sort-select").value = "accuracy";
  const mobileSort = document.getElementById("sort-select-mobile");
  if (mobileSort) mobileSort.value = "accuracy";
  document.getElementById("search-input").value = "";

  document.querySelectorAll(".format-btn").forEach((b, idx) => {
    b.className =
      idx === 0
        ? "format-btn border border-black px-3 py-1.5 bg-black text-white transition-colors"
        : "format-btn border border-neutral-400 px-3 py-1.5 text-neutral-600 hover:border-black hover:text-black transition-colors";
  });

  currentFilters = { categories: [], format: "all", minPrice: 0, maxPrice: 50000, sort: "accuracy", search: "문학" };
  selectedBookFormats = {};
  fetchBooksFromAPI("문학", "accuracy", 1);
}

function openQuickView(isbn) {
  const book = rawBooks.find((b) => (b.isbn || "").includes(isbn));
  if (!book) return;
  const primaryIsbn = (book.isbn || "").trim().split(" ")[0] || "";
  const displayFormat = selectedBookFormats[primaryIsbn] || getBookFormats(book)[0];
  const price = getBookPriceByFormat(book, displayFormat);
  const safeTitle = (book.title || "").replace(/'/g, "\\'");

  document.getElementById("qv-title").textContent = book.title || '';
  document.getElementById("qv-author").textContent = `저자: ${(book.authors || []).join(", ") || '저자 미상'} | 출판사: ${book.publisher || ''}`;
  document.getElementById("qv-price").textContent = `₩${price.toLocaleString()}`;
  document.getElementById("qv-publisher").textContent = displayFormat;
  document.getElementById("qv-description").textContent = book.contents || "상세 설명이 없습니다.";
  document.getElementById("qv-image").src = book.thumbnail;
  document.getElementById("qv-detail-link").href = `shop_page.html?isbn=${primaryIsbn}&title=${encodeURIComponent(book.title || '')}`;

  document.getElementById("qv-add-btn").onclick = () => {
    addToCart(safeTitle, price, displayFormat, book.thumbnail, primaryIsbn);
    closeQuickView();
  };

  document.getElementById("quickview-modal").classList.remove("hidden");
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeQuickView() {
  document.getElementById("quickview-modal").classList.add("hidden");
  document.getElementById("modal-overlay").classList.add("hidden");
}

function closeAllModals() {
  closeCart();
  closeQuickView();
}

function openFilter() {
  document.getElementById("filter-sidebar").classList.remove("-translate-x-full");
  document.getElementById("filter-overlay").classList.remove("hidden");
}

function closeFilter() {
  document.getElementById("filter-sidebar").classList.add("-translate-x-full");
  document.getElementById("filter-overlay").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("search") || "문학";
  if (urlParams.get("search")) {
    document.getElementById("search-input").value = queryParam;
  }
  updatePriceUI(true);
  fetchBooksFromAPI(queryParam, "accuracy", 1);
  renderCart();
});