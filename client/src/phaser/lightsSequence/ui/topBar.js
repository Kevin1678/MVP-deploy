import { contentLeft, getScales, fitFont, styleTextButton } from "../../shared/common";
import { makeTopLeftButton } from "./buttons";

export function createTopUi(scene) {
  scene.title = scene.add
    .text(0, 0, "Secuencia de luces", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    })
    .setOrigin(0, 0);

  scene.sub = scene.add
    .text(0, 0, "Observa la secuencia y repítela", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    })
    .setOrigin(0, 0);

  scene.stats = scene.add
    .text(0, 0, "Puntos: 0 • Intentos: 0 • Ayudas: 0 • Ronda: 0/0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    })
    .setOrigin(0, 0);

  scene.menuBtn = scene.add
    .text(0, 0, "Menú", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true });

  scene.exitBtn = scene.add
    .text(0, 0, "Salir", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true });

  scene.repeatBtn = makeTopLeftButton(
    scene,
    "Repetir secuencia",
    () => scene.repeatSequence(),
    20,
    { width: 280, height: 56, baseFont: 18, variant: "primary" }
  );
}

export function bindTopUiActions(scene) {
  scene.menuBtn.on("pointerdown", () => {
    if (scene.gameEnded && scene.endModal) return;
    scene.cleanupTransientState();
    scene.stopSpeechNow();
    scene.scene.start("LightsMenuScene");
  });

  scene.exitBtn.on("pointerdown", () => {
    if (scene.gameEnded && scene.endModal) return;
    scene.cleanupTransientState();
    scene.stopSpeechNow();
    scene._onExit?.();
  });
}

export function applyTopUiTheme(scene, theme) {
  const { ts } = getScales(scene);

  scene.title.setFontSize(fitFont(28, ts));
  scene.title.setColor(theme.text);

  scene.sub.setFontSize(fitFont(18, ts));
  scene.sub.setColor(theme.textMuted);

  scene.stats.setFontSize(fitFont(18, ts));
  scene.stats.setColor(theme.textMuted);

  styleTextButton(scene.menuBtn, scene, "default", 16);
  styleTextButton(scene.exitBtn, scene, "default", 16);

  scene.repeatBtn.applyTheme();
}

export function layoutTopUi(scene) {
  const W = scene.scale.width;
  const { ui } = getScales(scene);
  const left = contentLeft(scene);

  scene.title.setPosition(left, 16 * ui);
  scene.sub.setPosition(left, scene.title.y + scene.title.height + Math.max(4, 6 * ui));
  scene.stats.setPosition(left, scene.sub.y + scene.sub.height + Math.max(4, 6 * ui));

  scene.exitBtn.setPosition(W - 16, 16);
  scene.menuBtn.setPosition(scene.exitBtn.x - scene.exitBtn.width - 12, 16);
}

export function updateStats(scene) {
  scene.stats.setText(
    `Puntos: ${scene.state.score} • Intentos: ${scene.state.attempts} • Ayudas: ${scene.state.repeatCount} • Ronda: ${scene.state.round}/${scene.roundsTotal}`
  );
}

export function updateRepeatButtonState(scene) {
  if (!scene.repeatBtn) return;

  const canRepeat =
    !scene.gameEnded &&
    !scene.state.locked &&
    Array.isArray(scene.state.sequence) &&
    scene.state.sequence.length > 0;

  scene.repeatBtn.setEnabled(canRepeat);
}

export function layoutRepeatButton(scene, { centerX, startY, totalH, totalW, availableWidth, baseButtonGap, baseButtonH }) {
  const btnW = Math.max(220, Math.min(Math.round(totalW * 0.82), availableWidth));
  const btnCy = startY + totalH + baseButtonGap + baseButtonH / 2;

  scene.repeatBtn.setSize(btnW, baseButtonH);
  scene.repeatBtn.setCenter(centerX, btnCy);
}
