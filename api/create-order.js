
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
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const siteUrl = process.env.SITE_URL;

    if (!apiKey || !siteUrl) {
      return res.status(503).json({
        error: "NOWPayments aún no está configurado en el servidor."
      });
    }

    const site = new URL(siteUrl);

    if (site.protocol !== "https:") {
      return res.status(500).json({
        error: "SITE_URL debe usar HTTPS."
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
      return res.status(400).json({ error: "El total no es válido." });
    }

    const { db } = await getMongo();
    const orders = db.collection("orders");

    const orderId = new ObjectId();
    const token = crypto.randomBytes(32).toString("hex");
    const publicTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await orders.insertOne({
      _id: orderId,
      publicTokenHash,
      status: "pending_payment",
      paymentStatus: "waiting",
      currency: "MXN",
      totalMXN,
      items: cleanItems,
      invoiceId: null,
      deliveredItems: null,
      deliveryStatus: "pending_payment",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const baseUrl = site.origin;
    const invoiceResponse = await fetch(
      "https://api.nowpayments.io/v1/invoice",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          price_amount: totalMXN,
          price_currency: "mxn",
          order_id: orderId.toString(),
          order_description: `ElGato.lol order ${orderId.toString()}`,
          ipn_callback_url: `${baseUrl}/api/nowpayments-ipn`,
          success_url: `${baseUrl}/pago.html?token=${token}`,
          cancel_url: `${baseUrl}/carrito.html`
        })
      }
    );

    const invoice = await invoiceResponse.json().catch(() => ({}));

    if (
      !invoiceResponse.ok ||
      !invoice.id ||
      !invoice.invoice_url
    ) {
      console.error(
        "NOWPayments invoice error:",
        invoiceResponse.status,
        invoice.message || invoice
      );

      await orders.updateOne(
        { _id: orderId },
        {
          $set: {
            status: "invoice_error",
            updatedAt: new Date()
          }
        }
      );

      return res.status(502).json({
        error: "NOWPayments no pudo crear la factura. Inténtalo de nuevo."
      });
    }

    await orders.updateOne(
      { _id: orderId },
      {
        $set: {
          invoiceId: String(invoice.id),
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({
      checkoutUrl: invoice.invoice_url
    });
  } catch (error) {
    console.error("create-order:", error.message);

    return res.status(500).json({
      error: "No se pudo crear el pedido. Revisa las variables del servidor."
    });
  }
};
