
/* ==========================================================
   ELGATO.LOL — LIQUID GLASS + PURPLE RAIN
   Canvas rain · 3D tilt · cursor reflections · scroll reveals
   ========================================================== */
(() => {
  "use strict";

  const body = document.body;

  // Este script solo se utiliza en la portada.
  if (!body.classList.contains("home-page") && location.pathname === "/") {
    body.classList.add("home-page");
  }

  if (!body.classList.contains("home-page")) return;

  const canvas = document.getElementById("rain-canvas");
  const ctx = canvas && canvas.getContext
    ? canvas.getContext("2d", { alpha: true })
    : null;

  if (!canvas || !ctx) {
    console.error(
      "[Elgato.lol] No se encontró el Canvas de lluvia o no se pudo crear su contexto 2D."
    );
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const smallScreen = window.matchMedia("(max-width: 700px)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  // Fuerza las capas correctas por encima del fondo OLED.
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "1",
    display: "block",
    opacity: "0.9",
    pointerEvents: "none"
  });

  document.querySelectorAll(".atmosphere").forEach((element) => {
    element.style.zIndex = "0";
    element.style.pointerEvents = "none";
  });

  const vignette = document.querySelector(".page-vignette");

  if (vignette) {
    vignette.style.zIndex = "2";
    vignette.style.pointerEvents = "none";
  }

  const shell = document.querySelector(".home-shell");

  if (shell) {
    shell.style.position = "relative";
    shell.style.zIndex = "3";
  }

  const header = document.getElementById("site-header");

  if (header) {
    header.style.position = "relative";
    header.style.zIndex = "30";
  }

  const footer = document.getElementById("site-footer");

  if (footer) {
    footer.style.position = "relative";
    footer.style.zIndex = "3";
  }

  /* =========================
     LLUVIA MORADA EN CANVAS
     ========================= */

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let drops = [];
  let particles = [];
  let raf = 0;
  let lastTime = 0;
  let running = false;

  const config = {
    density: smallScreen ? 70 : 155,
    minSpeed: 95,
    maxSpeed: 255,
    minLength: 7,
    maxLength: 24
  };

  const random = (min, max) =>
    Math.random() * (max - min) + min;

  function makeDrop(initial = true) {
    const depth = Math.random();

    return {
      x: random(0, width),
      y: initial ? random(-height, height) : random(-70, -12),
      depth,
      length:
        random(config.minLength, config.maxLength) *
        (0.55 + depth * 1.05),
      speed:
        random(config.minSpeed, config.maxSpeed) *
        (0.55 + depth * 0.75),
      drift: random(-20, 12),
      alpha:
        random(0.18, 0.50) *
        (0.45 + depth * 0.8),
      lineWidth:
        random(0.45, 1.1) *
        (0.5 + depth * 0.7),
      glow: depth > 0.66
    };
  }

  function makeParticle() {
    return {
      x: random(0, width),
      y: random(0, height),
      r: random(0.45, 1.35),
      phase: random(0, Math.PI * 2),
      speed: random(0.5, 1.4),
      alpha: random(0.12, 0.38)
    };
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);

    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drops = Array.from(
      { length: config.density },
      () => makeDrop(true)
    );

    particles = Array.from(
      { length: smallScreen ? 18 : 38 },
      makeParticle
    );

    // La lluvia también se ve en modo de movimiento reducido.
    if (reducedMotion) drawStatic();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);

    for (const drop of drops) {
      ctx.beginPath();

      ctx.strokeStyle = drop.glow
        ? `rgba(210,180,255,${Math.min(0.65, drop.alpha)})`
        : `rgba(159,118,238,${Math.min(0.5, drop.alpha)})`;

      ctx.lineWidth = drop.lineWidth;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + 2.5, drop.y + drop.length);
      ctx.stroke();
    }

    for (const particle of particles) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(210,190,255,${particle.alpha * 0.6})`;
      ctx.arc(
        particle.x,
        particle.y,
        particle.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  function draw(time) {
    if (!running || document.hidden) {
      raf = 0;
      return;
    }

    const delta = lastTime
      ? Math.min((time - lastTime) / 1000, 0.04)
      : 0.016;

    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    // Capas de lluvia: las gotas más brillantes parecen estar más cerca.
    for (const drop of drops) {
      const x2 = drop.x + drop.length * 0.11;
      const y2 = drop.y + drop.length;

      const rgb = drop.glow
        ? "216,190,255"
        : "157,117,237";

      const gradient = ctx.createLinearGradient(
        drop.x,
        drop.y,
        x2,
        y2
      );

      gradient.addColorStop(0, `rgba(${rgb},0)`);
      gradient.addColorStop(
        0.42,
        `rgba(${rgb},${drop.alpha * 0.45})`
      );
      gradient.addColorStop(1, `rgba(${rgb},${drop.alpha})`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = drop.lineWidth;
      ctx.lineCap = "round";

      if (drop.glow) {
        ctx.shadowBlur = 9;
        ctx.shadowColor = "rgba(157,106,255,.75)";
      }

      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.shadowBlur = 0;

      drop.y += drop.speed * delta;
      drop.x += drop.drift * delta;

      if (
        drop.y > height + drop.length ||
        drop.x < -35 ||
        drop.x > width + 35
      ) {
        Object.assign(drop, makeDrop(false));
        drop.x = Math.max(0, Math.min(width, drop.x));
      }
    }

    // Partículas tenues que pulsan lentamente al fondo.
    for (const particle of particles) {
      const pulse =
        0.6 +
        Math.sin(time * 0.0007 * particle.speed + particle.phase) * 0.4;

      ctx.beginPath();
      ctx.fillStyle =
        `rgba(217,196,255,${particle.alpha * pulse})`;

      ctx.arc(
        particle.x,
        particle.y,
        particle.r * (0.8 + pulse * 0.3),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    raf = window.requestAnimationFrame(draw);
  }

  function start() {
    if (reducedMotion || running || document.hidden) return;

    running = true;
    lastTime = 0;
    raf = window.requestAnimationFrame(draw);
  }

  function stop() {
    running = false;

    if (raf) {
      window.cancelAnimationFrame(raf);
    }

    raf = 0;
  }

  resize();

  if (reducedMotion) {
    drawStatic();
  } else {
    start();
  }

  let resizeTimer = 0;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 100);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else if (reducedMotion) {
      drawStatic();
    } else {
      start();
    }
  });

  /* =========================
     REFLEJOS Y EFECTO 3D
     ========================= */

  function bindTilt(element, max = 5) {
    if (
      !element ||
      element.dataset.elgatoTiltBound === "1" ||
      reducedMotion ||
      noHover
    ) {
      return;
    }

    element.dataset.elgatoTiltBound = "1";

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();

      const x = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );

      const y = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      );

      element.style.setProperty("--mouse-x", `${x * 100}%`);
      element.style.setProperty("--mouse-y", `${y * 100}%`);
      element.style.setProperty("--tilt-x", `${(x - 0.5) * max}deg`);
      element.style.setProperty("--tilt-y", `${(0.5 - y) * max}deg`);

      element.classList.add("is-tilting");
    });

    element.addEventListener("pointerleave", () => {
      element.classList.remove("is-tilting");

      element.style.setProperty("--mouse-x", "50%");
      element.style.setProperty("--mouse-y", "45%");
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
    });
  }

  bindTilt(document.querySelector(".hero-visual"), 5);

  function bindDynamicCards(root = document) {
    root.querySelectorAll(
      ".liquid-category, .home-product-grid .product-card"
    ).forEach((card, index) => {
      bindTilt(card, 4);
      card.style.setProperty("--stagger-index", String(index % 4));
      card.classList.add("has-stagger");
    });
  }

  bindDynamicCards();

  // Los productos destacados se insertan dinámicamente desde app.js.
  const featured = document.getElementById("featured-products");

  if (featured && "MutationObserver" in window) {
    const productObserver = new MutationObserver(() => {
      bindDynamicCards(featured);
    });

    productObserver.observe(featured, {
      childList: true,
      subtree: true
    });
  }

  /* =========================
     REVELAR SECCIONES AL BAJAR
     ========================= */

  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealNodes = document.querySelectorAll(
      ".glass-benefits, .home-section, .home-final-panel"
    );

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px"
      }
    );

    revealNodes.forEach((node) => {
      node.classList.add("elgato-reveal");
      revealObserver.observe(node);
    });
  }

  // Confirmación visible en la consola de que este archivo se ejecutó.
  body.classList.add("elgato-effects-ready");

  console.info(
    "%cElgato.lol effects loaded ✓",
    "color:#c7a8ff;font-weight:bold"
  );
})();
