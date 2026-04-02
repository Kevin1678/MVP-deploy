import Phaser from "phaser";
import { speakIfEnabled, getA11yTheme } from "../a11yPanel";
import { getScales, fitFont, getButtonPalette } from "../shared/common";

export function makeTopLeftButton(scene, label, onClick, depth = 10, opts = {}) {
  let w = opts.width ?? 160;
  let h = opts.height ?? 60;
  let x0 = 0;
  let y0 = 0;
  let enabled = true;
  let variant = opts.variant ?? "default";
  let baseFont = opts.baseFont ?? 28;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14)
    .setDepth(depth);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, label, {
      fontFamily: "Arial",
      fontSize: `${baseFont}px`,
      color: "#ffffff",
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => {
    if (!enabled) return;
    speakIfEnabled(scene, `Botón ${label}`);
  });

  hit.on("pointerdown", () => {
    if (!enabled) return;
    onClick?.();
  });

  function applyCurrentTheme() {
    const palette = getButtonPalette(scene, variant);
    const { ts } = getScales(scene);

    box.setFillStyle(palette.fill, 1);
    box.setStrokeStyle(2, palette.strokeColor, palette.strokeAlpha);
    text.setColor(palette.textColor);
    text.setFontSize(fitFont(baseFont, ts));
  }

  return {
    box,
    text,
    hit,

    setLabel(next) {
      label = next;
      text.setText(next);
    },

    setVariant(nextVariant) {
      variant = nextVariant;
      applyCurrentTheme();
    },

    setTL(nx, ny) {
      x0 = nx;
      y0 = ny;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(x0 + w / 2, y0 + h / 2);
    },

    setCenter(cx, cy) {
      x0 = cx - w / 2;
      y0 = cy - h / 2;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(cx, cy);
    },

    setSize(nw, nh) {
      w = nw;
      h = nh;
      box.setSize(w, h);
      hit.setSize(w, h);

      if (hit.input?.hitArea?.setTo) {
        hit.input.hitArea.setTo(0, 0, w, h);
      }

      text.setPosition(x0 + w / 2, y0 + h / 2);
    },

    setTheme({
      fill,
      strokeAlpha,
      textColor,
      fontSize,
      strokeColor = 0xffffff,
    }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, strokeColor, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
    },

    applyTheme() {
      applyCurrentTheme();
    },

    setVisible(v) {
      box.setVisible(v);
      text.setVisible(v);
      hit.setVisible(v);
    },

    setEnabled(v) {
      enabled = !!v;
      if (enabled) {
        if (!hit.input) hit.setInteractive({ useHandCursor: true });
      } else {
        hit.disableInteractive();
      }
      box.setAlpha(enabled ? 1 : 0.55);
      text.setAlpha(enabled ? 1 : 0.55);
    },

    setDepth(nextDepth) {
      box.setDepth(nextDepth);
      text.setDepth(nextDepth + 1);
      hit.setDepth(nextDepth + 2);
    },

    destroy() {
      box.destroy();
      text.destroy();
      hit.destroy();
    },
  };
}

export function makeBall(scene, x, y, r, hc = false, index = 0) {
  const theme = getA11yTheme(scene.a11y || {});
  const fill = hc ? 0xffffff : theme.primary;
  const face = hc ? 0x000000 : theme.sceneBg;
  const stroke = hc ? 0x000000 : theme.tileStroke;

  const ball = scene.add
    .circle(0, 0, r, fill, 1)
    .setStrokeStyle(Math.max(2, r * 0.1), stroke, 1);

  const shine = scene.add.circle(
    -r * 0.28,
    -r * 0.28,
    r * 0.42,
    0xffffff,
    hc ? 0.28 : 0.18
  );

  const eyes = scene.add.graphics();
  eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  eyes.beginPath();
  eyes.arc(
    0,
    r * 0.14,
    r * 0.18,
    Phaser.Math.DegToRad(20),
    Phaser.Math.DegToRad(160)
  );
  eyes.strokePath();

  const container = scene.add.container(x, y, [ball, shine, eyes]);

  const announceBall = () => {
    speakIfEnabled(scene, `Bolita número ${index + 1}`);
  };

  ball.setInteractive(
    new Phaser.Geom.Circle(r, r, r * 1.05),
    Phaser.Geom.Circle.Contains
  );

  ball.on("pointerover", announceBall);
  ball.on("pointerdown", announceBall);

  return { container, ball, shine, eyes, r };
}

export function recolorBall(parts, scene, r, hc = false) {
  const theme = getA11yTheme(scene.a11y || {});
  const fill = hc ? 0xffffff : theme.primary;
  const face = hc ? 0x000000 : theme.sceneBg;
  const stroke = hc ? 0x000000 : theme.tileStroke;

  parts.ball.setRadius(r);
  parts.ball.setFillStyle(fill, 1);
  parts.ball.setStrokeStyle(Math.max(2, r * 0.1), stroke, 1);

  parts.shine.setPosition(-r * 0.28, -r * 0.28);
  parts.shine.setRadius(r * 0.42);
  parts.shine.setFillStyle(0xffffff, hc ? 0.28 : 0.18);

  parts.eyes.clear();
  parts.eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  parts.eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.beginPath();
  parts.eyes.arc(
    0,
    r * 0.14,
    r * 0.18,
    Phaser.Math.DegToRad(20),
    Phaser.Math.DegToRad(160)
  );
  parts.eyes.strokePath();

  if (parts.ball.input?.hitArea?.setTo) {
    parts.ball.input.hitArea.setTo(r, r, r * 1.05);
  } else {
    parts.ball.setInteractive(
      new Phaser.Geom.Circle(r, r, r * 1.05),
      Phaser.Geom.Circle.Contains
    );
  }
}
