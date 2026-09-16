const KAKAO_REST_API_KEY = "c612fa579b6e426f3547a0ab5a8ebe99";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("the_archive_cart")) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("the_archive_cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById("cart-items-container");
  const totalElement = document.getElementById("cart-total-price");
  const badgeElement = document.getElementById("cart-badge");

  if (!container) return;
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="h-48 flex flex-col items-center justify-center text-neutral-400">
        <span class="material-symbols-outlined text-4xl mb-2">shopping_bag</span>
        <p class="text-xs">장바구니가 비어 있습니다.</p>
      </div>`;
    if (totalElement) totalElement.textContent = "₩0";
    if (badgeElement) badgeElement.classList.add("hidden");
    return;
  }

  let total = 0;
  let totalQty = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;
    totalQty += item.quantity;

    const itemEl = document.createElement("div");
    itemEl.className = "flex gap-4 border-b border-neutral-200 pb-4";
    itemEl.innerHTML = `
      <div class="w-16 h-24 border border-black shrink-0 bg-white overflow-hidden">
        <img src="${item.image || 'https://via.placeholder.com/150x225?text=No+Cover'}" alt="${item.title}" class="w-full h-full object-cover" />
      </div>
      <div class="flex flex-col flex-grow">
        <div class="flex justify-between items-start">
          <a href="shop_page.html?isbn=${item.isbn || ''}&title=${encodeURIComponent(item.title)}" class="hover:underline">
            <h4 class="font-serif text-sm font-bold line-clamp-1">${item.title}</h4>
          </a>
          <span class="text-xs font-bold">₩${(item.price * item.quantity).toLocaleString()}</span>
        </div>
        <p class="text-xs text-neutral-500 mb-2">${item.format}</p>
        <div class="mt-auto flex justify-between items-center">
          <div class="flex items-center border border-black">
            <button type="button" onclick="updateQty(${index}, -1)" class="px-2 py-0.5 text-xs hover:bg-neutral-100">-</button>
            <span class="px-2 text-xs font-semibold">${item.quantity}</span>
            <button type="button" onclick="updateQty(${index}, 1)" class="px-2 py-0.5 text-xs hover:bg-neutral-100">+</button>
          </div>
          <button onclick="removeFromCart(${index})" class="text-[11px] text-neutral-500 hover:text-black underline">삭제</button>
        </div>
      </div>`;
    container.appendChild(itemEl);
  });

  if (totalElement) totalElement.textContent = `₩${total.toLocaleString()}`;
  if (badgeElement) {
    badgeElement.textContent = totalQty;
    badgeElement.classList.remove("hidden");
  }
}

function addToCart(title, price, format, image, isbn) {
  const cart = getCart();
  const existing = cart.find((i) => i.isbn === isbn && i.format === format);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      title: title,
      price: price,
      format: format,
      image: image,
      isbn: isbn,
      quantity: 1,
    });
  }

  saveCart(cart);
  showToast(title);
}

function updateQty(index, delta) {
  const cart = getCart();
  if (cart[index]) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
  }
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function openCart() {
  renderCart();
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("modal-overlay") || document.getElementById("cart-overlay");
  if (drawer) drawer.classList.remove("translate-x-full");
  if (overlay) overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("modal-overlay") || document.getElementById("cart-overlay");
  if (drawer) drawer.classList.add("translate-x-full");
  if (overlay) overlay.classList.add("hidden");
  document.body.style.overflow = "";
}

let toastTimeout;
function showToast(title) {
  const toast = document.getElementById("toast");
  const toastTitle = document.getElementById("toast-title");
  if (!toast || !toastTitle) return;

  toastTitle.textContent = title;
  toast.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
  toast.classList.add("translate-y-0", "opacity-100", "pointer-events-auto");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, 3500);
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("translate-y-0", "opacity-100", "pointer-events-auto");
  toast.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
}

function proceedToCheckoutFromCart() {
  const cart = getCart();
  if (cart.length === 0) return;
  closeCart();
  if (document.getElementById("checkoutModal") && typeof openCheckout === "function") {
    openCheckout();
  } else {
    window.location.href = "shop_page.html?checkout=true";
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "the_archive_cart") {
    renderCart();
  }
});