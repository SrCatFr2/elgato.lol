
"use strict";

(() => {
  const target = document.getElementById("payment-status");
  if (!target) return;

  const token = new URLSearchParams(location.search).get("token") || "";
  let attempts = 0;
  let timer = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(text, href, className = "button secondary") {
    const node = el("a", className, text);
    node.href = href;
    return node;
  }

  function render(data) {
    target.replaceChildren();

    const wrap = el("div", "payment-inner");

    const delivered =
      data.status === "paid" &&
      data.deliveryStatus === "delivered" &&
      Array.isArray(data.deliveredItems);

    wrap.append(el(
      "div",
      `payment-symbol ${delivered ? "payment-symbol-ok" : "payment-symbol-warn"}`,
      delivered ? "✓" : "…"
    ));

    if (delivered) {
      wrap.append(el("div", "eyebrow", "ENTREGA LISTA"));
      wrap.append(el("h2", "payment-title", "¡Tu pedido está listo!"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Guarda los valores de entrega y cópialos para utilizarlos."
      ));

      for (const item of data.deliveredItems) {
        const card = el("section", "delivered-item");

        card.append(el(
          "h3",
          "delivered-title",
          item.name || item.productId || "Producto digital"
        ));

        const values = Array.isArray(item.values) ? item.values : [];

        for (const value of values) {
          const deliveryValue = String(value);
          const row = el("div", "delivery-code-row");

          row.append(el("code", "delivery-code", deliveryValue));

          const button = el("button", "button secondary copy-code", "Copiar");
          button.type = "button";

          button.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(deliveryValue);
              button.textContent = "Copiado ✓";
            } catch {
              button.textContent = "Selecciona el texto para copiarlo";
            }
          });

          row.append(button);
          card.append(row);
        }

        wrap.append(card);
      }

      localStorage.removeItem("elgato_cart_v2");
    } else if (
      data.status === "paid" &&
      data.deliveryStatus === "manual_required"
    ) {
      wrap.append(el("h2", "payment-title", "Pago confirmado; entrega pendiente"));
      wrap.append(el(
        "p",
        "payment-copy",
        "El pago está confirmado, pero no hay suficiente inventario. " +
        "No vuelvas a pagar; contacta con soporte para completar la entrega."
      ));
    } else if (data.status === "paid") {
      wrap.append(el("h2", "payment-title", "Pago confirmado"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Estamos preparando la entrega. Esta página volverá a consultar el estado."
      ));
    } else if (
      ["invoice_error", "expired", "failed", "refunded"].includes(data.status)
    ) {
      wrap.append(el("h2", "payment-title", "El pago no se completó"));
      wrap.append(el(
        "p",
        "payment-copy",
        "No tenemos confirmado un pago completado para este pedido."
      ));
    } else {
      wrap.append(el("h2", "payment-title", "Esperando confirmación"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Aún no se ha confirmado el pago. No envíes fondos adicionales a una factura ya pagada."
      ));
    }

    const meta = el("div", "payment-order-meta");

    meta.append(el(
      "span",
      "",
      `Total: ${new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: data.currency || "MXN"
      }).format(data.total || 0)}`
    ));

    meta.append(el(
      "span",
      "",
      `Pedido: ${token.slice(0, 12).toUpperCase()}`
    ));

    wrap.append(meta);

    const actions = el("div", "payment-actions");
    actions.append(link("Volver a la tienda ↗", "/tienda.html", "button primary"));
    actions.append(link("Contactar soporte", "/soporte.html"));
    wrap.append(actions);

    target.append(wrap);
  }

  async function checkStatus() {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      target.textContent = "El enlace del pedido no es válido.";
      return;
    }

    attempts++;

    try {
      const response = await fetch(
        `/api/order-status?token=${encodeURIComponent(token)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" }
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar el pedido.");
      }

      render(data);

      const finished =
        (data.status === "paid" && data.deliveryStatus === "delivered") ||
        data.deliveryStatus === "manual_required" ||
        ["invoice_error", "expired", "failed", "refunded"].includes(data.status);

      if (!finished && attempts < 120) {
        timer = window.setTimeout(checkStatus, 4000);
      }
    } catch (error) {
      target.replaceChildren(
        el("p", "payment-copy", error.message || "Error consultando el pedido.")
      );

      if (attempts < 10) {
        timer = window.setTimeout(checkStatus, 4000);
      }
    }
  }

  window.addEventListener("pagehide", () => {
    if (timer) window.clearTimeout(timer);
  }, { once: true });

  checkStatus();
})();
