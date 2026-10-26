
"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const CART_KEY = "elgato_cart_v2";
const page = document.body?.dataset?.page || "home";

let allProducts = [];
let catalogLoaded = false;
let catalogError = null;
let toastTimer = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function money(value, currency = "MXN") {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: /^[A-Z]{3}$/.test(currency || "")
        ? currency
        : "MXN",
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch {
    return `$${safeAmount.toFixed(2)} MXN`;
  }
}

function normalizeProduct(product) {
  const item = product && typeof product === "object" ? product : {};

  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? "Producto digital"),
    category: String(item.category ?? "Digital"),
    price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
    currency: String(item.currency ?? "MXN"),
    image: typeof item.image === "string" ? item.image : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    short: String(item.short ?? item.description ?? ""),
    description: String(item.description ?? item.short ?? "Producto digital."),
    features: Array.isArray(item.features)
      ? item.features.filter(feature => typeof feature === "string")
      : []
  };
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) return [];

    const clean = [];
    const seen = new Set();

    for (const item of parsed) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10 ||
        seen.has(item.id)
      ) {
        continue;
      }

      seen.add(item.id);
      clean.push({ id: item.id, quantity: item.quantity });
    }

    return clean;
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    showToast("No se pudo guardar el carrito en este navegador.");
  }

  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);

  // Compatible con el header de la página de inicio y el header global.
  $$("#cart-count, .cart-count").forEach(element => {
    element.textContent = String(count);
  });
}

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
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function addToCart(productId) {
  const product = allProducts.find(item => item.id === productId);

  if (!product) {
    showToast("No encontramos ese producto en el catálogo.");
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    if (existing.quantity >= 10) {
      showToast("El límite es de 10 unidades por producto.");
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart(cart);
  showToast(`${product.name} se añadió al carrito.`);
}

function bindAddButtons(root = document) {
  $$("[data-add]", root).forEach(button => {
    if (button.dataset.addBound === "true") return;

    button.dataset.addBound = "true";
    button.addEventListener("click", () => {
      addToCart(button.dataset.add);
    });
  });
}

/* Header: solo se genera cuando la página incluye #site-header. */
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
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span>
          <span class="brand-name">elgato.lol</span>
          <span class="brand-sub">Servicios digitales</span>
        </span>
      </a>

      <nav class="nav-links" aria-label="Navegación principal">
        ${links.map(([url, label, key]) => `
          <a href="${url}" class="${page === key ? "active" : ""}">
            ${label}
          </a>
        `).join("")}
      </nav>

      <a class="header-cart" href="/carrito.html">
        Carrito (<span class="cart-count">0</span>)
      </a>
    </header>
  `;

  updateCartCount();
}

function renderFooter() {
  const target = $("#site-footer");
  if (!target) return;

  target.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <a href="/" class="brand">
          <span class="brand-mark" aria-hidden="true">✦</span>
          <span>
            <span class="brand-name">elgato.lol</span>
            <span class="brand-sub">Tu espacio digital</span>
          </span>
        </a>

        <nav class="footer-links" aria-label="Enlaces del pie de página">
          <a href="/">Inicio</a>
          <a href="/tienda.html">Tienda</a>
          <a href="/como-funciona.html">Cómo funciona</a>
          <a href="/soporte.html">Soporte</a>
        </nav>

        <div class="footer-copy">
          © ${new Date().getFullYear()} elgato.lol
        </div>
      </div>
    </footer>
  `;
}

function renderEmptyState(title, message) {
  return `
    <div class="empty-state">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderProductCard(product) {
  const id = encodeURIComponent(product.id);
  const name = escapeHtml(product.name);
  const image = escapeHtml(product.image);

  return `
    <article class="product-card">
      <a href="/producto.html?id=${id}" aria-label="Ver ${name}">
        <div class="product-image-wrap ${image ? "" : "image-missing"}">
          ${product.badge
            ? `<span class="product-badge">${escapeHtml(product.badge)}</span>`
            : ""}

          ${image
            ? `<img class="product-image"
                src="${image}"
                alt="${name}"
                loading="lazy"
                onerror="this.style.display='none';this.parentElement.classList.add('image-missing')">`
            : ""}
        </div>
      </a>

      <div class="product-content">
        <div class="product-category">${escapeHtml(product.category)}</div>
        <h3><a href="/producto.html?id=${id}">${name}</a></h3>
        <p class="product-description">${escapeHtml(product.short)}</p>

        <div class="product-price">
          ${money(product.price, product.currency)}
          <small>${escapeHtml(product.currency)}</small>
        </div>

        <button
          class="button primary"
          type="button"
          data-add="${escapeHtml(product.id)}"
          aria-label="Añadir ${name} al carrito"
        >
          Añadir al carrito <span aria-hidden="true">＋</span>
        </button>
      </div>
    </article>
  `;
}

function renderProductCards(target, products) {
  if (!target) return;

  if (catalogError) {
    target.innerHTML = renderEmptyState(
      "No se pudo cargar el catálogo",
      "Recarga la página. Si el problema continúa, revisa /api/products en tu navegador."
    );
    return;
  }

  if (!products.length) {
    target.innerHTML = renderEmptyState(
      "No hay productos disponibles",
      "Vuelve a intentarlo más tarde."
    );
    return;
  }

  target.innerHTML = products.map(renderProductCard).join("");
  bindAddButtons(target);
}

function renderFeatured() {
  const targets = [
    $("#featured-products"),
    $("#products")
  ].filter(Boolean);

  // Evita renderizar dos veces sobre el mismo elemento.
  [...new Set(targets)].forEach(target => {
    renderProductCards(target, allProducts.slice(0, 4));
  });
}

function renderShop() {
  const target = $("#shop-products");
  if (!target) return;

  const search = $("#product-search");
  const category = $("#category-filter");
  const sort = $("#sort-products");
  const count = $("#catalog-count");

  function update() {
    const term = String(search?.value || "").trim().toLowerCase();
    const selectedCategory = category?.value || "all";

    let filtered = allProducts.filter(product => {
      const searchable = [
        product.name,
        product.category,
        product.short,
        product.description
      ].join(" ").toLowerCase();

      const matchesTerm = searchable.includes(term);
      const matchesCategory =
        selectedCategory === "all" ||
        product.category === selectedCategory;

      return matchesTerm && matchesCategory;
    });

    switch (sort?.value) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
    }

    renderProductCards(target, filtered);

    if (count) {
      count.textContent = `${filtered.length} producto(s) en el catálogo.`;
    }
  }

  [search, category, sort].forEach(control => {
    if (!control) return;
    control.addEventListener("input", update);
    control.addEventListener("change", update);
  });

  update();
}

function renderProductDetail() {
  const target = $("#product-detail");
  if (!target) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const product = allProducts.find(item => item.id === id);

  if (!product) {
    target.innerHTML = renderEmptyState(
      "Producto no encontrado",
      "El enlace puede ser incorrecto o el producto ya no está disponible."
    ) + `<p><a class="button primary" href="/tienda.html">Volver a la tienda</a></p>`;
    return;
  }

  document.title = `${product.name} — elgato.lol`;

  const breadcrumb = $("#breadcrumb-name");
  if (breadcrumb) breadcrumb.textContent = product.name;

  // features puede faltar en productos del catálogo; nunca llamar .map()
  // sobre un valor que no sea un array.
  const features = Array.isArray(product.features)
    ? product.features.filter(feature => typeof feature === "string")
    : [];

  const featureHtml = features.length
    ? `<ul class="feature-list">
        ${features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}
       </ul>`
    : "";

  const imageHtml = product.image
    ? `<img src="${escapeHtml(product.image)}"
        alt="${escapeHtml(product.name)}"
        loading="eager"
        onerror="this.style.display='none'">`
    : "";

  target.innerHTML = `
    <div class="detail-image">
      ${imageHtml}
    </div>

    <div class="detail-copy">
      <span class="eyebrow">${escapeHtml(product.category)}</span>
      <h1>${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.description || product.short)}</p>

      <div class="detail-price">
        ${money(product.price, product.currency)}
        <small>${escapeHtml(product.currency)}</small>
      </div>

      ${featureHtml}

      <div class="notice panel">
        El pedido se procesa mediante el checkout seguro.
        La entrega solo se habilita cuando el proveedor confirma el pago.
      </div>

      <div class="detail-actions">
        <button class="button primary" type="button"
          data-add="${escapeHtml(product.id)}">
          Añadir al carrito
        </button>
        <a class="button secondary" href="/tienda.html">Seguir explorando</a>
      </div>
    </div>
  `;

  bindAddButtons(target);
}

function renderCart() {
  const target = $("#cart-items");
  if (!target) return;

  function update() {
    const currentCart = getCart();

    if (catalogError) {
      target.innerHTML = renderEmptyState(
        "No se pudo consultar el catálogo",
        "No se puede calcular el carrito ahora. Intenta recargar la página."
      );
      const subtotal = $("#cart-subtotal");
      const total = $("#cart-total");
      if (subtotal) subtotal.textContent = "—";
      if (total) total.textContent = "—";
      return;
    }

    const items = currentCart.map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: allProducts.find(product => product.id === item.id)
    })).filter(item => item.product);

    const total = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    if (!items.length) {
      target.innerHTML = `
        <div class="empty-state">
          <h2>Tu carrito está vacío</h2>
          <p>Explora la tienda para añadir productos.</p>
          <a class="button primary" href="/tienda.html">Ir a la tienda</a>
        </div>
      `;
    } else {
      target.innerHTML = items.map(item => `
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

            <p>${money(item.product.price, item.product.currency)} por unidad</p>

            <div class="quantity-control">
              <button type="button"
                data-quantity="${escapeHtml(item.id)}"
                data-change="-1"
                aria-label="Restar una unidad">−</button>

              <span>${item.quantity}</span>

              <button type="button"
                data-quantity="${escapeHtml(item.id)}"
                data-change="1"
                aria-label="Añadir una unidad">＋</button>

              <button type="button"
                class="remove-button"
                data-remove="${escapeHtml(item.id)}">Quitar</button>
            </div>
          </div>

          <div class="cart-line-total">
            ${money(item.product.price * item.quantity, item.product.currency)}
          </div>
        </article>
      `).join("");
    }

    const subtotal = $("#cart-subtotal");
    const totalNode = $("#cart-total");

    if (subtotal) subtotal.textContent = `${money(total)} MXN`;
    if (totalNode) totalNode.textContent = `${money(total)} MXN`;

    $$("[data-quantity]", target).forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.quantity;
        const change = Number(button.dataset.change);

        const next = getCart().map(item => {
          if (item.id !== id) return item;
          return { ...item, quantity: item.quantity + change };
        }).filter(item => item.quantity >= 1 && item.quantity <= 10);

        saveCart(next);
        update();
      });
    });

    $$("[data-remove]", target).forEach(button => {
      button.addEventListener("click", () => {
        const next = getCart().filter(item => item.id !== button.dataset.remove);
        saveCart(next);
        update();
      });
    });

    const checkoutButton = $("#checkout-form button[type='submit']");
    if (checkoutButton) {
      checkoutButton.disabled = items.length === 0;
    }
  }

  update();

  const form = $("#checkout-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const result = $("#checkout-result");
    const button = $("button[type='submit']", form);
    const currentCart = getCart();

    if (!currentCart.length) {
      if (result) result.textContent = "Añade productos antes de pagar.";
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Creando factura...";
    }
    if (result) result.textContent = "";

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: currentCart.map(item => ({
            id: item.id,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la factura.");
      }

      if (typeof data.checkoutUrl !== "string") {
        throw new Error("El servidor no devolvió un enlace de pago.");
      }

      const checkout = new URL(data.checkoutUrl);

      if (
        checkout.protocol !== "https:" ||
        !(
          checkout.hostname === "nowpayments.io" ||
          checkout.hostname.endsWith(".nowpayments.io")
        )
      ) {
        throw new Error("El enlace de pago recibido no es válido.");
      }

      // No borres el carrito aquí; se conserva si el pago se cancela.
      window.location.assign(checkout.toString());
    } catch (error) {
      if (result) {
        result.textContent = error.message || "No se pudo iniciar el pago.";
      }

      if (button) {
        button.disabled = false;
        button.textContent = "Pagar con criptomonedas →";
      }
    }
  });
}

function setupSupportForm() {
  const form = $("#support-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#support-name")?.value.trim() || "";
    const email = $("#support-email")?.value.trim() || "";
    const topic = $("#support-topic")?.value || "";
    const message = $("#support-message")?.value.trim() || "";
    const result = $("#support-result");

    if (!result) return;

    result.textContent =
      `El formulario está validado, pero todavía no envía mensajes a un servidor. ` +
      `No se ha enviado nada.`;
  });
}

function updateStaticPageDetails() {
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`El catálogo respondió HTTP ${response.status}.`);
    }

    const data = await response.json();

    if (!Array.isArray(data.products)) {
      throw new Error("La respuesta del catálogo no contiene products[].");
    }

    allProducts = data.products
      .map(normalizeProduct)
      .filter(product => product.id.length > 0);

    catalogLoaded = true;
    catalogError = null;
  } catch (error) {
    allProducts = [];
    catalogLoaded = false;
    catalogError = error.message || "Error cargando los productos.";
    console.error("Error cargando /api/products:", error);
  }

  if (page === "home") renderFeatured();
  if (page === "shop") renderShop();
  if (page === "product") renderProductDetail();
  if (page === "cart") renderCart();

  // Páginas que podrían usar una cuadrícula sin data-page específica.
  if (page !== "home" && page !== "shop" && $("#featured-products")) {
    renderFeatured();
  }

  updateCartCount();
}

renderHeader();
renderFooter();
updateCartCount();
setupSupportForm();
updateStaticPageDetails();
loadProducts();
