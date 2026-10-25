
const products = [
  {
    id: "spotify",
    name: "Spotify Premium",
    category: "Entretenimiento",
    price: 49,
    currency: "MXN",
    image: "/assets/spotify.jpg",
    badge: "POPULAR",
    short: "Tu música, sin interrupciones.",
    description: "Producto de ejemplo para el catálogo de elgato.lol. Añade aquí los detalles de una oferta legítima y disponible.",
    features: ["Música", "Experiencia premium", "Producto digital"]
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Entretenimiento",
    price: 79,
    currency: "MXN",
    image: "/assets/netflix.jpg",
    badge: "DESTACADO",
    short: "Series y películas para disfrutar.",
    description: "Producto de ejemplo. Publica únicamente opciones de suscripción que estés autorizado a vender.",
    features: ["Series", "Películas", "Entretenimiento"]
  },
  {
    id: "discord",
    name: "Discord Nitro",
    category: "Gaming",
    price: 99,
    currency: "MXN",
    image: "/assets/discord.jpg",
    badge: "POPULAR",
    short: "Mejora tu experiencia en Discord.",
    description: "Producto de ejemplo para probar las páginas de detalle y el carrito.",
    features: ["Comunidad", "Gaming", "Producto digital"]
  },
  {
    id: "chatgpt",
    name: "ChatGPT Plus",
    category: "Productividad",
    price: 129,
    currency: "MXN",
    image: "/assets/chatgpt.jpg",
    badge: "NUEVO",
    short: "Herramientas para crear y aprender.",
    description: "Producto de ejemplo. Verifica las condiciones de la plataforma antes de ofrecer cualquier suscripción.",
    features: ["Productividad", "Herramientas digitales", "IA"]
  }
];

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json({ products });
};
