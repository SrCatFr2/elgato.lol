
/* Elgato.lol — lluvia ambiental en canvas, sin librerías externas. */
(() => {
  const canvas = document.getElementById("rain-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const smallScreen = window.matchMedia("(max-width: 700px)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  let width = 0;
  let height = 0;
  let drops = [];
  let frame = 0;
  let raf = 0;
  let running = true;

  const config = {
    density: smallScreen ? 44 : 82,
    speedMin: 1.1,
    speedMax: 3.0,
    lengthMin: 9,
    lengthMax: 25
  };

  const random = (min, max) => Math.random() * (max - min) + min;

  function makeDrop(randomY = true) {
    return {
      x: random(0, width),
      y: randomY ? random(-height, height) : random(-50, -10),
      length: random(config.lengthMin, config.lengthMax),
      speed: random(config.speedMin, config.speedMax),
      drift: random(-0.22, 0.16),
      alpha: random(0.08, 0.29),
      width: random(0.35, 0.9),
      purple: Math.random() > 0.28
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, window.innerHeight);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drops = Array.from(
      { length: config.density },
      () => makeDrop(true)
    );
  }

  function draw() {
    if (!running || document.hidden) {
      raf = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);
    frame++;

    for (const drop of drops) {
      const x2 = drop.x + drop.drift * drop.length;
      const y2 = drop.y + drop.length;

      const colour = drop.purple
        ? "190, 158, 255"
        : "224, 211, 255";

      const gradient = ctx.createLinearGradient(
        drop.x,
        drop.y,
        x2,
        y2
      );

      gradient.addColorStop(0, `rgba(${colour}, 0)`);
      gradient.addColorStop(
        1,
        `rgba(${colour}, ${drop.alpha})`
      );

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = drop.width;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      drop.y += drop.speed;
      drop.x += drop.drift;

      if (
        drop.y > height + drop.length ||
        drop.x < -20 ||
        drop.x > width + 20
      ) {
        Object.assign(drop, makeDrop(false));
        drop.x = Math.max(0, Math.min(width, drop.x));
      }
    }

    // Destellos tenues para añadir profundidad sin saturar la pantalla.
    if (frame % 3 === 0) {
      const x = (Math.sin(frame * 0.013) * 0.5 + 0.5) * width;
      const y = (Math.cos(frame * 0.009) * 0.5 + 0.5) * height;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, 38);
      glow.addColorStop(0, "rgba(161, 112, 255, 0.025)");
      glow.addColorStop(1, "rgba(161, 112, 255, 0)");

      ctx.fillStyle = glow;
      ctx.fillRect(x - 38, y - 38, 76, 76);
    }

    raf = window.requestAnimationFrame(draw);
  }

  function start() {
    if (reduceMotion || raf) return;

    running = true;
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

  if (reduceMotion) {
    ctx.clearRect(0, 0, width, height);
  } else {
    start();
  }

  let resizeTimeout;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(resize, 120);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });
})();
