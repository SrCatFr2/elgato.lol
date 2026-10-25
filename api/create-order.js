
const crypto = require("crypto");

const PRODUCTS = {
  spotify: { name: "Spotify Premium", price: 49 },
  netflix: { name: "Netflix", price: 79 },
  discord: { name: "Discord Nitro", price: 99 },
  creator: { name: "Creator Pack", price: 129 }
};

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  const { productId, email } = req.body || {};
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({
      error: "Producto no válido."
    });
  }

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      error: "Introduce un correo válido."
    });
  }

  return res.status(200).json({
    orderId: crypto.randomUUID(),
    product: product.name,
    amount: product.price,
    currency: "MXN",
    status: "awaiting_payment",
    message: "Pedido de prueba. No se ha realizado ningún cobro."
  });
};
