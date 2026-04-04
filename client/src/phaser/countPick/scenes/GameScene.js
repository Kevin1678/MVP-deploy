import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../../a11yPanel";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../../shared/ui/endModal";
import {
  createCountPickState,
  resolveRoundsTotal,
  buildFinalResult,
} from "../systems/state";
import {
  createTopUi,
  bindTopUiActions,
  applyTopUiTheme,
  layoutTopUi,
} from "../ui/topBar";
import {
  clearRound,
  setChoicesEnabled,
  setBallsEnabled,
  applyRoundTheme,
  layoutBalls,
  layoutChoices,
  setupNextRound,
} from "../systems/round";

export class CountPickGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("CountPickGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  init(data) {
    this.roundsTotal = resolveRoundsTotal(data);
  }

  resetGameState() {
    this.state = createCountPickState();
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

    createTopUi(this);
    bindTopUiActions(this);

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutBalls();
        this.layoutChoices();
        this.layoutEndModal();
      },
    });

    this.applyTheme();
    this.layoutTopUI();
    this.setupNextRound();
    this.handleResize({
      width: this.scale.width,
      height: this.scale.height,
    });

    this.stopSpeechNow();
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

    this.stopSpeechNow();
  }

  cleanupTransientState() {
    this.cancelRoundTimer();
  }

  cancelRoundTimer() {
    if (this.roundTimer) {
      try {
        this.roundTimer.remove(false);
      } catch {}
      this.roundTimer = null;
    }
  }

  stopSpeechNow() {
    stopSpeech();
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    applyTopUiTheme(this, theme);
    applyRoundTheme(this);

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }
  }

  layoutTopUI() {
    layoutTopUi(this);
  }

  layoutBalls() {
    layoutBalls(this);
  }

  layoutChoices() {
    layoutChoices(this);
  }

  setupNextRound() {
    setupNextRound(this);
    this.applyTheme();
  }

  clearRound() {
    clearRound(this);
  }

  setChoicesEnabled(enabled) {
    setChoicesEnabled(this, enabled);
  }

  setBallsEnabled(enabled) {
    setBallsEnabled(this, enabled);
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
    this.layoutTopUI();
    this.layoutBalls();
    this.layoutChoices();
    this.layoutEndModal();
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

    this.finalResult = buildFinalResult(this);

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
          this.stopSpeechNow();
          this._onExit?.();
        },
      },
    });
  }

  restartGame() {
    this.cancelRoundTimer();
    this.stopSpeechNow();
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
