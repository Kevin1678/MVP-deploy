import Phaser from "phaser";
import { createA11yPanel } from "../../a11y/panel";
import { applyA11yToScene } from "../../a11y/effects";
import {
  createCaptionsOverlay,
  speakIfEnabled,
  stopSpeech,
} from "../../a11y/speech";
import { getA11yTheme } from "../../a11y/theme";
import {
  contentLeft,
  getScales,
  fitFont,
} from "../../shared/common";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../../shared/ui/endModal";
import {
  resolveLightsConfig,
  createLightsState,
  buildFinalResult,
} from "../systems/state";
import {
  createTopUi,
  bindTopUiActions,
  applyTopUiTheme,
  layoutTopUi,
  updateStats,
  updateRepeatButtonState,
} from "../ui/topBar";
import {
  buildGrid,
  applyGridTheme,
  layoutGrid,
  applyFocus,
  setTilesEnabled,
} from "../systems/grid";
import { initKeyboard, teardownKeyboard } from "../systems/input";
import { nextRound, repeatSequence, onTilePress } from "../systems/sequence";

function formatColorLabel(text) {
  const clean = String(text || "").trim().toLocaleLowerCase("es-MX");
  if (!clean) return "";

  return clean.charAt(0).toLocaleUpperCase("es-MX") + clean.slice(1);
}

export class LightsGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("LightsGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
    this._keyHandler = null;
    this.colorPreviewTimer = null;
    this.colorPreview = null;
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
    this.createColorPreview();

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutColorPreview();
        this.layoutGrid();
        this.layoutEndModal();
        this.applyFocus(this.state.focusIndex, true);
      },
    });

    createCaptionsOverlay(this);
    initKeyboard(this);

    this.applyTheme();
    this.layoutTopUI();
    this.layoutColorPreview();
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

  createColorPreview() {
    this.colorPreview = {
      bg: this.add
        .rectangle(0, 0, 220, 58, 0x111827, 0.96)
        .setOrigin(0.5)
        .setDepth(2500)
        .setVisible(false),

      swatch: this.add
        .rectangle(0, 0, 34, 34, 0xffffff, 1)
        .setOrigin(0.5)
        .setDepth(2501)
        .setVisible(false),

      label: this.add
        .text(0, 0, "", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5)
        .setDepth(2502)
        .setVisible(false),

      fillColor: 0xffffff,
      labelText: "",
    };
  }

  cancelColorPreviewTimer() {
    if (!this.colorPreviewTimer) return;

    try {
      this.colorPreviewTimer.remove(false);
    } catch {}

    this.colorPreviewTimer = null;
  }

  showColorPreview(colorName, fillColor, autoHideMs = 0) {
    if (!this.colorPreview) return;

    this.cancelColorPreviewTimer();

    this.colorPreview.labelText = formatColorLabel(colorName);
    this.colorPreview.fillColor = fillColor;

    this.colorPreview.label.setText(this.colorPreview.labelText);
    this.colorPreview.swatch.setFillStyle(fillColor, 1);

    this.colorPreview.bg.setVisible(true);
    this.colorPreview.swatch.setVisible(true);
    this.colorPreview.label.setVisible(true);

    this.applyColorPreviewTheme();
    this.layoutColorPreview();

    if (autoHideMs > 0) {
      this.colorPreviewTimer = this.time.delayedCall(autoHideMs, () => {
        this.colorPreviewTimer = null;
        this.hideColorPreview();
      });
    }
  }

  hideColorPreview() {
    this.cancelColorPreviewTimer();

    if (!this.colorPreview) return;

    this.colorPreview.bg.setVisible(false);
    this.colorPreview.swatch.setVisible(false);
    this.colorPreview.label.setVisible(false);
  }

  applyColorPreviewTheme() {
    if (!this.colorPreview) return;

    const theme = getA11yTheme(this.a11y || {});

    this.colorPreview.bg
      .setFillStyle(theme.surface, this.a11y?.highContrast ? 1 : 0.96)
      .setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y?.highContrast ? 1 : 0.24
      );

    this.colorPreview.label.setColor(theme.text);
    this.colorPreview.swatch.setStrokeStyle(
      2,
      theme.tileStroke,
      this.a11y?.highContrast ? 1 : 0.35
    );
    this.colorPreview.swatch.setFillStyle(
      this.colorPreview.fillColor ?? theme.primary,
      1
    );
  }

  layoutColorPreview() {
    if (!this.colorPreview) return;

    const { ui, ts } = getScales(this);
    const W = this.scale.width;
    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    const statsBottom = this.stats
      ? this.stats.y + this.stats.height
      : 108 * ui;

    const cy = statsBottom + 32 * ui;

    this.colorPreview.label.setFontSize(fitFont(24, ts));

    const swatchSize = Math.round(34 * ui);
    const gap = Math.round(14 * ui);
    const padX = Math.round(18 * ui);
    const boxH = Math.round(58 * ui);

    const textBounds = this.colorPreview.label.getBounds();
    const textW = Math.max(70, Math.ceil(textBounds.width || 0));
    const boxW = Math.max(
      Math.round(190 * ui),
      textW + swatchSize + gap + padX * 2
    );

    const leftX = cx - boxW / 2 + padX;

    this.colorPreview.bg.setPosition(cx, cy).setSize(boxW, boxH);
    this.colorPreview.swatch
      .setPosition(leftX + swatchSize / 2, cy)
      .setSize(swatchSize, swatchSize);

    this.colorPreview.label.setPosition(leftX + swatchSize + gap, cy);
  }

  cleanupTransientState() {
    this.cancelPendingTimers();
    this.sequenceRunId += 1;
    this.hideColorPreview();
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
    stopSpeech(this);
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
    this.layoutColorPreview();
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
    this.applyColorPreviewTheme();

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
    this.hideColorPreview();

    this.menuBtn.disableInteractive();
    this.exitBtn.disableInteractive();

    this.finalResult = buildFinalResult(this);

    try {
      await this._onFinish?.(this.finalResult);
    } catch (err) {
      console.error("Error guardando resultado:", err);
    }

    this.showEndModal();

    speakIfEnabled(
      this,
      "Juego terminado. Selecciona Jugar otra vez o Salir.",
      {
        delayMs: 180,
        minGapMs: 500,
        rate: 0.94,
      }
    );
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
      this.endModal.config.bodyLineSpacing = Math.round(
        10 * (this.a11y?.uiScale || 1)
      );
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
