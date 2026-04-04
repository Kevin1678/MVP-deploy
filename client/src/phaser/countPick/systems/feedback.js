import { getA11yTheme } from "../../a11yPanel";
import { getScales, fitFont } from "../../shared/common";
import { createPanel } from "../../shared/ui/panel";

export function showCorrectFeedback(scene) {
  const W = scene.scale.width;
  const theme = getA11yTheme(scene.a11y);
  const { ts, ui } = getScales(scene);

  const overlay = scene.add.container(W / 2, 120 * ui).setDepth(3000);

  const panel = createPanel(scene, {
    width: Math.min(520, W * 0.82),
    height: 110 * ui,
    strokeAlpha: scene.a11y.highContrast ? 1 : 0.18,
    lineWidth: 2,
  }).rect;

  const icon = scene.add
    .text(-120 * ui, 0, "✔", {
      fontFamily: "Arial",
      fontSize: `${fitFont(70, ts)}px`,
      color: theme.text,
    })
    .setOrigin(0.5);

  const text = scene.add
    .text(40 * ui, 0, "¡Bien hecho!", {
      fontFamily: "Arial",
      fontSize: `${fitFont(36, ts)}px`,
      color: theme.text,
    })
    .setOrigin(0.5);

  overlay.add([panel, icon, text]);
  overlay.setAlpha(0);

  scene.tweens.add({
    targets: overlay,
    alpha: { from: 0, to: 1 },
    scale: { from: 0.9, to: 1.03 },
    duration: 160,
    yoyo: true,
    hold: 480,
    onComplete: () => overlay.destroy(true),
  });
}

export function showWrongFeedback(scene) {
  const W = scene.scale.width;
  const theme = getA11yTheme(scene.a11y);
  const { ts, ui } = getScales(scene);

  const overlay = scene.add.container(W / 2, 120 * ui).setDepth(3000);

  const panel = createPanel(scene, {
    width: Math.min(560, W * 0.86),
    height: 120 * ui,
    strokeAlpha: scene.a11y.highContrast ? 1 : 0.18,
    lineWidth: 2,
  }).rect;

  const icon = scene.add
    .text(-140 * ui, 0, "✖", {
      fontFamily: "Arial",
      fontSize: `${fitFont(64, ts)}px`,
      color: theme.text,
    })
    .setOrigin(0.5);

  const text = scene.add
    .text(36 * ui, 0, "Intenta otra vez", {
      fontFamily: "Arial",
      fontSize: `${fitFont(32, ts)}px`,
      color: theme.text,
    })
    .setOrigin(0.5);

  overlay.add([panel, icon, text]);
  overlay.setAlpha(0);

  scene.tweens.add({
    targets: overlay,
    alpha: { from: 0, to: 1 },
    duration: 140,
    yoyo: true,
    hold: 520,
    onComplete: () => overlay.destroy(true),
  });
}
