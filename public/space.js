
(() => {
  const canvas = document.getElementById('space-canvas');
  const hero = document.querySelector('.hero');

  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let meteors = [];
  let raf = 0;
  let lastTime = 0;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function resize() {
    const rect = hero.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(
      240,
      Math.max(90, Math.round((width * height) / 4200))
    );

    stars = Array.from({ length: count }, () => ({
      x: random(0, width),
      y: random(0, height),
      z: random(0.2, 1),
      r: random(0.35, 1.55),
      phase: random(0, Math.PI * 2),
      tint: Math.random()
    }));

    meteors = [];
  }

  function drawNebula(time) {
    const glows = [
      {
        x: width * 0.60 + Math.sin(time * 0.00013) * 28,
        y: height * 0.35,
        r: Math.min(width, height) * 0.37,
        color: '108,76,255'
      },
      {
        x: width * 0.79 + Math.cos(time * 0.00011) * 24,
        y: height * 0.64,
        r: Math.min(width, height) * 0.31,
        color: '28,125,255'
      },
      {
        x: width * 0.43,
        y: height * 0.77 + Math.sin(time * 0.00016) * 14,
        r: Math.min(width, height) * 0.22,
        color: '169,55,230'
      }
    ];

    for (const glow of glows) {
      const gradient = ctx.createRadialGradient(
        glow.x, glow.y, 0,
        glow.x, glow.y, glow.r
      );

      gradient.addColorStop(0, `rgba(${glow.color},.095)`);
      gradient.addColorStop(1, `rgba(${glow.color},0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(
        glow.x - glow.r,
        glow.y - glow.r,
        glow.r * 2,
        glow.r * 2
      );
    }
  }

  function drawStars(time, delta) {
    const offsetX = pointer.x * 0.012;
    const offsetY = pointer.y * 0.012;

    for (const star of stars) {
      if (!reduceMotion) {
        star.y -= delta * (0.003 + star.z * 0.012);
      }

      if (star.y < -3) {
        star.y = height + 3;
        star.x = random(0, width);
      }

      const x = star.x + offsetX * star.z;
      const y = star.y + offsetY * star.z;

      const twinkle =
        0.32 +
        (Math.sin(time * 0.0015 + star.phase) + 1) * 0.25;

      const alpha = twinkle * (0.35 + star.z * 0.65);

      ctx.beginPath();

      ctx.fillStyle = star.tint > 0.78
        ? `rgba(174,154,255,${alpha})`
        : `rgba(218,230,255,${alpha})`;

      ctx.arc(x, y, star.r * star.z + 0.2, 0, Math.PI * 2);
      ctx.fill();

      if (star.z > 0.88 && star.r > 1.2) {
        ctx.strokeStyle = `rgba(180,190,255,${alpha * 0.26})`;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x, y + 4);
        ctx.stroke();
      }
    }
  }

  function drawMeteors(delta) {
    if (
      !reduceMotion &&
      meteors.length < 2 &&
      Math.random() < 0.008
    ) {
      meteors.push({
        x: random(width * 0.38, width * 1.1),
        y: random(-20, height * 0.48),
        vx: -random(0.15, 0.32),
        vy: random(0.12, 0.24),
        life: 0,
        max: random(38, 72)
      });
    }

    meteors = meteors.filter(meteor => meteor.life < meteor.max);

    for (const meteor of meteors) {
      meteor.life += delta * 0.06;
      meteor.x += meteor.vx * delta;
      meteor.y += meteor.vy * delta;

      const opacity =
        Math.sin((meteor.life / meteor.max) * Math.PI) * 0.6;

      const gradient = ctx.createLinearGradient(
        meteor.x,
        meteor.y,
        meteor.x - meteor.vx * 95,
        meteor.y - meteor.vy * 95
      );

      gradient.addColorStop(0, `rgba(255,255,255,${opacity})`);
      gradient.addColorStop(1, 'rgba(151,126,255,0)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.3;

      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(
        meteor.x - meteor.vx * 95,
        meteor.y - meteor.vy * 95
      );
      ctx.stroke();
    }
  }

  function render(time) {
    const delta = lastTime
      ? Math.min(32, time - lastTime)
      : 16;

    lastTime = time;

    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;

    ctx.clearRect(0, 0, width, height);

    drawNebula(time);
    drawStars(time, delta);
    drawMeteors(delta);

    if (!reduceMotion) {
      raf = requestAnimationFrame(render);
    }
  }

  hero.addEventListener('pointermove', event => {
    const rect = hero.getBoundingClientRect();

    pointer.tx = event.clientX - rect.left - rect.width / 2;
    pointer.ty = event.clientY - rect.top - rect.height / 2;

    const visual = hero.querySelector('.hero-visual');

    if (visual && width > 680 && !reduceMotion) {
      const rotateX = (pointer.ty / height) * -3.5;
      const rotateY = (pointer.tx / width) * 4.5;

      visual.style.setProperty('--tilt-x', `${rotateX}deg`);
      visual.style.setProperty('--tilt-y', `${rotateY}deg`);
    }
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    pointer.tx = 0;
    pointer.ty = 0;

    const visual = hero.querySelector('.hero-visual');

    if (visual) {
      visual.style.setProperty('--tilt-x', '0deg');
      visual.style.setProperty('--tilt-y', '0deg');
    }
  }, { passive: true });

  const observer = new ResizeObserver(() => {
    resize();
  });

  observer.observe(hero);
  resize();

  if (reduceMotion) {
    render(0);
  } else {
    raf = requestAnimationFrame(render);
  }

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
  }, { once: true });
})();
