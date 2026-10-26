
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const { getMongo } = require("../lib/mongodb");
const { fulfillOrder } = require("../lib/fulfill-order");

module.exports.config = {
  api: { bodyParser: false }
};

async function readRawBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > maxBytes) {
      const error = new Error("BODY_TOO_LARGE");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function validSignature(rawBody, header, secret) {
  if (typeof header !== "string" || !secret) return false;

  const match = /^sha256=([a-f0-9]{64})$/i.exec(header);
  if (!match) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest();

  const received = Buffer.from(match[1], "hex");

  return received.length === expected.length &&
    crypto.timingSafeEqual(received, expected);
}

function toMinorUnits(value) {
  const string = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(string)) return NaN;

  const [whole, fraction = ""] = string.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

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
      BTCPAY_WEBHOOK_SECRET
    } = process.env;

    if (
      !BTCPAY_URL || !BTCPAY_API_KEY ||
      !BTCPAY_STORE_ID || !BTCPAY_WEBHOOK_SECRET
    ) {
      return res.status(500).json({ error: "Webhook sin configurar." });
    }

    const rawBody = await readRawBody(req);

    if (!validSignature(
      rawBody,
      req.headers["btcpay-sig"],
      BTCPAY_WEBHOOK_SECRET
    )) {
      return res.status(401).json({ error: "Firma inválida." });
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    if (event.storeId !== BTCPAY_STORE_ID) {
      return res.status(403).json({ error: "Tienda incorrecta." });
    }

    if (event.type !== "InvoiceSettled") {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (!event.invoiceId) {
      return res.status(400).json({ error: "Falta invoiceId." });
    }

    const btcpay = new URL(BTCPAY_URL);
    const invoiceResponse = await fetch(
      `${btcpay.origin}/api/v1/stores/${encodeURIComponent(BTCPAY_STORE_ID)}/invoices/${encodeURIComponent(event.invoiceId)}`,
      {
        headers: {
          Authorization: `token ${BTCPAY_API_KEY}`
        }
      }
    );

    const invoice = await invoiceResponse.json().catch(() => ({}));

    if (!invoiceResponse.ok) {
      throw new Error("No se pudo consultar la factura.");
    }

    if (invoice.status !== "Settled") {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "Invoice not settled"
      });
    }

    const orderId = invoice.metadata?.orderId;

    if (!ObjectId.isValid(orderId)) {
      return res.status(200).json({
        received: true,
        unmatched: true
      });
    }

    const { client, db } = await getMongo();
    const orders = db.collection("orders");
    const order = await orders.findOne({
      _id: new ObjectId(orderId),
      invoiceId: event.invoiceId
    });

    if (!order) {
      return res.status(200).json({
        received: true,
        unmatched: true
      });
    }

    if (
      invoice.currency !== "MXN" ||
      toMinorUnits(invoice.amount) !== order.totalMinor
    ) {
      console.error("Factura con importe o moneda incorrectos:", event.invoiceId);
      return res.status(409).json({
        error: "La factura no coincide con el pedido."
      });
    }

    await orders.updateOne(
      { _id: order._id, invoiceId: event.invoiceId },
      {
        $set: {
          status: "paid",
          paymentStatus: "Settled",
          paidAt: order.paidAt || new Date(),
          updatedAt: new Date()
        }
      }
    );

    const delivery = await fulfillOrder(client, db, order._id);

    return res.status(200).json({
      received: true,
      status: "paid",
      deliveryStatus: delivery.status
    });
  } catch (error) {
    console.error("BTCPay webhook:", error.message);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode === 413
        ? "Notificación demasiado grande."
        : "No se pudo procesar la notificación."
    });
  }
};
