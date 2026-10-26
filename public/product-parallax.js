
"use strict";

(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  if (reduceMotion || !finePointer) return;

  function attach(card) {
    if (card.dataset.parallaxBound === "true") return;
    card.dataset.parallaxBound = "true";

    let frame = 0;
    let latestEvent = null;

    function update() {
      frame = 0;
      if (!latestEvent) return;

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (latestEvent.clientX - rect.left) / rect.width;
      const y = (latestEvent.clientY - rect.top) / rect.height;

      card.style.setProperty(
        "--tilt-y",
        `${((x - .5) * 5.2).toFixed(2)}deg`
      );

      card.style.setProperty(
        "--tilt-x",
        `${((.5 - y) * 4.4).toFixed(2)}deg`
      );

      card.style.setProperty("--shine-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--shine-y", `${(y * 100).toFixed(1)}%`);
      card.classList.add("is-tilting");
    }

    card.addEventListener("pointermove", event => {
      latestEvent = event;
      if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      latestEvent = null;

      if (frame) cancelAnimationFrame(frame);
      frame = 0;

      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--shine-x", "50%");
      card.style.setProperty("--shine-y", "50%");
      card.classList.remove("is-tilting");
    }, { passive: true });
  }

  function scan(root = document) {
    if (root.matches?.(".product-card")) attach(root);
    root.querySelectorAll?.(".product-card").forEach(attach);
  }

  scan();

  // Las tarjetas llegan después mediante fetch; vigila las nuevas.
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("pagehide", () => observer.disconnect(), {
    once: true
  });
})();
