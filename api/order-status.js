
const crypto = require("node:crypto");
const { getMongo } = require("../lib/mongodb");
const { fulfillOrder } = require("../lib/fulfill-order");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const url = new URL(
      req.url,
      process.env.SITE_URL || "https://elgato.lol"
    );
    const token = url.searchParams.get("token") || "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: "Enlace de pedido inválido." });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const { client, db } = await getMongo();
    const orders = db.collection("orders");

    let order = await orders.findOne({ publicTokenHash: tokenHash });

    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    // Reintenta entregar si el pago está confirmado y se repuso el stock.
    if (
      order.status === "paid" &&
      order.deliveryStatus !== "delivered"
    ) {
      await fulfillOrder(client, db, order._id);
      order = await orders.findOne({ _id: order._id });
    }

    const canDeliver =
      order.status === "paid" &&
      order.deliveryStatus === "delivered" &&
      Array.isArray(order.deliveredItems);

    return res.status(200).json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      currency: order.currency,
      total: order.totalMXN,
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity
      })),
      deliveredItems: canDeliver ? order.deliveredItems : null
    });
  } catch (error) {
    console.error("order-status:", error.message);
    return res.status(500).json({
      error: "No se pudo consultar el pedido."
    });
  }
};
