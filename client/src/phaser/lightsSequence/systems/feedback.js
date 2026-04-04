import { getA11yTheme } from "../../a11yPanel";
import { getScales, fitFont } from "../../shared/common";
import { createPanel } from "../../shared/ui/panel";

export function showOverlayIcon(scene, ok) {
  const W = scene.scale.width;
  const theme = getA11yTheme(scene.a11y);
  const { ts, ui } = getScales(scene);

  const overlay = scene.add.container(W / 2, 120 * ui).setDepth(3000);

  const panel = createPanel(scene, {
    width: Math.min(560, W * 0.9),
    height: 130 * ui,
    strokeAlpha: scene.a11y.highContrast ? 1 : 0.18,
    lineWidth: 2,
  }).rect;

  const icon = scene.add
    .text(-140 * ui, 0, ok ? "✔" : "✖", {
      fontFamily: "Arial",
      fontSize: `${fitFont(68, ts)}px`,
      color: theme.text,
    })
    .setOrigin(0.5);

  const text = scene.add
    .text(40 * ui, 0, ok ? "¡Bien!" : "Intenta otra vez", {
      fontFamily: "Arial",
      fontSize: `${fitFont(ok ? 38 : 32, ts)}px`,
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
    hold: ok ? 420 : 520,
    onComplete: () => overlay.destroy(true),
  });
}
