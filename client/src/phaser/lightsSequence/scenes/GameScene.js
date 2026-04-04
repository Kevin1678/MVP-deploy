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
import { resolveLightsConfig, createLightsState, buildFinalResult } from "../systems/state";
import {
  createTopUi,
  bindTopUiActions,
  applyTopUiTheme,
  layoutTopUi,
  updateStats,
  updateRepeatButtonState,
} from "../ui/topBar";
import { buildGrid, applyGridTheme, layoutGrid, applyFocus, setTilesEnabled } from "../systems/grid";
import { initKeyboard, teardownKeyboard } from "../systems/input";
import { nextRound, repeatSequence, onTilePress } from "../systems/sequence";

export class LightsGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("LightsGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
    this._keyHandler = null;
  }

  init(data) {
    const config = resolveLightsConfig(data);
    this.steps = config.steps;
    this.speedMs = config.speedMs;
    this.roundsTotal = config.roundsTotal;
    this.difficulty = config.difficulty;
    this.state = createLightsState();
  }

  create() {
    this.endModal = null;
    this.finalResult = null;
    this.gameEnded = false;
    this.pendingTimers = [];
    this.sequenceRunId = 0;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    createTopUi(this);
    bindTopUiActions(this);
    buildGrid(this);

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutGrid();
        this.layoutEndModal();
        this.applyFocus(this.state.focusIndex, true);
      },
    });

    initKeyboard(this);

    this.applyTheme();
    this.layoutTopUI();
    this.layoutGrid();
    this.applyFocus(0, true);
    this.updateStats();
    this.updateRepeatButtonState();
    this.nextRound(true);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupTransientState() {
    this.cancelPendingTimers();
    this.sequenceRunId += 1;
    this.hideEndModal();
  }

  cleanupScene() {
    this.cleanupTransientState();

    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    teardownKeyboard(this);
    this.stopSpeechNow();
  }

  stopSpeechNow() {
    stopSpeech();
  }

  schedule(delay, callback) {
    const timer = this.time.delayedCall(delay, () => {
      this.pendingTimers = this.pendingTimers.filter((t) => t !== timer);
      callback?.();
    });
    this.pendingTimers.push(timer);
    return timer;
  }

  wait(delay, runId) {
    return new Promise((resolve) => {
      this.schedule(delay, () => {
        if (!this.scene.isActive() || runId !== this.sequenceRunId) {
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  cancelPendingTimers() {
    if (!this.pendingTimers?.length) return;

    this.pendingTimers.forEach((timer) => {
      try {
        timer.remove(false);
      } catch {}
    });

    this.pendingTimers = [];
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
    this.layoutGrid();
    this.layoutEndModal();
    this.applyFocus(this.state.focusIndex, true);
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    applyTopUiTheme(this, theme);
    applyGridTheme(this, theme);

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }

    this.updateRepeatButtonState();
  }

  layoutTopUI() {
    layoutTopUi(this);
  }

  layoutGrid() {
    layoutGrid(this);
  }

  updateStats() {
    updateStats(this);
  }

  updateRepeatButtonState() {
    updateRepeatButtonState(this);
  }

  applyFocus(index, silent = false) {
    applyFocus(this, index, silent);
  }

  setTilesEnabled(enabled) {
    setTilesEnabled(this, enabled);
  }

  nextRound(isFirst = false) {
    nextRound(this, isFirst);
  }

  repeatSequence() {
    repeatSequence(this);
  }

  onTilePress(r, c) {
    onTilePress(this, r, c);
  }

  async finishGame() {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.state.locked = true;

    this.cancelPendingTimers();
    this.sequenceRunId += 1;
    this.setTilesEnabled(false);
    this.updateRepeatButtonState();

    this.menuBtn.disableInteractive();
    this.exitBtn.disableInteractive();

    this.finalResult = buildFinalResult(this);

    try {
      await this._onFinish?.(this.finalResult);
    } catch (err) {
      console.error("Error guardando resultado:", err);
    }

    this.showEndModal();

    speakIfEnabled(this, "Juego terminado. Selecciona Jugar otra vez o Salir.", {
      delayMs: 180,
      minGapMs: 500,
      rate: 0.94,
    });
  }

  showEndModal() {
    if (this.endModal) return;

    this.endModal = createEndModal(this, {
      depth: 4000,
      title: "¡Terminaste!",
      bodyLines: [
        `Puntos: ${this.state.score}`,
        `Errores: ${this.state.wrongRounds}`,
        `Ayudas usadas: ${this.state.repeatCount}`,
      ],
      preferredBoxWidth: 600,
      minBoxWidth: 360,
      maxBoxWidthPct: 0.92,
      minBoxHeight: 300,
      bodyWrapMin: 220,
      titleBaseFont: 38,
      bodyBaseFont: 20,
      bodyAlign: "center",
      bodyLineSpacing: Math.round(10 * (this.a11y?.uiScale || 1)),
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

  layoutEndModal() {
    if (this.endModal) {
      this.endModal.config.bodyLineSpacing = Math.round(10 * (this.a11y?.uiScale || 1));
    }
    layoutSharedEndModal(this, this.endModal);
  }

  hideEndModal() {
    this.endModal = destroyEndModal(this.endModal);
  }

  restartGame() {
    this.cleanupTransientState();
    this.stopSpeechNow();
    this.finalResult = null;
    this.gameEnded = false;

    this.scene.restart({
      steps: this.steps,
      speedMs: this.speedMs,
      roundsTotal: this.roundsTotal,
      difficulty: this.difficulty,
    });
  }
}
