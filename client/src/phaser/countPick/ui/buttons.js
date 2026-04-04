import Phaser from "phaser";
import { speakIfEnabled, getA11yTheme } from "../../a11yPanel";
import { createTextButton } from "../../shared/ui/button";

export function makeTopLeftButton(scene, label, onClick, depth = 10, opts = {}) {
  return createTextButton(scene, label, onClick, depth, {
    width: opts.width ?? 160,
    height: opts.height ?? 60,
    variant: opts.variant ?? "default",
    baseFont: opts.baseFont ?? 28,
    fontFamily: opts.fontFamily ?? "Arial",
    wrapMin: 120,
    textPadX: 24,
    hoverSpeak: (currentLabel) => `Botón ${currentLabel}`,
  });
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
