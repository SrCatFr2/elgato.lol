
"use strict";

const products = require("../lib/catalog");

module.exports = (req, res) => {
  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=300"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.status(200).json({ products });
};
