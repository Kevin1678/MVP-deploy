import { clamp } from "../../shared/common";

export function initKeyboard(scene) {
  if (!scene.input?.keyboard) return;

  scene._keyHandler = (e) => {
    if (e.code === "Escape") {
      if (scene.gameEnded && scene.endModal) return;
      scene.cleanupTransientState();
      scene.stopSpeechNow();
      scene._onExit?.();
      return;
    }

    if (e.code === "KeyR") {
      scene.repeatSequence();
      return;
    }

    if (scene.state.locked || scene.gameEnded) return;

    const idx = scene.state.focusIndex;
    const r = Math.floor(idx / 3);
    const c = idx % 3;

    let nr = r;
    let nc = c;

    if (e.code === "ArrowLeft") nc = clamp(c - 1, 0, 2);
    if (e.code === "ArrowRight") nc = clamp(c + 1, 0, 2);
    if (e.code === "ArrowUp") nr = clamp(r - 1, 0, 2);
    if (e.code === "ArrowDown") nr = clamp(r + 1, 0, 2);

    const next = nr * 3 + nc;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
      scene.applyFocus(next);
      return;
    }

    if (e.code === "Enter" || e.code === "Space") {
      const tile = scene.tiles[scene.state.focusIndex];
      if (tile) scene.onTilePress(tile.r, tile.c);
    }
  };

  scene.input.keyboard.on("keydown", scene._keyHandler);
}

export function teardownKeyboard(scene) {
  if (scene._keyHandler && scene.input?.keyboard) {
    scene.input.keyboard.off("keydown", scene._keyHandler);
    scene._keyHandler = null;
  }
}
