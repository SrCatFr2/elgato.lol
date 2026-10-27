/* ==========================================================
   ELGATO.LOL — FINAL INTERACTIVE EFFECTS
   Animated purple rain · soft particles · glass reflections
   3D perspective · reveal-on-scroll · visible load status
   ========================================================== */
(() => {
  "use strict";

  const body = document.body;
  if (!body.classList.contains("home-page") && location.pathname === "/") {
    body.classList.add("home-page");
  }
  if (!body.classList.contains("home-page")) return;

  const canvas = document.getElementById("rain-canvas");
  const ctx = canvas?.getContext?.("2d", { alpha: true });
  if (!canvas || !ctx) {
    console.error("[Elgato.lol] Falta #rain-canvas o el contexto 2D.");
    return;
  }

  const smallScreen = matchMedia("(max-width: 700px)").matches;
  const noHover = matchMedia("(hover: none)").matches;

  // IMPORTANTE: la lluvia no se detiene por prefers-reduced-motion.
  // Las animaciones se pausan únicamente cuando la pestaña no es visible.
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    zIndex: "0", display: "block", visibility: "visible",
    opacity: "0.83", pointerEvents: "none"
  });

  const shell = document.querySelector(".home-shell");
  if (shell) Object.assign(shell.style, { position: "relative", zIndex: "3" });
  const header = document.getElementById("site-header");
  if (header) Object.assign(header.style, { position: "relative", zIndex: "30" });
  const footer = document.getElementById("site-footer");
  if (footer) Object.assign(footer.style, { position: "relative", zIndex: "3" });
  document.querySelectorAll(".atmosphere").forEach((el) => {
    el.style.zIndex = "0";
    el.style.pointerEvents = "none";
  });
  const vignette = document.querySelector(".page-vignette");
  if (vignette) Object.assign(vignette.style, { zIndex: "1", pointerEvents: "none" });

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let drops = [];
  let motes = [];
  let animationFrame = 0;
  let previousTime = 0;
  let running = false;

  const rain = {
    count: smallScreen ? 68 : 148,
    minSpeed: 105,
    maxSpeed: 290,
    minLength: 8,
    maxLength: 29
  };
  const rand = (min, max) => Math.random() * (max - min) + min;

  function newDrop(startAnywhere = true) {
    const depth = Math.random();
    return {
      x: rand(0, width),
      y: startAnywhere ? rand(-height, height) : rand(-65, -8),
      depth,
      length: rand(rain.minLength, rain.maxLength) * (0.48 + depth * 1.05),
      speed: rand(rain.minSpeed, rain.maxSpeed) * (0.50 + depth * 0.78),
      drift: rand(-20, 13),
      alpha: rand(0.23, 0.55) * (0.48 + depth * 0.77),
      thickness: rand(0.45, 1.12) * (0.52 + depth * 0.65),
      close: depth > 0.65
    };
  }

  function newMote() {
    return {
      x: rand(0, width), y: rand(0, height), radius: rand(0.45, 1.45),
      phase: rand(0, Math.PI * 2), speed: rand(0.5, 1.4), alpha: rand(0.1, 0.38)
    };
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drops = Array.from({ length: rain.count }, () => newDrop(true));
    motes = Array.from({ length: smallScreen ? 16 : 38 }, newMote);
    if (!running) drawStatic();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    for (const drop of drops) {
      ctx.beginPath();
      ctx.strokeStyle = drop.close
        ? `rgba(215,190,255,${drop.alpha})`
        : `rgba(159,118,238,${drop.alpha * 0.8})`;
      ctx.lineWidth = drop.thickness;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + 2, drop.y + drop.length);
      ctx.stroke();
    }
    for (const mote of motes) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(207,184,255,${mote.alpha * 0.65})`;
      ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(time) {
    if (!running || document.hidden) {
      animationFrame = 0;
      return;
    }

    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.035) : 0.016;
    previousTime = time;
    ctx.clearRect(0, 0, width, height);

    for (const drop of drops) {
      const x2 = drop.x + drop.length * 0.10;
      const y2 = drop.y + drop.length;
      const rgb = drop.close ? "214,188,255" : "151,111,231";
      const gradient = ctx.createLinearGradient(drop.x, drop.y, x2, y2);
      gradient.addColorStop(0, `rgba(${rgb},0)`);
      gradient.addColorStop(0.45, `rgba(${rgb},${drop.alpha * 0.48})`);
      gradient.addColorStop(1, `rgba(${rgb},${drop.alpha})`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = drop.thickness;
      ctx.lineCap = "round";
      if (drop.close) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(161,105,255,.7)";
      }
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      drop.y += drop.speed * dt;
      drop.x += drop.drift * dt;
      if (drop.y > height + drop.length || drop.x < -35 || drop.x > width + 35) {
        Object.assign(drop, newDrop(false));
      }
    }

    for (const mote of motes) {
      const pulse = 0.56 + Math.sin(time * 0.0008 * mote.speed + mote.phase) * 0.44;
      ctx.beginPath();
      ctx.fillStyle = `rgba(218,198,255,${mote.alpha * pulse})`;
      ctx.arc(mote.x, mote.y, mote.radius * (0.8 + pulse * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }

    animationFrame = requestAnimationFrame(render);
  }

  function startRain() {
    if (running || document.hidden) return;
    running = true;
    previousTime = 0;
    animationFrame = requestAnimationFrame(render);
  }

  function stopRain() {
    running = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  resize();
  startRain();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopRain();
    else startRain();
  });

  /* Moving liquid reflection / gentle 3D tilt. */
  function attachTilt(element, strength = 5) {
    if (!element || element.dataset.elgatoTilt === "true" || noHover) return;
    element.dataset.elgatoTilt = "true";

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      element.style.setProperty("--mouse-x", `${x * 100}%`);
      element.style.setProperty("--mouse-y", `${y * 100}%`);
      element.style.setProperty("--tilt-x", `${(x - 0.5) * strength}deg`);
      element.style.setProperty("--tilt-y", `${(0.5 - y) * strength}deg`);
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

  function bindCards(root = document) {
    root.querySelectorAll(".liquid-category, .home-product-grid .product-card").forEach((node, i) => {
      attachTilt(node, 4);
      node.style.setProperty("--stagger-index", String(i % 4));
      node.classList.add("has-stagger");
    });
  }

  attachTilt(document.querySelector(".hero-visual"), 5);
  bindCards();

  const featured = document.getElementById("featured-products");
  if (featured && "MutationObserver" in window) {
    new MutationObserver(() => bindCards(featured)).observe(featured, {
      childList: true,
      subtree: true
    });
  }

  /* Reveal sections without hiding anything if observer is unavailable. */
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    }, { threshold: 0.10, rootMargin: "0px 0px -24px 0px" });

    document.querySelectorAll(".glass-benefits, .home-section, .home-final-panel").forEach((node) => {
      node.classList.add("elgato-reveal");
      observer.observe(node);
    });
  }

  body.classList.add("elgato-effects-ready");
  console.info("%cElgato.lol: liquid effects running ✓", "color:#c9a8ff;font-weight:bold");
})();
