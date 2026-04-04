import { contentLeft, getScales, fitFont, styleTextButton } from "../../shared/common";

export function createTopUi(scene) {
  scene.title = scene.add
    .text(0, 0, "Contar y elegir", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    })
    .setOrigin(0, 0);

  scene.sub = scene.add
    .text(0, 0, "INSTRUCCIONES: Cuenta las bolitas y elige el número correcto.", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
      wordWrap: { width: 800 },
    })
    .setOrigin(0, 0);

  scene.stats = scene.add
    .text(0, 0, "Puntos: 0 • Intentos: 0 • Ronda: 0/0", {
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
    scene.scene.start("CountPickMenuScene");
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
}

export function layoutTopUi(scene) {
  const W = scene.scale.width;
  const { ui } = getScales(scene);
  const left = contentLeft(scene);

  scene.title.setPosition(left, 16 * ui);
  scene.sub.setPosition(left, 52 * ui);
  scene.sub.setWordWrapWidth(Math.max(220, W - left - 180));
  scene.stats.setPosition(left, 92 * ui);

  scene.menuBtn.setPosition(W - 120, 16);
  scene.exitBtn.setPosition(W - 16, 16);
}
