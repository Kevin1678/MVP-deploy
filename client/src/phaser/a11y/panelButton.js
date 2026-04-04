export function createA11yPanelButton(scene, x, y, w, h, label, onClick) {
  const box = scene.add.rectangle(x, y, w, h, 0x111827, 1).setOrigin(0, 0);
  box.setStrokeStyle(2, 0xffffff, 0.16);

  const text = scene.add
    .text(x + w / 2, y + h / 2, label, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
    })
    .setOrigin(0.5);

  const hit = scene.add.zone(x, y, w, h).setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });
  hit.on("pointerdown", onClick);

  return {
    box,
    text,
    hit,
    setLabel(nextLabel) {
      text.setText(nextLabel);
    },
    setVisible(v) {
      box.setVisible(v);
      text.setVisible(v);
      hit.setVisible(v);
    },
    setStyle(fill, textColor, strokeAlpha) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, 0xffffff, strokeAlpha);
      text.setColor(textColor);
    },
    setPos(nx, ny) {
      box.setPosition(nx, ny);
      text.setPosition(nx + w / 2, ny + h / 2);
      hit.setPosition(nx, ny);
    },
    setSize(nw, nh) {
      w = nw;
      h = nh;
      box.setSize(w, h);
      hit.setSize(w, h);
      text.setPosition(box.x + w / 2, box.y + h / 2);
    },
    destroy() {
      box.destroy();
      text.destroy();
      hit.destroy();
    },
  };
}
