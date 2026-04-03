export function initKeyboard(scene) {
  if (!scene.input?.keyboard) return;

  scene._keyHandler = (e) => {
    if (e.code === "Escape") {
      scene.stopSpeechNow();
      scene.scene.start("MenuScene");
      return;
    }

    if (scene.state.locked || scene.gameEnded) return;

    const cols = scene.gridCols || 4;
    const total = scene.cards.length;

    const r = Math.floor(scene.focusIndex / cols);
    const c = scene.focusIndex % cols;

    let nr = r;
    let nc = c;

    if (e.code === "ArrowLeft") nc = Math.max(0, c - 1);
    if (e.code === "ArrowRight") nc = Math.min(cols - 1, c + 1);
    if (e.code === "ArrowUp") nr = Math.max(0, r - 1);
    if (e.code === "ArrowDown") nr = nr + 1;

    let next = nr * cols + nc;
    if (next >= total) next = total - 1;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
      scene.focusIndex = next;
      applyFocus(scene, scene.focusIndex);
      return;
    }

    if (e.code === "Enter" || e.code === "Space") {
      const card = scene.cards[scene.focusIndex];
      if (card) scene.onCardClick(card);
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

export function applyFocus(scene, index, silent = false) {
  scene.cards.forEach((c) => c.focusOutline?.setVisible(false));
  const card = scene.cards[index];
  if (!card) return;

  if (!card.focusOutline) {
    card.focusOutline = scene.add
      .rectangle(card.cx, card.cy, 120, 140, 0x000000, 0)
      .setOrigin(0.5)
      .setStrokeStyle(
        4,
        scene.a11y?.highContrast ? 0x000000 : 0x22c55e,
        1
      );
    card.focusOutline.setVisible(false);
  }

  card.focusOutline.setVisible(true);
  card.focusOutline.setPosition(card.cx, card.cy);
  card.focusOutline.setSize(card.w + 14, card.h + 14);

  if (!silent) {
    const cols = scene.gridCols || 4;
    const row = Math.floor(index / cols) + 1;
    const col = (index % cols) + 1;
    const status = card.matched
      ? "emparejada"
      : card.flipped
        ? `volteada, ${card.label}`
        : "oculta";
    scene.say(`Carta fila ${row}, columna ${col}, ${status}`);
  }
}
