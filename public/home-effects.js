
/* ==========================================================
   ELGATO.LOL — LIQUID BLACK GLASS EFFECTS
   Canvas rain · parallax · 3D tilt · reflections · reveals
   ========================================================== */
(() => {
  "use strict";

  const body = document.body;
  if (!body.classList.contains("home-page")) return;

  const canvas = document.getElementById("rain-canvas");
  const ctx = canvas?.getContext("2d", { alpha: true });

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const smallScreen = window.matchMedia("(max-width: 700px)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  /* ---------- CORRECCIÓN DE CAPAS ---------- */
  if (canvas) {
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";
  }

  document.querySelectorAll(".atmosphere").forEach((element) => {
    element.style.zIndex = "0";
    element.style.pointerEvents = "none";
  });

  const vignette = document.querySelector(".page-vignette");
  if (vignette) {
    vignette.style.zIndex = "1";
    vignette.style.pointerEvents = "none";
  }

  const header = document.getElementById("site-header");
  if (header) header.style.zIndex = "30";

  const shell = document.querySelector(".home-shell");
  if (shell) shell.style.zIndex = "2";

  /* ---------- LLUVIA EN CANVAS ---------- */
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let drops = [];
  let particles = [];
  let frameId = 0;
  let lastTime = 0;
  let running = false;

  const rainSettings = {
    count: smallScreen ? 48 : 125,
    minSpeed: 70,
    maxSpeed: 210,
    minLength: 9,
    maxLength: 30
  };

  const random = (min, max) => Math.random() * (max - min) + min;

  function createDrop(initial = false) {
    const depth = Math.random();

    return {
      x: random(0, width),
      y: initial ? random(-height, height) : random(-80, -15),
      depth,
      length: random(
        rainSettings.minLength,
        rainSettings.maxLength
      ) * (0.45 + depth * 0.95),
      speed: random(
        rainSettings.minSpeed,
        rainSettings.maxSpeed
      ) * (0.45 + depth * 0.8),
      drift: random(-15, 12),
      alpha: random(0.10, 0.36) * (0.35 + depth * 0.8),
      lineWidth: random(0.45, 1.1) * (0.5 + depth * 0.65),
      glow: depth > 0.75
    };
  }

  function createParticle() {
    return {
      x: random(0, width),
      y: random(0, height),
      radius: random(0.35, 1.35),
      phase: random(0, Math.PI * 2),
      speed: random(0.3, 1.2),
      alpha: random(0.08, 0.33)
    };
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drops = Array.from(
      { length: rainSettings.count },
      () => createDrop(true)
    );

    particles = Array.from(
      { length: smallScreen ? 15 : 32 },
      createParticle
    );

    if (reducedMotion) drawStaticBackground();
  }

  function drawStaticBackground() {
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(195, 166, 255, ${particle.alpha * 0.55})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRain(time) {
    if (!ctx || !running || document.hidden) {
      frameId = 0;
      return;
    }

    const delta = lastTime
      ? Math.min((time - lastTime) / 1000, 0.035)
      : 0.016;

    lastTime = time;
    ctx.clearRect(0, 0, width, height);

    /* Lluvia: capas lejanas y cercanas para crear profundidad. */
    for (const drop of drops) {
      const endX = drop.x + drop.length * 0.12;
      const endY = drop.y + drop.length;

      const alpha = drop.alpha;
      const colour = drop.glow
        ? `rgba(210, 180, 255, ${alpha})`
        : `rgba(159, 118, 238, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = drop.lineWidth;
      ctx.lineCap = "round";
      ctx.strokeStyle = colour;

      if (drop.glow) {
        ctx.shadowBlur = 7;
        ctx.shadowColor = "rgba(151, 98, 255, 0.6)";
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      drop.y += drop.speed * delta;
      drop.x += drop.drift * delta;

      if (drop.y > height + drop.length || drop.x < -40 || drop.x > width + 40) {
        Object.assign(drop, createDrop(false));
      }
    }

    /* Pequeñas partículas brillantes al fondo. */
    for (const particle of particles) {
      const pulse = 0.55 + Math.sin(time * 0.0007 * particle.speed + particle.phase) * 0.45;

      ctx.beginPath();
      ctx.fillStyle = `rgba(206, 185, 255, ${particle.alpha * pulse})`;
      ctx.arc(
        particle.x,
        particle.y,
        particle.radius * (0.8 + pulse * 0.25),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    frameId = window.requestAnimationFrame(drawRain);
  }

  function startRain() {
    if (reducedMotion || !ctx || running || document.hidden) return;

    running = true;
    lastTime = 0;
    frameId = window.requestAnimationFrame(drawRain);
  }

  function stopRain() {
    running = false;

    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  if (ctx) {
    resizeCanvas();

    if (!reducedMotion) {
      startRain();
    }
  }

  let resizeTimer;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeCanvas, 120);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRain();
    } else {
      startRain();
    }
  });

  /* ---------- REFLEJO QUE SIGUE AL CURSOR ---------- */
  const visual = document.querySelector(".hero-visual");

  if (visual && !reducedMotion && !noHover) {
    visual.addEventListener("pointermove", (event) => {
      const rect = visual.getBoundingClientRect();

      const x = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );

      const y = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      );

      visual.style.setProperty("--mouse-x", `${x * 100}%`);
      visual.style.setProperty("--mouse-y", `${y * 100}%`);
      visual.style.setProperty("--tilt-x", `${(x - 0.5) * 5}deg`);
      visual.style.setProperty("--tilt-y", `${(0.5 - y) * 5}deg`);

      visual.classList.add("is-tilting");
    });

    visual.addEventListener("pointerleave", () => {
      visual.classList.remove("is-tilting");
      visual.style.setProperty("--mouse-x", "50%");
      visual.style.setProperty("--mouse-y", "45%");
      visual.style.setProperty("--tilt-x", "0deg");
      visual.style.setProperty("--tilt-y", "0deg");
    });
  }

  /* ---------- TARJETAS CON PROFUNDIDAD 3D ---------- */
  const tiltTargets = new WeakSet();

  function attachTilt(element) {
    if (
      !element ||
      tiltTargets.has(element) ||
      reducedMotion ||
      noHover
    ) {
      return;
    }

    tiltTargets.add(element);

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      element.style.setProperty("--tilt-x", `${(x - 0.5) * 4}deg`);
      element.style.setProperty("--tilt-y", `${(0.5 - y) * 4}deg`);
      element.style.setProperty("--mouse-x", `${x * 100}%`);
      element.style.setProperty("--mouse-y", `${y * 100}%`);

      element.classList.add("is-tilting");
    });

    element.addEventListener("pointerleave", () => {
      element.classList.remove("is-tilting");
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      element.style.setProperty("--mouse-x", "50%");
      element.style.setProperty("--mouse-y", "50%");
    });
  }

  function bindTiltElements(root = document) {
    root.querySelectorAll(
      ".liquid-category, .home-product-grid .product-card"
    ).forEach(attachTilt);
  }

  bindTiltElements();

  /* Los productos se añaden dinámicamente desde app.js. */
  const featured = document.getElementById("featured-products");

  if (featured && "MutationObserver" in window) {
    const productObserver = new MutationObserver(() => {
      bindTiltElements(featured);
      addCardStagger(featured);
    });

    productObserver.observe(featured, {
      childList: true,
      subtree: true
    });
  }

  /* ---------- ANIMACIONES DE ENTRADA AL HACER SCROLL ---------- */
  function setupReveals() {
    if (
      reducedMotion ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const revealElements = document.querySelectorAll(
      ".glass-benefits, .home-section, .home-final-panel"
    );

    if (!revealElements.length) return;

    body.classList.add("has-motion");

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -35px 0px"
    });

    revealElements.forEach((element) => {
      element.setAttribute("data-reveal", "");
      revealObserver.observe(element);
    });
  }

  /* Entrada escalonada para tarjetas ya presentes. */
  function addCardStagger(root = document) {
    root.querySelectorAll(
      ".liquid-category, .home-product-grid .product-card, .process-glass-item"
    ).forEach((element, index) => {
      element.style.setProperty("--stagger-index", String(index % 4));
      element.classList.add("has-stagger");
    });
  }

  setupReveals();
  addCardStagger();

  /* Mantener visibles los elementos si se usa navegación ancla. */
  window.addEventListener("pageshow", () => {
    if (ctx && !document.hidden && !reducedMotion) startRain();
  });
})();
