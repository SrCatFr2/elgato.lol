
const crypto = require("crypto");

const PRODUCTS = {
  spotify: { name: "Spotify Premium", price: 49 },
  netflix: { name: "Netflix", price: 79 },
  discord: { name: "Discord Nitro", price: 99 },
  chatgpt: { name: "ChatGPT Plus", price: 129 }
};

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const { items, email } = req.body || {};

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Correo no válido." });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return res.status(400).json({ error: "El carrito no es válido." });
  }

  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = PRODUCTS[item.id];
    const quantity = Number(item.quantity);

    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return res.status(400).json({ error: "Producto o cantidad no válida." });
    }

    total += product.price * quantity;
    orderItems.push({
      id: item.id,
      name: product.name,
      quantity,
      unitPrice: product.price
    });
  }

  return res.status(200).json({
    orderId: crypto.randomUUID(),
    status: "awaiting_payment",
    currency: "MXN",
    total,
    items: orderItems,
    message: "Pedido de prueba creado. No se ha realizado ningún cobro."
  });
};
