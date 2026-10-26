
"use strict";

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

function verifySignature(payload, signature, secret) {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{128}$/i.test(signature) ||
    !secret
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", secret.trim())
    .update(JSON.stringify(sortObject(payload)))
    .digest();

  const received = Buffer.from(signature, "hex");

  return expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);
}

function toCents(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return NaN;
  }

  return Math.round(amount * 100);
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

    const orderId = String(payload.order_id || "");

    if (!/^[a-f0-9]{24}$/i.test(orderId)) {
      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    const { client, db } = await getMongo();
    const orders = db.collection("orders");
    const id = new ObjectId(orderId);
    const order = await orders.findOne({ _id: id });

    if (!order) {
      return res.status(200).json({
        received: true,
        unmatched: true
      });
    }

    // Si el callback incluye invoice_id, debe coincidir con la factura creada.
    if (
      payload.invoice_id !== undefined &&
      String(payload.invoice_id) !== String(order.invoiceId)
    ) {
      console.error("Invoice ID no coincide:", orderId);
      return res.status(400).json({
        error: "Factura no coincidente."
      });
    }

    const paymentStatus = String(
      payload.payment_status || ""
    ).toLowerCase();

    if (paymentStatus !== "finished") {
      const mappedStatus = {
        expired: "expired",
        failed: "failed",
        refunded: "refunded",
        partially_paid: "partially_paid"
      }[paymentStatus] || "pending_payment";

      // Un aviso atrasado nunca debe degradar un pedido ya pagado.
      if (order.status !== "paid") {
        await orders.updateOne(
          { _id: id, status: { $ne: "paid" } },
          {
            $set: {
              status: mappedStatus,
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

    // No aceptes un pago completado sin importe y moneda verificables.
    if (
      payload.price_amount === undefined ||
      typeof payload.price_currency !== "string" ||
      payload.price_currency.toLowerCase() !== "mxn" ||
      toCents(payload.price_amount) !== Number(order.totalMXN) * 100
    ) {
      console.error("Importe o moneda no coinciden:", orderId);
      return res.status(400).json({
        error: "Importe o moneda no coinciden."
      });
    }

    await orders.updateOne(
      { _id: id, status: { $ne: "paid" } },
      {
        $set: {
          status: "paid",
          paymentStatus: "finished",
          paymentId: payload.payment_id
            ? String(payload.payment_id)
            : null,
          paidAt: order.paidAt || new Date(),
          updatedAt: new Date()
        }
      }
    );

    // La entrega es idempotente: las notificaciones repetidas no
    // deben volver a asignar códigos que ya se entregaron.
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
