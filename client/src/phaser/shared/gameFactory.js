import Phaser from "phaser";

export function createResponsiveGame(parentId, scenes, backgroundColor = "#0b1020") {
  const parentEl = document.getElementById(parentId);
  if (!parentEl) throw new Error(`No existe el elemento con id="${parentId}"`);

  parentEl.style.position = "relative";
  parentEl.style.overflow = "hidden";
  parentEl.style.width = "100%";
  parentEl.style.height = "100%";
  parentEl.style.minWidth = "320px";
  parentEl.style.minHeight = "480px";

  const getSize = () => {
    const rect = parentEl.getBoundingClientRect();
    return {
      width: Math.max(320, Math.floor(rect.width || window.innerWidth || 900)),
      height: Math.max(480, Math.floor(rect.height || window.innerHeight || 650)),
    };
  };

  const initial = getSize();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor,
    scene: scenes,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: initial.width,
      height: initial.height,
    },
  });

  const canvas = game.canvas;
  if (canvas) {
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  let resizeRaf = 0;

  const syncSize = () => {
    resizeRaf = 0;

    if (!game || !game.scale) return;

    const { width, height } = getSize();

    if (game.scale.width !== width || game.scale.height !== height) {
      try {
        game.scale.resize(width, height);
      } catch (err) {
        console.warn("No se pudo redimensionar el juego Phaser:", err);
      }
    }
  };

  const requestSyncSize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(syncSize);
  };

  const ro = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => requestSyncSize())
    : null;

  if (ro) ro.observe(parentEl);
  window.addEventListener("resize", requestSyncSize);
  window.addEventListener("orientationchange", requestSyncSize);
  setTimeout(requestSyncSize, 0);

  return () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    try {
      ro?.disconnect();
    } catch (_) {}
    window.removeEventListener("resize", requestSyncSize);
    window.removeEventListener("orientationchange", requestSyncSize);
    game.destroy(true);
  };
}
