
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const products = require("../lib/catalog");
const { getMongo } = require("../lib/mongodb");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const {
      BTCPAY_URL,
      BTCPAY_API_KEY,
      BTCPAY_STORE_ID,
      SITE_URL
    } = process.env;

    if (!BTCPAY_URL || !BTCPAY_API_KEY ||
        !BTCPAY_STORE_ID || !SITE_URL) {
      return res.status(503).json({
        error: "El pago cripto todavía no está configurado."
      });
    }

    const site = new URL(SITE_URL);
    const btcpay = new URL(BTCPAY_URL);

    if (site.protocol !== "https:" || btcpay.protocol !== "https:") {
      return res.status(500).json({
        error: "SITE_URL y BTCPAY_URL deben usar HTTPS."
      });
    }

    const items = req.body?.items;

    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ error: "El carrito no es válido." });
    }

    const seen = new Set();
    const cleanItems = [];

    for (const item of items) {
      const id = typeof item?.id === "string" ? item.id : "";
      const quantity = Number(item?.quantity);
      const product = products.find(p => p.id === id);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10 ||
        seen.has(id)
      ) {
        return res.status(400).json({
          error: "Producto o cantidad no válida."
        });
      }

      seen.add(id);
      cleanItems.push({
        id: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price
      });
    }

    const totalMXN = cleanItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    if (!Number.isSafeInteger(totalMXN) || totalMXN <= 0) {
      return res.status(400).json({ error: "Total inválido." });
    }

    const { db } = await getMongo();
    const orders = db.collection("orders");

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const order = {
      _id: new ObjectId(),
      publicTokenHash: tokenHash,
      status: "pending_payment",
      deliveryStatus: "pending_payment",
      currency: "MXN",
      totalMXN,
      totalMinor: totalMXN * 100,
      items: cleanItems,
      invoiceId: null,
      paymentStatus: null,
      createdAt: now,
      updatedAt: now
    };

    await orders.insertOne(order);

    const redirectURL =
      `${site.origin}/pago.html?token=${encodeURIComponent(token)}`;

    const response = await fetch(
      `${btcpay.origin}/api/v1/stores/${encodeURIComponent(BTCPAY_STORE_ID)}/invoices`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${BTCPAY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: (totalMXN).toFixed(2),
          currency: "MXN",
          metadata: {
            orderId: order._id.toString()
          },
          checkout: {
            redirectURL,
            redirectAutomatically: true
          }
        })
      }
    );

    const invoice = await response.json().catch(() => ({}));

    if (!response.ok || !invoice.id || !invoice.checkoutLink) {
      console.error(
        "BTCPay invoice error:",
        response.status,
        invoice.message || invoice.errorCode || "Error desconocido"
      );

      await orders.updateOne(
        { _id: order._id },
        {
          $set: {
            status: "invoice_error",
            updatedAt: new Date()
          }
        }
      );

      return res.status(502).json({
        error: "No se pudo generar la factura. Inténtalo de nuevo."
      });
    }

    await orders.updateOne(
      { _id: order._id },
      {
        $set: {
          invoiceId: invoice.id,
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({
      checkoutUrl: invoice.checkoutLink
    });
  } catch (error) {
    console.error("create-order:", error.message);

    return res.status(500).json({
      error: "No se pudo crear el pedido."
    });
  }
};
