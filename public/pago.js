
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

  function actionLink(text, url, className = "button secondary") {
    const link = el("a", className, text);
    link.href = url;
    return link;
  }

  function render(data) {
    target.replaceChildren();

    const wrap = el("div", "payment-inner");
    const paid = data.status === "paid";
    const delivered =
      paid &&
      data.deliveryStatus === "delivered" &&
      Array.isArray(data.deliveredItems);

    wrap.append(el(
      "div",
      `payment-symbol ${delivered ? "payment-symbol-ok" : "payment-symbol-warn"}`,
      delivered ? "✓" : "…"
    ));

    wrap.append(el(
      "div",
      "eyebrow",
      delivered ? "ENTREGA LISTA" : paid ? "PAGO CONFIRMADO" : "ESTADO DEL PEDIDO"
    ));

    if (delivered) {
      wrap.append(el("h2", "payment-title", "¡Tu pedido está listo!"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Guarda los códigos de abajo. También puedes copiarlos individualmente."
      ));

      for (const item of data.deliveredItems) {
        const card = el("section", "delivered-item");

        card.append(el(
          "h3",
          "delivered-title",
          item.name || item.productId || "Producto digital"
        ));

        for (const codeValue of (Array.isArray(item.codes) ? item.codes : [])) {
          const code = String(codeValue);
          const row = el("div", "delivery-code-row");
          row.append(el("code", "delivery-code", code));

          const copyButton = el("button", "button secondary copy-code", "Copiar");
          copyButton.type = "button";

          copyButton.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(code);
              copyButton.textContent = "Copiado ✓";
            } catch {
              copyButton.textContent = "Selecciona el código";
            }
          });

          row.append(copyButton);
          card.append(row);
        }

        wrap.append(card);
      }

      localStorage.removeItem("elgato_cart_v2");
    } else if (paid && data.deliveryStatus === "manual_required") {
      wrap.append(el("h2", "payment-title", "Pago confirmado; entrega pendiente"));
      wrap.append(el(
        "p",
        "payment-copy",
        "El pago está confirmado, pero el inventario no tiene todos los códigos. " +
        "No necesitas pagar otra vez. Contacta con soporte para completar la entrega."
      ));
    } else if (paid) {
      wrap.append(el("h2", "payment-title", "Pago confirmado"));
      wrap.append(el(
        "p",
        "payment-copy",
        "Estamos preparando tu entrega. Esta página volverá a comprobar el estado."
      ));
    } else if (["invoice_error", "cancelled", "rejected", "expired"].includes(data.status)) {
      wrap.append(el("h2", "payment-title", "El pedido no está pagado"));
      wrap.append(el(
        "p",
        "payment-copy",
        "No se confirmó un pago completado. Puedes regresar a la tienda y revisar tu carrito."
      ));
    } else {
      wrap.append(el("h2", "payment-title", "Esperando confirmación"));
      wrap.append(el(
        "p",
        "payment-copy",
        "La factura aún no está marcada como liquidada. No vuelvas a pagar la misma factura mientras se verifica."
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
    actions.append(actionLink("Volver a la tienda ↗", "/tienda.html", "button primary"));
    actions.append(actionLink("Contactar soporte", "/soporte.html"));
    wrap.append(actions);

    target.append(wrap);
  }

  async function checkStatus() {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      target.textContent =
        "El enlace del pedido no es válido. Si ya pagaste, contacta con soporte.";
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

      const finished =
        (data.status === "paid" && data.deliveryStatus === "delivered") ||
        data.deliveryStatus === "manual_required" ||
        ["invoice_error", "cancelled", "rejected", "expired"].includes(data.status);

      if (!finished && attempts < 120) {
        timer = setTimeout(checkStatus, 4000);
      }
    } catch (error) {
      target.replaceChildren(
        el("p", "payment-copy", error.message || "Error consultando el pedido.")
      );

      if (attempts < 10) {
        timer = setTimeout(checkStatus, 4000);
      }
    }
  }

  window.addEventListener("pagehide", () => clearTimeout(timer), { once: true });
  checkStatus();
})();
