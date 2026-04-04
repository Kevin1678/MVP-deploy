import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../../a11yPanel";
import { contentLeft, getScales, fitFont, styleTextButton } from "../../shared/common";
import { makeTopLeftButton } from "../ui/buttons";
import { LIGHTS_DIFFICULTIES } from "../constants";

export class LightsMenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("LightsMenuScene");
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Secuencia de luces", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, "Elige dificultad", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    this.exitBtn = this.add
      .text(0, 0, "Salir", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#111827",
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.exitBtn.on("pointerdown", () => {
      stopSpeech();
      this._onExit?.();
    });

    this.difficultyButtons = LIGHTS_DIFFICULTIES.map((option) =>
      makeTopLeftButton(
        this,
        option.label,
        () => {
          stopSpeech();
          this.scene.start("LightsGameScene", {
            steps: option.steps,
            speedMs: option.speedMs,
            roundsTotal: option.roundsTotal,
            difficulty: option.difficulty,
          });
        },
        10,
        { width: 430, height: 60, baseFont: 24 }
      )
    );

    [this.btnEasy, this.btnMed, this.btnHard] = this.difficultyButtons;

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
      },
    });

    this.applyTheme();
    this.layout();
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupScene() {
    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    stopSpeech();
  }

  handleResize(gameSize) {
    const width = Math.max(
      320,
      Math.floor(
        gameSize?.width ??
          this.scale.gameSize?.width ??
          this.scale.width ??
          window.innerWidth
      )
    );
    const height = Math.max(
      480,
      Math.floor(
        gameSize?.height ??
          this.scale.gameSize?.height ??
          this.scale.height ??
          window.innerHeight
      )
    );

    this.cameras.resize(width, height);
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setScroll(0, 0);

    if (this.bg) {
      this.bg.setPosition(0, 0);
      this.bg.setSize(width, height);
    }

    this.applyTheme();
    this.layout();
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ui, ts } = getScales(this);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    this.title.setFontSize(fitFont(48, ts));
    this.title.setColor(theme.text);

    this.subtitle.setFontSize(fitFont(24, ts));
    this.subtitle.setColor(theme.textMuted);

    styleTextButton(this.exitBtn, this, "default", 16);

    const bw = Math.round(430 * ui);
    const bh = Math.round(60 * ui);

    this.difficultyButtons.forEach((button) => {
      button.setSize(bw, bh);
      button.applyTheme();
    });
  }

  layout() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    this.exitBtn.setPosition(W - 16, 16);

    this.title.setPosition(cx, 90 * ui);
    this.subtitle.setPosition(cx, 150 * ui);

    const gap = 92 * ui;
    const startY = 260 * ui;

    this.difficultyButtons.forEach((button, index) => {
      button.setCenter(cx, startY + index * gap);
    });
  }
}
