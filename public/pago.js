
(() => {
  const target = document.getElementById("payment-status");
  if (!target) return;

  const token = new URLSearchParams(location.search).get("token") || "";
  let attempts = 0;
  let timer;

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
        "Guarda tus códigos y cópialos para utilizarlos."
      ));

      for (const item of data.deliveredItems) {
        const card = el("section", "delivered-item");
        card.append(el(
          "h3",
          "delivered-title",
          item.name || item.productId || "Producto digital"
        ));

        for (const value of (Array.isArray(item.codes) ? item.codes : [])) {
          const code = String(value);
          const row = el("div", "delivery-code-row");
          row.append(el("code", "delivery-code", code));

          const button = el("button", "button secondary copy-code", "Copiar");
          button.type = "button";
          button.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(code);
              button.textContent = "Copiado ✓";
            } catch {
              button.textContent = "Selecciona el código";
            }
          });

          row.append(button);
          card.append(row);
        }

        wrap.append(card);
      }

      localStorage.removeItem("elgato_cart_v2");
    } else if (data.status === "paid" &&
               data.deliveryStatus === "manual_required") {
      wrap.append(el("h2", "payment-title", "Pago confirmado; entrega pendiente"));
      wrap.append(el(
        "p",
        "payment-copy",
        "El pago está confirmado, pero no hay suficiente inventario disponible. " +
        "No pagues otra vez; contacta con soporte para completar la entrega."
      ));
    } else if (data.status === "paid") {
      wrap.append(el("h2", "payment-title", "Pago confirmado"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Estamos preparando la entrega. Esta página volverá a consultar el estado."
      ));
    } else if (
      ["invoice_error", "expired", "failed", "cancelled"].includes(data.status)
    ) {
      wrap.append(el("h2", "payment-title", "No se confirmó el pago"));
      wrap.append(el(
        "p",
        "payment-copy",
        "No se ha confirmado un pago completado. Puedes volver al carrito."
      ));
    } else {
      wrap.append(el("h2", "payment-title", "Esperando confirmación"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Todavía no se ha confirmado el pago. No repitas el pago de la misma factura."
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
      `Referencia: ${token.slice(0, 12).toUpperCase()}`
    ));
    wrap.append(meta);

    const actions = el("div", "payment-actions");
    actions.append(link("Volver a la tienda ↗", "/tienda.html", "button primary"));
    actions.append(link("Contactar soporte", "/soporte.html"));
    wrap.append(actions);

    target.append(wrap);
  }

  async function check() {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      target.textContent = "El enlace de tu pedido no es válido.";
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar el pedido.");
      }

      render(data);

      const done =
        (data.status === "paid" && data.deliveryStatus === "delivered") ||
        data.deliveryStatus === "manual_required" ||
        ["invoice_error", "expired", "failed", "cancelled"].includes(data.status);

      if (!done && attempts < 120) {
        timer = setTimeout(check, 4000);
      }
    } catch (error) {
      target.textContent = error.message || "Error consultando el pedido.";

      if (attempts < 10) {
        timer = setTimeout(check, 4000);
      }
    }
  }

  window.addEventListener("pagehide", () => clearTimeout(timer), { once: true });
  check();
})();
