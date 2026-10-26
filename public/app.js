
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const page = document.body.dataset.page || "home";
const CART_KEY = "elgato_cart_v2";

let allProducts = [];

const icon = (name, extraClass = "") =>
  `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const symbols = `
<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <symbol id="i-cat" viewBox="0 0 24 24"><path d="M5 10 4 3l6 4h4l6-4-1 7a8 8 0 1 1-14 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12h.01M15 12h.01M10 16q2 2 4 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.2 11h10.9L21 8H6M9 19h.01M17 19h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="m12 3 8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-headset" viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12h3v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2Zm16 0h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2ZM17 19q-1 2-5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>`;

document.body.insertAdjacentHTML("afterbegin", symbols);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function money(value, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item =>
      typeof item.id === "string" &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 10
    );
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  $$(".cart-count").forEach(element => {
    element.textContent = String(count);
  });
}

let toastTimer;

function showToast(message) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2500);
}

function addToCart(productId) {
  const product = allProducts.find(item => item.id === productId);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    if (existing.quantity >= 10) {
      showToast("El límite es de 10 unidades por producto.");
      return;
    }
    existing.quantity++;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart(cart);
  showToast(`${product.name} se añadió al carrito.`);
}

function renderHeader() {
  const target = $("#site-header");
  if (!target) return;

  const links = [
    ["/", "Inicio", "home"],
    ["/tienda.html", "Tienda", "shop"],
    ["/como-funciona.html", "Cómo funciona", "how"],
    ["/soporte.html", "Soporte", "support"]
  ];

  target.innerHTML = `
    <header class="navbar">
      <a href="/" class="brand" aria-label="elgato.lol, inicio">
        <span class="brand-mark">${icon("cat")}</span>
        <span>
          <span class="brand-name">elgato.lol</span>
          <span class="brand-sub">Servicios digitales</span>
        </span>
      </a>

      <nav class="nav-links" aria-label="Navegación principal">
        ${links.map(([url, label, key]) =>
          `<a href="${url}" class="${page === key ? "active" : ""}">${label}</a>`
        ).join("")}
      </nav>

      <a class="header-cart" href="/carrito.html">
        ${icon("cart")} Carrito (<span class="cart-count">0</span>)
      </a>
    </header>`;
}

function renderFooter() {
  const target = $("#site-footer");
  if (!target) return;

  target.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <a href="/" class="brand">
          <span class="brand-mark">${icon("cat")}</span>
          <span>
            <span class="brand-name">elgato.lol</span>
            <span class="brand-sub">Más que una tienda, un universo.</span>
          </span>
        </a>

        <nav class="footer-links" aria-label="Enlaces del pie de página">
          <a href="/">Inicio</a>
          <a href="/tienda.html">Tienda</a>
          <a href="/como-funciona.html">Cómo funciona</a>
          <a href="/soporte.html">Soporte</a>
        </nav>

        <div class="footer-copy">
          © ${new Date().getFullYear()} elgato.lol<br>
          Hecho con <strong>cuidado por SrCat</strong>
        </div>
      </div>
    </footer>`;
}

function productCard(product) {
  return `
    <article class="product-card">
      <a href="/producto.html?id=${encodeURIComponent(product.id)}" aria-label="Ver ${escapeHtml(product.name)}">
        <div class="product-image-wrap">
          ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
          <img
            class="product-image"
            src="${escapeHtml(product.image)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
            onerror="this.style.display='none';this.parentElement.classList.add('image-missing')"
          >
        </div>
      </a>

      <div class="product-content">
        <div class="product-category">${escapeHtml(product.category)}</div>
        <h3><a href="/producto.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="product-description">${escapeHtml(product.short)}</p>
        <div class="product-price">${money(product.price, product.currency)} <small>MXN</small></div>

        <button
          class="button primary"
          type="button"
          data-add="${escapeHtml(product.id)}"
          aria-label="Añadir ${escapeHtml(product.name)} al carrito"
        >
          ${icon("cart")} Añadir
        </button>
      </div>
    </article>`;
}

function bindAddButtons(root = document) {
  $$("[data-add]", root).forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
}

function renderFeatured() {
  const target = $("#featured-products");
  if (!target) return;

  target.innerHTML = allProducts.slice(0, 4).map(productCard).join("");
  bindAddButtons(target);
}

function renderShop() {
  const target = $("#shop-products");
  if (!target) return;

  const search = $("#product-search");
  const category = $("#category-filter");
  const sort = $("#sort-products");
  const count = $("#catalog-count");

  function update() {
    const term = (search?.value || "").trim().toLowerCase();
    const selectedCategory = category?.value || "all";

    let filtered = allProducts.filter(product => {
      const matchesText = [
        product.name,
        product.category,
        product.short,
        product.description
      ].join(" ").toLowerCase().includes(term);

      return matchesText &&
        (selectedCategory === "all" || product.category === selectedCategory);
    });

    switch (sort?.value) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    target.innerHTML = filtered.length
      ? filtered.map(productCard).join("")
      : `<div class="empty-state">No encontramos productos con esos filtros.</div>`;

    if (count) {
      count.textContent = `${filtered.length} producto(s) en el catálogo.`;
    }

    bindAddButtons(target);
  }

  [search, category, sort].forEach(control => {
    control?.addEventListener("input", update);
    control?.addEventListener("change", update);
  });

  update();
}

function renderProductDetail() {
  const target = $("#product-detail");
  if (!target) return;

  const id = new URLSearchParams(location.search).get("id");
  const product = allProducts.find(item => item.id === id);

  if (!product) {
    target.innerHTML = `
      <div class="empty-state">
        <h2>Producto no encontrado</h2>
        <p>Puede que el enlace no sea válido o que el producto ya no esté en el catálogo.</p>
        <a class="button primary" href="/tienda.html">Volver a la tienda</a>
      </div>`;
    return;
  }

  document.title = `${product.name} — elgato.lol`;
  $("#breadcrumb-name").textContent = product.name;

  target.innerHTML = `
    <div class="detail-image">
      <img
        src="${escapeHtml(product.image)}"
        alt="${escapeHtml(product.name)}"
        onerror="this.style.display='none'"
      >
    </div>

    <div class="detail-copy">
      <span class="eyebrow">${escapeHtml(product.category)}</span>
      <h1>${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.description)}</p>

      <div class="detail-price">${money(product.price, product.currency)} <small>MXN</small></div>

      <ul class="feature-list">
        ${product.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}
      </ul>

      <div class="notice panel">
        Producto de catálogo de demostración. Comprueba disponibilidad y condiciones antes de publicar una oferta real.
      </div>

      <div class="detail-actions">
        <button class="button primary" type="button" data-add="${escapeHtml(product.id)}">
          ${icon("cart")} Añadir al carrito
        </button>
        <a class="button secondary" href="/tienda.html">Seguir explorando</a>
      </div>
    </div>`;

  bindAddButtons(target);
}

function renderCart() {
  const target = $("#cart-items");
  if (!target) return;

  function update() {
    const currentCart = getCart();

    const items = currentCart.map(item => ({
      ...item,
      product: allProducts.find(product => product.id === item.id)
    })).filter(item => item.product);

    const total = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    target.innerHTML = items.length ? items.map(item => `
      <article class="cart-row">
        <img
          src="${escapeHtml(item.product.image)}"
          alt="${escapeHtml(item.product.name)}"
          onerror="this.style.display='none'"
        >

        <div>
          <h3>
            <a href="/producto.html?id=${encodeURIComponent(item.id)}">
              ${escapeHtml(item.product.name)}
            </a>
          </h3>
          <p>${money(item.product.price)} MXN por unidad</p>

          <div class="quantity-control">
            <button type="button" data-quantity="${escapeHtml(item.id)}" data-change="-1" aria-label="Restar una unidad">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${escapeHtml(item.id)}" data-change="1" aria-label="Añadir una unidad">+</button>
            <button type="button" class="remove-button" data-remove="${escapeHtml(item.id)}">Quitar</button>
          </div>
        </div>

        <div class="cart-line-total">
          ${money(item.product.price * item.quantity)}<br><small>MXN</small>
        </div>
      </article>`).join("")
      : `<div class="empty-state">
          <h2>Tu carrito está vacío</h2>
          <p>Explora la tienda para añadir productos.</p>
          <a class="button primary" href="/tienda.html">Ir a la tienda</a>
        </div>`;

    $("#cart-subtotal").textContent = `${money(total)} MXN`;
    $("#cart-total").textContent = `${money(total)} MXN`;

    $$("[data-quantity]", target).forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.quantity;
        const change = Number(button.dataset.change);

        const next = getCart().map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        ).filter(item => item.quantity > 0 && item.quantity <= 10);

        saveCart(next);
        update();
      });
    });

    $$("[data-remove]", target).forEach(button => {
      button.addEventListener("click", () => {
        saveCart(getCart().filter(item => item.id !== button.dataset.remove));
        update();
      });
    });
  }

  update();

  const form = $("#checkout-form");

  form?.addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("#checkout-email").value.trim();
    const result = $("#checkout-result");
    const button = $('button[type="submit"]', form);
    const currentCart = getCart();

    if (!currentCart.length) {
      result.textContent = "Añade al menos un producto antes de crear el pedido.";
      return;
    }

    button.disabled = true;
    button.textContent = "Creando pedido...";
    result.textContent = "";

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, items: currentCart })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el pedido.");
      }

      result.textContent =
        `Pedido de prueba: ${data.orderId}. Total estimado: ${money(data.total)} MXN. ` +
        "No se ha realizado ningún cobro.";
    } catch (error) {
      result.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
      button.disabled = false;
      button.textContent = "Crear pedido de prueba →";
    }
  });
}

function setupSupportForm() {
  const form = $("#support-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#support-name").value.trim();
    const email = $("#support-email").value.trim();
    const topic = $("#support-topic").value;
    const message = $("#support-message").value.trim();

    $("#support-result").textContent =
      `Mensaje preparado para ${name} (${email}). Motivo: ${topic}. ` +
      `Contenido: ${message}. Este formulario todavía no envía mensajes a un servidor.`;
  });
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Error cargando productos");
    }

    const data = await response.json();
    allProducts = Array.isArray(data.products) ? data.products : [];
  } catch {
    allProducts = [];

    const grid = $("#featured-products, #shop-products");

    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          No se pudo cargar el catálogo. Comprueba que estás ejecutando la web con Vercel.
        </div>`;
    }

    return;
  }

  if (page === "home") renderFeatured();
  if (page === "shop") renderShop();
  if (page === "product") renderProductDetail();
  if (page === "cart") renderCart();
}

renderHeader();
renderFooter();
updateCartCount();
setupSupportForm();
loadProducts();
