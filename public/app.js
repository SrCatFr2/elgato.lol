
const productGrid = document.querySelector("#products");
const dialog = document.querySelector("#order-dialog");
const orderForm = document.querySelector("#order-form");
const toast = document.querySelector("#toast");

let selectedProduct = null;
let orderCount = 0;

document.querySelector("#year").textContent =
  new Date().getFullYear();

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

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function renderProducts(products) {
  productGrid.innerHTML = products.map(product => `
    <article class="product-card">
      ${product.badge
        ? `<span class="product-badge">${escapeHtml(product.badge)}</span>`
        : '<div style="height:24px"></div>'}

      <div class="product-icon ${escapeHtml(product.color || "")}">
        ${escapeHtml(product.icon || "✦")}
      </div>

      <div class="product-category">
        ${escapeHtml(product.category)}
      </div>

      <h3>${escapeHtml(product.name)}</h3>

      <p class="product-description">
        ${escapeHtml(product.description)}
      </p>

      <div class="product-price">
        <small>desde </small>${money(product.price, product.currency)}
      </div>

      <button class="buy-button"
        data-product="${escapeHtml(product.id)}">
        ♧ Comprar
      </button>
    </article>
  `).join("");

  productGrid.querySelectorAll("[data-product]").forEach(button => {
    button.addEventListener("click", () => {
      const product = products.find(
        item => item.id === button.dataset.product
      );

      if (product) openOrder(product);
    });
  });
}

function openOrder(product) {
  selectedProduct = product;

  document.querySelector("#dialog-product").textContent =
    product.name;

  document.querySelector("#order-result").textContent = "";

  orderForm.reset();
  dialog.showModal();
}

document.querySelector("#cart-button").addEventListener("click", () => {
  notify("Selecciona un producto para iniciar tu pedido.");
});

orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!selectedProduct) return;

  const submitButton =
    orderForm.querySelector('button[type="submit"]');

  const result = document.querySelector("#order-result");
  const email = document.querySelector("#email").value.trim();

  submitButton.disabled = true;
  submitButton.textContent = "Procesando...";
  result.textContent = "";

  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: selectedProduct.id,
        email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo crear el pedido.");
    }

    orderCount++;

    document.querySelector("#cart-count").textContent =
      String(orderCount);

    result.textContent =
      `Pedido de prueba: ${data.orderId}. ` +
      `Total: ${money(data.amount, data.currency)}. ` +
      "No se ha realizado ningún cobro.";

  } catch (error) {
    result.textContent =
      error.message || "Ocurrió un error inesperado.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "Crear pedido <span>→</span>";
  }
});

fetch("/api/products")
  .then(response => {
    if (!response.ok) {
      throw new Error("Error cargando productos");
    }

    return response.json();
  })
  .then(data => renderProducts(data.products || []))
  .catch(() => {
    productGrid.innerHTML =
      '<div class="loading">No se pudo cargar la tienda. Recarga la página.</div>';
  });
