import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../a11yPanel";
import { randInt, shuffle, contentLeft, getScales, fitFont, styleTextButton, getButtonPalette } from "../shared/common";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../shared/ui/endModal";
import { createPanel } from "../shared/ui/panel";
import { makeTopLeftButton, makeBall, recolorBall } from "./ui";

export class CountPickGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("CountPickGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  init(data) {
    this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
  }

  resetGameState() {
    this.state = {
      startTime: Date.now(),
      round: 0,
      score: 0,
      attempts: 0,
      wrongAnswers: 0,
      target: 0,
      locked: false,
    };
  }

  create() {
    this.resetGameState();

    this.ballParts = [];
    this.choiceButtons = [];
    this.endModal = null;
    this.finalResult = null;
    this.roundTimer = null;
    this.gameEnded = false;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Contar y elegir", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);

    this.sub = this.add
      .text(
        0,
        0,
        "INSTRUCCIONES: Cuenta las bolitas y elige el número correcto.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
          wordWrap: { width: 800 },
        }
      )
      .setOrigin(0, 0);

    this.stats = this.add
      .text(0, 0, "Puntos: 0 • Intentos: 0 • Ronda: 0/0", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cbd5e1",
      })
      .setOrigin(0, 0);

    this.menuBtn = this.add
      .text(0, 0, "Menú", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#111827",
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

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

    this.menuBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cancelRoundTimer();
      stopSpeech();
      this.scene.start("CountPickMenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cancelRoundTimer();
      stopSpeech();
      this._onExit?.();
    });

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
        this.layoutBalls();
        this.layoutChoices();
        this.layoutEndModal();
      },
    });

    this.applyTheme();
    this.layout();
    this.nextRound();
    this.handleResize({
      width: this.scale.width,
      height: this.scale.height,
    });

    stopSpeech();
    speakIfEnabled(
      this,
      "INSTRUCCIONES: Cuenta las bolitas y elige el número correcto."
    );

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupScene() {
    this.cancelRoundTimer();

    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    stopSpeech();
  }

  cancelRoundTimer() {
    if (this.roundTimer) {
      try {
        this.roundTimer.remove(false);
      } catch {}
      this.roundTimer = null;
    }
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
    this.layoutBalls();
    this.layoutChoices();
    this.layoutEndModal();
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ui, ts } = getScales(this);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    this.title.setFontSize(fitFont(28, ts));
    this.title.setColor(theme.text);

    this.sub.setFontSize(fitFont(18, ts));
    this.sub.setColor(theme.textMuted);

    this.stats.setFontSize(fitFont(18, ts));
    this.stats.setColor(theme.textMuted);

    styleTextButton(this.menuBtn, this, "default", 16);
    styleTextButton(this.exitBtn, this, "default", 16);

    const choiceFont = fitFont(28, ts);
    this.choiceButtons.forEach((b) => {
      const palette = getButtonPalette(this, "default");
      b.setTheme({
        fill: palette.fill,
        strokeColor: palette.strokeColor,
        strokeAlpha: palette.strokeAlpha,
        textColor: palette.textColor,
        fontSize: choiceFont,
      });
    });

    const r = Math.round(28 * ui);
    this.ballParts.forEach((p) => recolorBall(p, this, r, !!this.a11y.highContrast));

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }
  }

  layout() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);

    this.title.setPosition(left, 16 * ui);
    this.sub.setPosition(left, 52 * ui);
    this.sub.setWordWrapWidth(Math.max(220, W - left - 180));
    this.stats.setPosition(left, 92 * ui);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  clearRound() {
    this.ballParts.forEach((p) => p.container.destroy(true));
    this.ballParts = [];

    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];
  }

  setChoicesEnabled(enabled) {
    this.choiceButtons.forEach((b) => b.setEnabled(enabled));
  }

  setBallsEnabled(enabled) {
    this.ballParts.forEach((p) => {
      if (!p.ball) return;

      if (enabled) {
        if (!p.ball.input) {
          const r = p.ball.radius || p.r || 28;
          p.ball.setInteractive(
            new Phaser.Geom.Circle(r, r, r * 1.05),
            Phaser.Geom.Circle.Contains
          );
        }
      } else {
        p.ball.disableInteractive();
      }
    });
  }

  nextRound() {
    if (this.gameEnded) return;

    this.cancelRoundTimer();
    this.clearRound();

    this.state.round += 1;
    this.state.locked = false;
    this.state.target = randInt(1, 5);

    const options = new Set([this.state.target]);
    while (options.size < 3) options.add(randInt(1, 5));
    const choices = shuffle(Array.from(options));

    const { ui } = getScales(this);
    const r = Math.round(28 * ui);

    for (let i = 0; i < this.state.target; i++) {
      const parts = makeBall(this, 0, 0, r, !!this.a11y.highContrast, i);
      this.ballParts.push(parts);
    }

    choices.forEach((n) => {
      const btn = makeTopLeftButton(
        this,
        String(n),
        () => this.pickAnswer(n),
        10,
        { width: 150, height: 62, baseFont: 28 }
      );
      this.choiceButtons.push(btn);
    });

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.applyTheme();
    this.layoutBalls();
    this.layoutChoices();
  }

  layoutBalls() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const { ui } = getScales(this);
    const r = Math.round(28 * ui);

    const topY = 180 * ui;
    const cols = 3;
    const gapX = 28 * ui;
    const gapY = 36 * ui;
    const cellW = 110 * ui;
    const cellH = 110 * ui;

    const contentW = cols * cellW + (cols - 1) * gapX;
    const startX = left + Math.max(0, (W - left - 16 - contentW) / 2);

    this.ballParts.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = startX + col * (cellW + gapX) + cellW / 2;
      const y = topY + row * (cellH + gapY) + cellH / 2;

      recolorBall(p, this, r, !!this.a11y.highContrast);
      p.container.setPosition(x, y);
    });
  }

  layoutChoices() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const H = this.scale.height;

    const { ui } = getScales(this);
    const btnW = Math.round(150 * ui);
    const btnH = Math.round(62 * ui);
    const gap = Math.round(18 * ui);

    const totalW =
      this.choiceButtons.length * btnW +
      (this.choiceButtons.length - 1) * gap;
    const startX = left + Math.max(0, (W - left - 16 - totalW) / 2);
    const y = H - 120 * ui;

    this.choiceButtons.forEach((b, i) => {
      b.setSize(btnW, btnH);
      b.setTL(startX + i * (btnW + gap), y);
    });
  }

  animateCorrect() {
    const W = this.scale.width;
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add.container(W / 2, 120 * ui).setDepth(3000);

    const panel = createPanel(
      this,
      {
        width: Math.min(520, W * 0.82),
        height: 110 * ui,
        strokeAlpha: this.a11y.highContrast ? 1 : 0.18,
        lineWidth: 2,
      }
    ).rect;

    const icon = this.add
      .text(-120 * ui, 0, "✔", {
        fontFamily: "Arial",
        fontSize: `${fitFont(70, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    const text = this.add
      .text(40 * ui, 0, "¡Bien hecho!", {
        fontFamily: "Arial",
        fontSize: `${fitFont(36, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    overlay.add([panel, icon, text]);
    overlay.setAlpha(0);

    this.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1.03 },
      duration: 160,
      yoyo: true,
      hold: 480,
      onComplete: () => overlay.destroy(true),
    });
  }

  animateWrong() {
    const W = this.scale.width;
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add.container(W / 2, 120 * ui).setDepth(3000);

    const panel = createPanel(
      this,
      {
        width: Math.min(560, W * 0.86),
        height: 120 * ui,
        strokeAlpha: this.a11y.highContrast ? 1 : 0.18,
        lineWidth: 2,
      }
    ).rect;

    const icon = this.add
      .text(-140 * ui, 0, "✖", {
        fontFamily: "Arial",
        fontSize: `${fitFont(64, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    const text = this.add
      .text(36 * ui, 0, "Intenta otra vez", {
        fontFamily: "Arial",
        fontSize: `${fitFont(32, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    overlay.add([panel, icon, text]);
    overlay.setAlpha(0);

    this.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 1 },
      duration: 140,
      yoyo: true,
      hold: 520,
      onComplete: () => overlay.destroy(true),
    });
  }

  pickAnswer(value) {
    if (this.state.locked || this.gameEnded) return;

    this.state.locked = true;
    this.state.attempts += 1;
    this.setChoicesEnabled(false);

    const ok = value === this.state.target;

    if (ok) {
      this.state.score += 1;
      this.animateCorrect();
      speakIfEnabled(this, "Correcto");
    } else {
      this.state.wrongAnswers += 1;
      this.animateWrong();
      speakIfEnabled(this, `Incorrecto. Eran ${this.state.target}`);
    }

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.roundTimer = this.time.delayedCall(1200, () => {
      this.roundTimer = null;

      if (!this.scene.isActive()) return;

      if (this.state.round >= this.roundsTotal) {
        this.finishGame();
      } else {
        this.nextRound();
      }
    });
  }

  async finishGame() {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.state.locked = true;

    this.cancelRoundTimer();
    this.setChoicesEnabled(false);
    this.setBallsEnabled(false);

    this.menuBtn.disableInteractive();
    this.exitBtn.disableInteractive();

    const durationMs = Date.now() - this.state.startTime;

    let level = "MEDIUM";
    if (this.roundsTotal === 5) level = "EASY";
    if (this.roundsTotal === 10) level = "MEDIUM";
    if (this.roundsTotal === 15) level = "HARD";

    this.finalResult = {
      game: "countPick",
      score: this.state.score,
      moves: this.state.attempts,
      durationMs,
      level,
      accuracy: this.state.score,
      attempts: this.state.attempts,
      metadata: {
        roundsTotal: this.roundsTotal,
        correctAnswers: this.state.score,
        wrongAnswers: this.state.wrongAnswers,
      },
    };

    try {
      await this._onFinish?.(this.finalResult);
    } catch (err) {
      console.error("Error guardando resultado:", err);
    }

    this.showEndModal();
    speakIfEnabled(this, "Juego terminado. Selecciona Jugar otra vez o Salir.");
  }

  showEndModal() {
    if (this.endModal) return;

    this.endModal = createEndModal(this, {
      depth: 4000,
      title: "¡Terminaste!",
      bodyText: `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}`,
      preferredBoxWidth: 560,
      minBoxWidth: 340,
      maxBoxWidthPct: 0.92,
      minBoxHeight: 250,
      bodyWrapMin: 180,
      titleBaseFont: 38,
      bodyBaseFont: 20,
      primaryButton: {
        label: "Jugar otra vez",
        variant: "primary",
        width: 210,
        height: 52,
        baseFont: 18,
        onClick: () => this.restartGame(),
      },
      secondaryButton: {
        label: "Salir",
        variant: "danger",
        width: 170,
        height: 52,
        baseFont: 18,
        onClick: () => {
          this.hideEndModal();
          stopSpeech();
          this._onExit?.();
        },
      },
    });
  }

  restartGame() {
    this.cancelRoundTimer();
    stopSpeech();
    this.hideEndModal();
    this.clearRound();
    this.finalResult = null;
    this.gameEnded = false;
    this.scene.restart({ roundsTotal: this.roundsTotal });
  }

  layoutEndModal() {
    layoutSharedEndModal(this, this.endModal);
  }

  hideEndModal() {
    this.endModal = destroyEndModal(this.endModal);
  }
}

