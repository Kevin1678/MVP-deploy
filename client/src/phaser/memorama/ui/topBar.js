import { contentLeft, getScales, fitFont, styleTextButton } from "../../shared/common";

export function createTopUi(scene) {
  scene.title = scene.add
    .text(0, 0, `Memorama - ${scene.pairs} pares`, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff",
    })
    .setOrigin(0, 0);

  scene.attemptsText = scene.add
    .text(0, 0, "Intentos: 0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    })
    .setOrigin(0, 0);

  scene.timeText = scene.add
    .text(0, 0, "Tiempo: 0s", {
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
}

export function bindTopUiActions(scene) {
  scene.menuBtn.on("pointerdown", () => {
    if (scene.gameEnded && scene.endModal) return;
    scene.cleanupTransientState();
    scene.stopSpeechNow();
    scene.scene.start("MenuScene");
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

  scene.title.setFontSize(fitFont(24, ts));
  scene.title.setColor(theme.text);

  scene.attemptsText.setFontSize(fitFont(18, ts));
  scene.attemptsText.setColor(theme.textMuted);

  scene.timeText.setFontSize(fitFont(18, ts));
  scene.timeText.setColor(theme.textMuted);

  styleTextButton(scene.menuBtn, scene, "default", 16);
  styleTextButton(scene.exitBtn, scene, "default", 16);
}

export function layoutTopUi(scene) {
  const W = scene.scale.width;
  const { ui } = getScales(scene);
  const left = contentLeft(scene);

  scene.title.setPosition(left, 16 * ui);
  scene.attemptsText.setPosition(left, 48 * ui);
  scene.timeText.setPosition(left, 72 * ui);

  scene.menuBtn.setPosition(W - 120, 16);
  scene.exitBtn.setPosition(W - 16, 16);
}
