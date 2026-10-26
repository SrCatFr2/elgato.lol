
"use strict";

const crypto = require("node:crypto");
const products = require("../../lib/catalog");
const { getMongo } = require("../../lib/mongodb");

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return first.length === second.length &&
    crypto.timingSafeEqual(first, second);
}

function looksLikeAccountPasswordPair(value) {
  // Este importador solo acepta códigos, licencias o valores de entrega
  // autorizados, no pares de correo y contraseña de cuentas.
  return /^[^\s:@]+@[^\s:@]+\.[^\s:@]+:.+$/i.test(value);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const adminKey = process.env.STOCK_ADMIN_KEY;

    if (!adminKey || adminKey.length < 32) {
      return res.status(503).json({
        error: "Configura STOCK_ADMIN_KEY en las variables de Vercel."
      });
    }

    const authorization = req.headers.authorization || "";
    const suppliedKey = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!safeEqual(suppliedKey, adminKey)) {
      return res.status(401).json({
        error: "Clave administrativa incorrecta."
      });
    }

    const input = req.body?.items;

    if (!Array.isArray(input) || input.length === 0 || input.length > 500) {
      return res.status(400).json({
        error: "Envía entre 1 y 500 unidades por lote."
      });
    }

    const validProductIds = new Set(products.map(product => product.id));
    const uniqueInput = new Map();
    let duplicateInput = 0;

    for (const row of input) {
      const productId = typeof row?.productId === "string"
        ? row.productId.trim()
        : "";

      const deliveryValue = typeof row?.deliveryValue === "string"
        ? row.deliveryValue.trim()
        : "";

      if (!validProductIds.has(productId)) {
        return res.status(400).json({
          error: `Producto desconocido: ${productId || "(vacío)"}.`
        });
      }

      if (
        !deliveryValue ||
        deliveryValue.length > 3000 ||
        /[\r\n]/.test(deliveryValue)
      ) {
        return res.status(400).json({
          error: "Un valor de entrega está vacío o tiene un formato no válido."
        });
      }

      if (looksLikeAccountPasswordPair(deliveryValue)) {
        return res.status(400).json({
          error: "No se aceptan pares correo:contraseña. Importa códigos o accesos autorizados emitidos para el comprador."
        });
      }

      const key = `${productId}\u0000${deliveryValue}`;

      if (uniqueInput.has(key)) {
        duplicateInput++;
        continue;
      }

      uniqueInput.set(key, {
        productId,
        deliveryValue
      });
    }

    const { db } = await getMongo();
    const inventory = db.collection("digital_codes");

    // Impide que el mismo valor se importe más de una vez para el producto.
    await inventory.createIndex(
      { productId: 1, deliveryValue: 1 },
      {
        unique: true,
        partialFilterExpression: {
          deliveryValue: { $type: "string" }
        }
      }
    );

    await inventory.createIndex({
      productId: 1,
      assignedOrderId: 1,
      _id: 1
    });

    const now = new Date();

    const operations = [...uniqueInput.values()].map(item => ({
      updateOne: {
        filter: {
          productId: item.productId,
          deliveryValue: item.deliveryValue
        },
        update: {
          $setOnInsert: {
            productId: item.productId,
            deliveryValue: item.deliveryValue,
            assignedOrderId: null,
            createdAt: now
          }
        },
        upsert: true
      }
    }));

    const result = await inventory.bulkWrite(operations, {
      ordered: false
    });

    return res.status(200).json({
      ok: true,
      received: input.length,
      inserted: result.upsertedCount,
      alreadyPresent: result.matchedCount,
      duplicateInBatch: duplicateInput,
      message: "Lote procesado."
    });
  } catch (error) {
    // No imprimir valores de inventario ni secretos en los logs.
    console.error("import-stock error:", error.code || error.name);

    return res.status(500).json({
      error: error.code === 11000
        ? "Hay valores duplicados en el inventario. Revisa los índices de MongoDB."
        : "No se pudo importar el lote."
    });
  }
};
