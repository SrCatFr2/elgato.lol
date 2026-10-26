
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="no-referrer">
  <meta name="theme-color" content="#080914">
  <title>Stock admin — ElGato.lol</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script src="/stock-admin.js" defer></script>

  <style>
    .stock-admin { width:min(780px,calc(100% - 28px));margin:40px auto 70px; }
    .stock-panel { padding:clamp(18px,4vw,30px);border-radius:22px; }
    .stock-admin h1 { margin:12px 0;font:800 clamp(28px,5vw,40px)/1.1 Manrope,sans-serif;letter-spacing:-.06em; }
    .stock-admin p { color:#a6a9c5;font-size:12px;line-height:1.8; }
    .stock-admin label { display:block;margin:17px 0 8px;color:#d8d5ee;font-size:11px;font-weight:700; }
    .stock-admin input,.stock-admin textarea { width:100%;padding:12px;border:1px solid rgba(222,219,255,.14);border-radius:11px;background:rgba(7,8,20,.62);color:#f6f5ff;font:12px "DM Sans",sans-serif; }
    .stock-admin textarea { min-height:260px;resize:vertical;line-height:1.8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
    .stock-admin input:focus,.stock-admin textarea:focus { outline:2px solid #bba7ff;outline-offset:1px; }
    .stock-help { padding:13px 15px;border:1px solid rgba(187,167,255,.15);border-radius:12px;background:rgba(187,167,255,.045); }
    .stock-buttons { display:flex;flex-wrap:wrap;gap:9px;margin-top:14px; }
    .stock-buttons .button { cursor:pointer; }
    .stock-status { min-height:22px;margin-top:14px;font-size:12px;line-height:1.7;overflow-wrap:anywhere; }
    .stock-status[data-state="ok"] { color:#9bf7d7; }
    .stock-status[data-state="error"] { color:#ffb4c5; }
    .stock-counts { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px; }
    .stock-stat { padding:12px;border:1px solid rgba(222,219,255,.10);border-radius:12px;background:rgba(255,255,255,.025); }
    .stock-stat strong { display:block;color:#f7f4ff;font:800 20px Manrope,sans-serif; }
    .stock-stat span { color:#9da2bd;font-size:9px; }
    @media(max-width:480px) { .stock-admin { margin-top:24px; } .stock-counts { grid-template-columns:1fr; } }
  </style>
</head>

<body>
  <div class="ambient ambient-purple" aria-hidden="true"></div>

  <main class="stock-admin">
    <section class="page-banner compact-banner">
      <span class="eyebrow">ELGATO / ADMINISTRACIÓN</span>
      <h1>Inventario<span>.</span></h1>
      <p>Importa varias unidades de inventario en una sola operación.</p>
    </section>

    <section class="stock-panel panel">
      <div class="stock-help">
        <strong>Formato por línea</strong>
        <p>
          <code>productId | valor de entrega</code><br>
          IDs de ejemplo: <code>spotify</code>, <code>netflix</code>,
          <code>discord</code>, <code>chatgpt</code>.
        </p>
        <p>
          Solo importa códigos de activación, licencias o accesos autorizados.
          No pegues pares correo:contraseña ni secretos de wallets.
        </p>
      </div>

      <form id="stock-import-form">
        <label for="stock-admin-key">Clave administrativa</label>
        <input
          id="stock-admin-key"
          type="password"
          autocomplete="off"
          minlength="32"
          required
          placeholder="Clave STOCK_ADMIN_KEY de Vercel"
        >

        <label for="stock-file">O elige un archivo .txt / .csv</label>
        <input id="stock-file" type="file" accept=".txt,.csv,text/plain,text/csv">

        <label for="stock-lines">Valores de inventario</label>
        <textarea
          id="stock-lines"
          spellcheck="false"
          required
          placeholder="spotify | CODIGO-001&#10;spotify | CODIGO-002&#10;netflix | LICENCIA-003"
        ></textarea>

        <div class="stock-buttons">
          <button class="button primary" id="stock-submit" type="submit">
            Importar lote
          </button>
          <button class="button secondary" id="stock-clear" type="button">
            Limpiar texto
          </button>
        </div>
      </form>

      <div id="stock-status" class="stock-status" role="status" aria-live="polite"></div>

      <div class="stock-counts" aria-live="polite">
        <div class="stock-stat">
          <strong id="stock-inserted">—</strong>
          <span>Nuevas unidades</span>
        </div>
        <div class="stock-stat">
          <strong id="stock-existing">—</strong>
          <span>Ya existían</span>
        </div>
        <div class="stock-stat">
          <strong id="stock-duplicates">—</strong>
          <span>Duplicadas en el texto</span>
        </div>
      </div>
    </section>
  </main>
</body>
</html>
