function getHighQualityThumbnail(url) {
  if (!url || typeof url !== "string") return url;
  return url.replace(/thumb\/R120x174/g, "thumb/R300x0");
}

let currentBook = null;
let currentQuantity = 1;
let selectedFormat = "종이책";

function generateRatingData(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = (4.0 + (Math.abs(hash) % 11) / 10).toFixed(1);
  const reviewCount = (Math.abs(hash) % 150) + 12;
  return { rating: parseFloat(rating), reviewCount };
}

function renderStarIcons(rating) {
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      starsHtml += `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">star</span>`;
    } else if (rating >= i - 0.5) {
      starsHtml += `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">star_half</span>`;
    } else {
      starsHtml += `<span class="material-symbols-outlined text-sm">star_border</span>`;
    }
  }
  return starsHtml;
}

function getPriceByFormat(format) {
  if (!currentBook) return 0;
  const basePrice = currentBook.sale_price > 0 ? currentBook.sale_price : (currentBook.price || 0);
  if (format === "전자책") {
    return Math.floor((basePrice * 0.7) / 100) * 100;
  }
  return basePrice;
}

function updateFormat(val) {
  selectedFormat = val;
  const priceElement = document.getElementById("detail-price");
  if (priceElement && currentBook) {
    const currentPrice = getPriceByFormat(selectedFormat);
    priceElement.textContent = `₩${currentPrice.toLocaleString()}`;
  }
}

async function loadBookDetail() {
  const params = new URLSearchParams(window.location.search);
  const isbn = params.get("isbn");
  const title = params.get("title");
  const query = isbn || title || "문학";

  if (!KAKAO_REST_API_KEY || KAKAO_REST_API_KEY === "YOUR_KAKAO_REST_API_KEY") {
    try {
      const res = await fetch("json/detail_books.json");
      const map = await res.json();
      currentBook = map[isbn] || Object.values(map)[0];
      if (currentBook) renderBookDetail(currentBook);
    } catch {
      document.getElementById("detail-title").textContent = "도서 정보를 찾을 수 없습니다.";
    }
    return;
  }

  try {
    const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=5`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    });
    const data = await res.json();
    const validDocs = (data.documents || []).filter((b) => {
      if (!b || !b.thumbnail || typeof b.thumbnail !== "string" || b.thumbnail.trim() === "") return false;
      const isNoImage = b.thumbnail.includes("no_image") || b.thumbnail.includes("kyobobook.co.kr/images/no_img") || b.thumbnail.length < 15;
      return !isNoImage;
    });

    if (validDocs.length > 0) {
      currentBook = {
        ...validDocs[0],
        thumbnail: getHighQualityThumbnail(validDocs[0].thumbnail)
      };
      renderBookDetail(currentBook);
    } else {
      document.getElementById("detail-title").textContent = "유효한 도서 정보를 찾을 수 없습니다.";
    }
  } catch (err) {
    console.error("도서 정보 로드 실패:", err);
  }
}

function renderBookDetail(book) {
  const isbn = (book.isbn || "").split(" ")[0] || "";
  const { rating, reviewCount } = generateRatingData(isbn || book.title);

  document.getElementById("detail-title").textContent = book.title;
  document.getElementById("detail-author").textContent = `저자: ${(book.authors || []).join(", ") || '저자 정보 없음'}`;
  document.getElementById("detail-publisher").textContent = book.publisher || '';

  const initialPrice = getPriceByFormat(selectedFormat);
  document.getElementById("detail-price").textContent = `₩${initialPrice.toLocaleString()}`;
  document.getElementById("detail-contents").textContent = book.contents || "상세 설명이 제공되지 않는 도서입니다.";

  const coverUrl = book.thumbnail;
  
  // 메인 커버 이미지 설정
  const mainImage = document.getElementById("detail-cover");
  if (mainImage) mainImage.src = coverUrl;

  // 1~4번 썸네일 이미지 모두에 도서 표지 적용 (필요 시 세부 앵글 컷으로 분기 가능)
  for (let i = 1; i <= 4; i++) {
    const thumbImg = document.getElementById(`thumb-${i}`);
    if (thumbImg) thumbImg.src = coverUrl;
  }

  document.getElementById("detail-star-icons").innerHTML = renderStarIcons(rating);
  document.getElementById("detail-rating-text").textContent = `${rating} (${reviewCount} 리뷰)`;

  const tabBtnReviews = document.getElementById("tab-btn-reviews");
  if (tabBtnReviews) tabBtnReviews.textContent = `리뷰 (${reviewCount})`;

  document.getElementById("tab-author-name").textContent = (book.authors || []).join(", ") || "저자 미상";
  document.getElementById("tab-spec-isbn").textContent = isbn;
  document.getElementById("tab-spec-publisher").textContent = book.publisher || '';
  document.getElementById("tab-spec-date").textContent = book.datetime ? book.datetime.substring(0, 10) : "출간일 미상";

  renderReviews(book.title, rating);
}

function renderReviews(bookTitle, rating) {
  const container = document.getElementById("reviews-container");
  if (!container) return;
  container.innerHTML = `
    <div class="border-b border-neutral-200 pb-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm">김민서</span>
          <div class="flex text-[#c56b4f]">${renderStarIcons(rating)}</div>
        </div>
        <span class="text-xs text-neutral-400">2024.11.02</span>
      </div>
      <p class="text-sm text-neutral-600 leading-relaxed">
        ${bookTitle} 도서의 깊이 있는 내용과 정교한 구성이 매우 인상 깊었습니다. 오래 곁에 두고 읽고 싶은 책입니다.
      </p>
    </div>
    <div class="border-b border-neutral-200 pb-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm">이현우</span>
          <div class="flex text-[#c56b4f]">${renderStarIcons(5.0)}</div>
        </div>
        <span class="text-xs text-neutral-400">2024.10.28</span>
      </div>
      <p class="text-sm text-neutral-600 leading-relaxed">
        빠른 배송과 꼼꼼한 포장에 감사드립니다. 장바구니에 담아두고 고민했는데 기대 이상으로 만족스럽습니다.
      </p>
    </div>`;
}

// 썸네일 클릭 시 메인 이미지 변경 및 활성 상태 테두리 전환
function changeImage(clickedButton) {
  const clickedImg = clickedButton.querySelector("img");
  const newSrc = clickedImg ? clickedImg.getAttribute("src") : "";
  const newAlt = clickedImg ? clickedImg.getAttribute("alt") : "도서 이미지";
  const mainImage = document.getElementById("detail-cover");

  if (!mainImage || !newSrc) return;

  mainImage.style.opacity = "0.3";
  setTimeout(() => {
    mainImage.setAttribute("src", newSrc);
    mainImage.setAttribute("alt", newAlt);
    mainImage.style.opacity = "1";
  }, 150);

  document.querySelectorAll(".thumbnail-item").forEach((btn) => {
    btn.classList.remove("border-2", "border-black", "opacity-100");
    btn.classList.add("border", "border-neutral-300", "opacity-60");
  });

  clickedButton.classList.remove("border-neutral-300", "opacity-60");
  clickedButton.classList.add("border-2", "border-black", "opacity-100");
}

function increaseQuantity() {
  currentQuantity++;
  document.getElementById("quantity-value").textContent = currentQuantity;
}

function decreaseQuantity() {
  if (currentQuantity > 1) {
    currentQuantity--;
    document.getElementById("quantity-value").textContent = currentQuantity;
  }
}

function switchTab(tabId, clickedTabBtn) {
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("border-black", "text-black");
    btn.classList.add("border-transparent", "text-neutral-500");
  });
  clickedTabBtn.classList.remove("border-transparent", "text-neutral-500");
  clickedTabBtn.classList.add("border-black", "text-black");
}

function handleDetailAddToCart() {
  if (!currentBook) return;
  const cart = getCart();
  const price = getPriceByFormat(selectedFormat);
  const isbn = (currentBook.isbn || "").split(" ")[0] || "";

  const existing = cart.find((i) => i.isbn === isbn && i.format === selectedFormat);
  if (existing) {
    existing.quantity += currentQuantity;
  } else {
    cart.push({
      title: currentBook.title,
      price: price,
      format: selectedFormat,
      image: currentBook.thumbnail,
      isbn: isbn,
      quantity: currentQuantity,
    });
  }
  saveCart(cart);
  showToast(currentBook.title);
}



function openCheckout() {
  goToStep(1);
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById("modal-summary-price").textContent = `₩${total.toLocaleString()}`;
  document.getElementById("modal-total-price").textContent = `₩${total.toLocaleString()}`;
  document.getElementById("checkoutModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function goToStep(stepNumber) {
  for (let i = 1; i <= 3; i++) {
    const content = document.getElementById(`step-content-${i}`);
    const tab = document.getElementById(`step-tab-${i}`);
    if (i === stepNumber) {
      content.classList.remove("hidden");
      tab.classList.remove("border-neutral-300", "text-neutral-400");
      tab.classList.add("border-black", "text-black");
    } else {
      content.classList.add("hidden");
      tab.classList.remove("border-black", "text-black");
      tab.classList.add("border-neutral-300", "text-neutral-400");
    }
  }
}

function completeOrder() {
  alert("주문이 성공적으로 완료되었습니다!");
  localStorage.removeItem("the_archive_cart");
  renderCart();
  closeCheckout();
}

document.addEventListener("DOMContentLoaded", () => {
  loadBookDetail();
  renderCart();
  if (new URLSearchParams(window.location.search).get("checkout") === "true") {
    openCheckout();
  }
});