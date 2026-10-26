
"use strict";

(() => {
  const form = document.getElementById("stock-import-form");
  const keyInput = document.getElementById("stock-admin-key");
  const fileInput = document.getElementById("stock-file");
  const textarea = document.getElementById("stock-lines");
  const submit = document.getElementById("stock-submit");
  const clear = document.getElementById("stock-clear");
  const status = document.getElementById("stock-status");

  if (!form || !keyInput || !textarea || !submit) return;

  function setStatus(message, state = "") {
    status.textContent = message;
    status.dataset.state = state;
  }

  function looksLikeAccountPasswordPair(value) {
    return /^[^\s:@]+@[^\s:@]+\.[^\s:@]+:.+$/i.test(value);
  }

  function parseLines(text) {
    const lines = text.split(/\r?\n/);
    const items = [];
    const errors = [];

    lines.forEach((original, index) => {
      const line = original.trim();

      if (!line || line.startsWith("#")) return;

      const separator = line.indexOf("|");

      if (separator < 1) {
        errors.push(`Línea ${index + 1}: falta el separador |.`);
        return;
      }

      const productId = line.slice(0, separator).trim();
      const deliveryValue = line.slice(separator + 1).trim();

      if (!productId || !deliveryValue) {
        errors.push(`Línea ${index + 1}: falta el producto o el valor.`);
        return;
      }

      if (deliveryValue.length > 3000) {
        errors.push(`Línea ${index + 1}: el valor supera 3000 caracteres.`);
        return;
      }

      if (looksLikeAccountPasswordPair(deliveryValue)) {
        errors.push(
          `Línea ${index + 1}: no se aceptan pares correo:contraseña.`
        );
        return;
      }

      items.push({ productId, deliveryValue });
    });

    return { items, errors };
  }

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus("El archivo supera el límite de 2 MB.", "error");
      fileInput.value = "";
      return;
    }

    try {
      textarea.value = await file.text();
      setStatus(`Archivo cargado: ${file.name}`);
    } catch {
      setStatus("No se pudo leer ese archivo.", "error");
    }
  });

  clear?.addEventListener("click", () => {
    textarea.value = "";
    fileInput.value = "";
    setStatus("");
    textarea.focus();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const adminKey = keyInput.value;
    const { items, errors } = parseLines(textarea.value);

    if (adminKey.length < 32) {
      setStatus("Introduce la clave administrativa completa.", "error");
      return;
    }

    if (errors.length) {
      setStatus(errors.slice(0, 8).join(" "), "error");
      return;
    }

    if (!items.length) {
      setStatus("No hay líneas de inventario para importar.", "error");
      return;
    }

    if (items.length > 500) {
      setStatus("Divide el archivo en lotes de máximo 500 unidades.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Importando...";
    setStatus("Procesando el lote en el servidor...");

    try {
      const response = await fetch("/api/admin/import-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`
        },
        body: JSON.stringify({ items })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se pudo importar el lote.");
      }

      document.getElementById("stock-inserted").textContent =
        String(data.inserted ?? 0);

      document.getElementById("stock-existing").textContent =
        String(data.alreadyPresent ?? 0);

      document.getElementById("stock-duplicates").textContent =
        String(data.duplicateInBatch ?? 0);

      setStatus(
        `Lote procesado. Nuevas unidades: ${data.inserted}. ` +
        `Ya existentes: ${data.alreadyPresent}.`,
        "ok"
      );

      textarea.value = "";
      fileInput.value = "";
    } catch (error) {
      setStatus(
        error.message || "Ocurrió un error importando el lote.",
        "error"
      );
    } finally {
      // La clave solo vive durante el envío actual; no la guardamos.
      keyInput.value = "";
      submit.disabled = false;
      submit.textContent = "Importar lote";
    }
  });
})();
