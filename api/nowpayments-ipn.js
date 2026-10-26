
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const { getMongo } = require("../lib/mongodb");
const { fulfillOrder } = require("../lib/fulfill-order");

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);

  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortObject(value[key]);
      return result;
    }, {});
  }

  return value;
}

function verifySignature(payload, receivedSignature, secret) {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof receivedSignature !== "string" ||
    !/^[a-f0-9]{128}$/i.test(receivedSignature) ||
    !secret
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", secret.trim())
    .update(JSON.stringify(sortObject(payload)))
    .digest();

  const received = Buffer.from(receivedSignature, "hex");

  return expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!secret) {
      console.error("Falta NOWPAYMENTS_IPN_SECRET.");
      return res.status(500).json({ error: "Webhook no configurado." });
    }

    const payload = req.body;
    const signature = req.headers["x-nowpayments-sig"];

    if (!verifySignature(payload, signature, secret)) {
      return res.status(401).json({ error: "Firma IPN inválida." });
    }

    const orderId = payload.order_id;

    if (
      typeof orderId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(orderId)
    ) {
      // No es un pedido reconocible de nuestra tienda.
      return res.status(200).json({ received: true, ignored: true });
    }

    const { client, db } = await getMongo();
    const orders = db.collection("orders");
    const id = new ObjectId(orderId);
    const order = await orders.findOne({ _id: id });

    if (!order) {
      return res.status(200).json({ received: true, unmatched: true });
    }

    const paymentStatus = String(payload.payment_status || "").toLowerCase();

    // No entregar nada por "waiting", "confirming" o "partially_paid".
    if (paymentStatus !== "finished") {
      if (order.status !== "paid") {
        await orders.updateOne(
          { _id: id, status: { $ne: "paid" } },
          {
            $set: {
              paymentStatus,
              updatedAt: new Date()
            }
          }
        );
      }

      return res.status(200).json({
        received: true,
        paymentStatus
      });
    }

    // Comprobaciones adicionales si el IPN incluye el importe y moneda fiat.
    if (
      payload.price_amount !== undefined &&
      Math.round(Number(payload.price_amount) * 100) !== order.totalMXN * 100
    ) {
      console.error("Importe IPN no coincide con el pedido", orderId);
      return res.status(400).json({ error: "Importe no coincidente." });
    }

    if (
      payload.price_currency !== undefined &&
      String(payload.price_currency).toLowerCase() !== "mxn"
    ) {
      return res.status(400).json({ error: "Moneda no coincidente." });
    }

    // Idempotente: repetir la notificación no genera otro pedido.
    await orders.updateOne(
      { _id: id, status: { $ne: "paid" } },
      {
        $set: {
          status: "paid",
          paymentStatus: "finished",
          paymentId: payload.payment_id
            ? String(payload.payment_id)
            : null,
          paidAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    const latest = await orders.findOne({ _id: id });

    if (latest.status !== "paid") {
      return res.status(409).json({ error: "No se pudo confirmar el pedido." });
    }

    // Si no hay inventario, la función lo marca para entrega manual.
    const delivery = await fulfillOrder(client, db, id);

    return res.status(200).json({
      received: true,
      status: "paid",
      deliveryStatus: delivery.status
    });
  } catch (error) {
    console.error("NOWPayments IPN:", error.message);

    return res.status(500).json({
      error: "No se pudo procesar la notificación."
    });
  }
};
