
const products = [
  {
    id: "spotify",
    name: "Spotify Premium",
    category: "Música",
    description: "Disfruta de música sin anuncios en tus dispositivos.",
    price: 49,
    currency: "MXN",
    badge: "POPULAR",
    icon: "♫",
    color: "green"
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Entretenimiento",
    description: "Opciones de suscripción para disfrutar tus series.",
    price: 79,
    currency: "MXN",
    badge: "NUEVO",
    icon: "N",
    color: "red"
  },
  {
    id: "discord",
    name: "Discord Nitro",
    category: "Comunidad",
    description: "Mejora tu experiencia en Discord.",
    price: 99,
    currency: "MXN",
    badge: "DESTACADO",
    icon: "◈",
    color: "blue"
  },
  {
    id: "creator",
    name: "Creator Pack",
    category: "Herramientas digitales",
    description: "Un producto de ejemplo para creadores digitales.",
    price: 129,
    currency: "MXN",
    badge: "",
    icon: "✦",
    color: "mint"
  }
];

module.exports = (req, res) => {
  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=300"
  );

  res.status(200).json({ products });
};
