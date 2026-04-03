import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../a11yPanel";
import { clamp, randInt, contentLeft, getScales, fitFont, styleTextButton, getButtonPalette } from "../shared/common";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../shared/ui/endModal";
import { createPanel } from "../shared/ui/panel";
import { makeTopLeftButton, makeGridTile } from "./ui";

export class LightsGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("LightsGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
    this._keyHandler = null;
  }

  init(data) {
    this.steps = Number.isFinite(data?.steps) ? data.steps : 3;
    this.speedMs = Number.isFinite(data?.speedMs) ? data.speedMs : 650;
    this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
    this.difficulty = data?.difficulty || "easy";
  }

  create() {
    this.state = {
      startTime: Date.now(),
      round: 0,
      score: 0,
      attempts: 0,
      wrongRounds: 0,
      repeatCount: 0,
      locked: true,
      sequence: [],
      inputIndex: 0,
      focusIndex: 0,
    };

    this.endModal = null;
    this.finalResult = null;
    this.gameEnded = false;
    this.pendingTimers = [];
    this.sequenceRunId = 0;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Secuencia de luces", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);

    this.sub = this.add
      .text(0, 0, "Observa la secuencia y repítela", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cbd5e1",
      })
      .setOrigin(0, 0);

    this.stats = this.add
      .text(0, 0, "Puntos: 0 • Intentos: 0 • Ayudas: 0 • Ronda: 0/0", {
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

    this.repeatBtn = makeTopLeftButton(
      this,
      "Repetir secuencia",
      () => this.repeatSequence(),
      20,
      { width: 280, height: 56, baseFont: 18, variant: "primary" }
    );

    this.menuBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cleanupTransientState();
      stopSpeech();
      this.scene.start("LightsMenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cleanupTransientState();
      stopSpeech();
      this._onExit?.();
    });

    this.tiles = [];
    this.buildGrid();

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
        this.layoutGrid();
        this.layoutEndModal();
        this.applyFocus(this.state.focusIndex, true);
      },
    });

    this.initKeyboard();

    this.applyTheme();
    this.layout();
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

    if (this._keyHandler && this.input?.keyboard) {
      this.input.keyboard.off("keydown", this._keyHandler);
      this._keyHandler = null;
    }

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
    this.layout();
    this.layoutGrid();
    this.layoutEndModal();
    this.applyFocus(this.state.focusIndex, true);
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ts } = getScales(this);
    const hc = !!this.a11y.highContrast;

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

    this.repeatBtn.applyTheme();

    this.tiles.forEach((tile) => {
      tile.bg.setFillStyle(tile.baseColor, 1);
      tile.bg.setStrokeStyle(3, hc ? 0x000000 : theme.tileStroke, hc ? 1 : 0.20);
      tile.shine.setFillStyle(0xffffff, hc ? 0.18 : 0.10);
      tile.focus.setStrokeStyle(
        4,
        hc ? 0x000000 : 0x22c55e,
        0
      );
    });

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }

    this.updateRepeatButtonState();
  }

  layout() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);

    this.title.setPosition(left, 16 * ui);
    this.sub.setPosition(left, this.title.y + this.title.height + Math.max(4, 6 * ui));
    this.stats.setPosition(left, this.sub.y + this.sub.height + Math.max(4, 6 * ui));

    this.exitBtn.setPosition(W - 16, 16);
    this.menuBtn.setPosition(this.exitBtn.x - this.exitBtn.width - 12, 16);
  }

  buildGrid() {
    this.tiles = [];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const tile = makeGridTile(this, r, c);

        tile.hit.on("pointerover", () => {
          if (this.gameEnded) return;
          this.applyFocus(r * 3 + c, true);
          speakIfEnabled(this, tile.voiceName, {
            delayMs: 180,
            minGapMs: 420,
            rate: 0.96,
          });
        });

        tile.hit.on("pointerdown", () => {
          if (this.gameEnded) return;
          this.applyFocus(r * 3 + c, true);
          this.onTilePress(r, c);
        });

        this.tiles.push(tile);
      }
    }
  }

  layoutGrid() {
    const W = this.scale.width;
    const H = this.scale.height;
    const left = contentLeft(this);

    const ui = this.a11y.uiScale || 1;

    const baseTileW = 120 * ui;
    const baseTileH = 110 * ui;
    const baseGap = 18 * ui;
    const baseButtonH = Math.round(56 * ui);
    const baseButtonGap = Math.round(24 * ui);

    const headerBottom = this.stats.y + this.stats.height + 24 * ui;
    const availableWidth = Math.max(220, W - left - 16);
    const footerReserved = baseButtonH + baseButtonGap + 28 * ui;
    const availableHeight = Math.max(180, H - headerBottom - footerReserved);

    const totalBaseW = baseTileW * 3 + baseGap * 2;
    const totalBaseH = baseTileH * 3 + baseGap * 2;

    const fit = Math.min(1, availableWidth / totalBaseW, availableHeight / totalBaseH);

    const tileW = Math.max(74, Math.round(baseTileW * fit));
    const tileH = Math.max(68, Math.round(baseTileH * fit));
    const gap = Math.max(10, Math.round(baseGap * fit));

    const totalW = tileW * 3 + gap * 2;
    const totalH = tileH * 3 + gap * 2;

    const centerX = left + availableWidth / 2;
    const startX = centerX - totalW / 2;
    const startY = headerBottom + Math.max(0, (availableHeight - totalH) / 2);

    this.tiles.forEach((tile) => {
      const x0 = startX + tile.c * (tileW + gap);
      const y0 = startY + tile.r * (tileH + gap);
      const cx = x0 + tileW / 2;
      const cy = y0 + tileH / 2;

      tile.x0 = x0;
      tile.y0 = y0;
      tile.w = tileW;
      tile.h = tileH;
      tile.cx = cx;
      tile.cy = cy;

      tile.bg.setPosition(x0, y0).setSize(tileW, tileH);
      tile.shine.setPosition(x0, y0).setSize(tileW, Math.max(20, Math.round(tileH * 0.28)));
      tile.focus.setPosition(cx, cy).setSize(tileW + 12, tileH + 12);

      tile.hit.setPosition(x0, y0);
      tile.hit.setSize(tileW, tileH);

      if (tile.hit.input?.hitArea?.setTo) {
        tile.hit.input.hitArea.setTo(0, 0, tileW, tileH);
      }
    });

    const btnW = Math.max(220, Math.min(Math.round(totalW * 0.82), availableWidth));
    const btnCy = startY + totalH + baseButtonGap + baseButtonH / 2;

    this.repeatBtn.setSize(btnW, baseButtonH);
    this.repeatBtn.setCenter(centerX, btnCy);
  }

  initKeyboard() {
    if (!this.input?.keyboard) return;

    this._keyHandler = (e) => {
      if (e.code === "Escape") {
        if (this.gameEnded && this.endModal) return;
        this.cleanupTransientState();
        stopSpeech();
        this._onExit?.();
        return;
      }

      if (e.code === "KeyR") {
        this.repeatSequence();
        return;
      }

      if (this.state.locked || this.gameEnded) return;

      const idx = this.state.focusIndex;
      const r = Math.floor(idx / 3);
      const c = idx % 3;

      let nr = r;
      let nc = c;

      if (e.code === "ArrowLeft") nc = clamp(c - 1, 0, 2);
      if (e.code === "ArrowRight") nc = clamp(c + 1, 0, 2);
      if (e.code === "ArrowUp") nr = clamp(r - 1, 0, 2);
      if (e.code === "ArrowDown") nr = clamp(r + 1, 0, 2);

      const next = nr * 3 + nc;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
        this.applyFocus(next);
        return;
      }

      if (e.code === "Enter" || e.code === "Space") {
        const tile = this.tiles[this.state.focusIndex];
        if (tile) this.onTilePress(tile.r, tile.c);
      }
    };

    this.input.keyboard.on("keydown", this._keyHandler);
  }

  applyFocus(index, silent = false) {
    const hc = !!this.a11y.highContrast;
    const focusColor = hc ? 0x000000 : 0x22c55e;

    const prev = this.tiles[this.state.focusIndex];
    if (prev?.focus) {
      prev.focus.setPosition(prev.cx, prev.cy);
      prev.focus.setStrokeStyle(4, focusColor, 0);
    }

    this.state.focusIndex = index;

    const tile = this.tiles[index];
    if (!tile) return;

    tile.focus.setPosition(tile.cx, tile.cy);
    tile.focus.setStrokeStyle(4, focusColor, 1);

    if (!silent) {
      speakIfEnabled(this, tile.voiceName, {
        delayMs: 180,
        minGapMs: 420,
        rate: 0.96,
      });
    }
  }

  setTilesEnabled(enabled) {
    this.tiles.forEach((tile) => {
      if (enabled) {
        if (!tile.hit.input?.enabled) {
          tile.hit.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, tile.w, tile.h),
            Phaser.Geom.Rectangle.Contains
          );
          tile.hit.input.cursor = "pointer";
        }
      } else {
        tile.hit.disableInteractive();
      }
    });
  }

  updateStats() {
    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ayudas: ${this.state.repeatCount} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );
  }

  updateRepeatButtonState() {
    if (!this.repeatBtn) return;

    const canRepeat =
      !this.gameEnded &&
      !this.state.locked &&
      Array.isArray(this.state.sequence) &&
      this.state.sequence.length > 0;

    this.repeatBtn.setEnabled(canRepeat);
  }

  nextRound(isFirst = false) {
    if (this.gameEnded) return;

    this.cancelPendingTimers();
    this.sequenceRunId += 1;

    this.state.round += 1;
    this.state.attempts += 1;
    this.state.locked = true;
    this.state.inputIndex = 0;

    const sequence = [];
    let prev = null;

    for (let i = 0; i < this.steps; i++) {
      let pick;
      do {
        pick = { r: randInt(0, 2), c: randInt(0, 2) };
      } while (prev && pick.r === prev.r && pick.c === prev.c);
      sequence.push(pick);
      prev = pick;
    }

    this.state.sequence = sequence;

    this.updateStats();
    this.updateRepeatButtonState();

    speakIfEnabled(this, `Ronda ${this.state.round}. Observa la secuencia.`, {
      delayMs: 140,
      minGapMs: 420,
      rate: 0.96,
    });

    if (isFirst) {
      speakIfEnabled(
        this,
        "Usa flechas y Enter si no quieres usar mouse. Presiona R para repetir la secuencia.",
        {
          delayMs: 380,
          minGapMs: 520,
          rate: 0.94,
        }
      );
    }

    this.playSequence(this.sequenceRunId);
  }

  repeatSequence() {
    if (
      this.gameEnded ||
      this.state.locked ||
      !Array.isArray(this.state.sequence) ||
      this.state.sequence.length === 0
    ) {
      return;
    }

    this.cancelPendingTimers();
    this.sequenceRunId += 1;
    this.state.locked = true;
    this.state.inputIndex = 0;
    this.state.repeatCount += 1;

    this.updateStats();
    this.updateRepeatButtonState();

    speakIfEnabled(this, "Repitiendo la secuencia.", {
      delayMs: 120,
      minGapMs: 420,
      rate: 0.96,
    });

    this.playSequence(this.sequenceRunId);
  }

  getTile(r, c) {
    return this.tiles.find((t) => t.r === r && t.c === c);
  }

  async playSequence(runId) {
    const hc = !!this.a11y.highContrast;
    const theme = getA11yTheme(this.a11y);
    const baseStrokeColor = hc ? 0x000000 : theme.tileStroke;
    const baseStrokeAlpha = hc ? 1 : 0.20;

    this.updateRepeatButtonState();

    const okStart = await this.wait(420, runId);
    if (!okStart || this.gameEnded) return;

    for (let i = 0; i < this.state.sequence.length; i++) {
      if (!this.scene.isActive() || this.gameEnded || runId !== this.sequenceRunId) return;

      const { r, c } = this.state.sequence[i];
      const tile = this.getTile(r, c);
      if (!tile) continue;

      const voiceLeadMs = Math.max(320, tile.colorName.length * 55);
      const lightOnMs = Math.max(this.speedMs, 380);
      const lightOffMs = Math.max(240, this.speedMs * 0.35);

      speakIfEnabled(this, tile.colorName, {
        delayMs: 40,
        minGapMs: 380,
        rate: 0.96,
      });

      const okVoice = await this.wait(voiceLeadMs, runId);
      if (!okVoice || this.gameEnded) return;

      tile.bg.setFillStyle(tile.activeColor, 1);
      tile.bg.setStrokeStyle(5, hc ? 0x000000 : 0xffffff, 1);

      this.tweens.add({
        targets: [tile.bg, tile.shine, tile.focus],
        scaleX: { from: 1, to: 1.05 },
        scaleY: { from: 1, to: 1.05 },
        yoyo: true,
        duration: Math.max(180, lightOnMs * 0.35),
      });

      const okOn = await this.wait(lightOnMs, runId);
      if (!okOn || this.gameEnded) return;

      tile.bg.setFillStyle(tile.baseColor, 1);
      tile.bg.setStrokeStyle(3, baseStrokeColor, baseStrokeAlpha);

      const okOff = await this.wait(lightOffMs, runId);
      if (!okOff || this.gameEnded) return;
    }

    if (!this.scene.isActive() || this.gameEnded || runId !== this.sequenceRunId) return;

    this.state.locked = false;
    this.updateRepeatButtonState();

    speakIfEnabled(this, "Tu turno. Repite la secuencia.", {
      delayMs: 120,
      minGapMs: 420,
      rate: 0.96,
    });
  }

  onTilePress(r, c) {
    if (this.state.locked || this.gameEnded) return;

    const tile = this.getTile(r, c);
    if (!tile) return;

    const hc = !!this.a11y.highContrast;
    const theme = getA11yTheme(this.a11y);
    const baseStrokeColor = hc ? 0x000000 : theme.tileStroke;
    const baseStrokeAlpha = hc ? 1 : 0.20;

    tile.bg.setFillStyle(tile.pressColor, 1);
    tile.bg.setStrokeStyle(5, hc ? 0x000000 : 0xffffff, 1);

    this.tweens.add({
      targets: [tile.bg, tile.shine],
      scaleX: { from: 1, to: 1.03 },
      scaleY: { from: 1, to: 1.03 },
      yoyo: true,
      duration: 120,
    });

    this.schedule(160, () => {
      if (!this.scene.isActive()) return;
      tile.bg.setFillStyle(tile.baseColor, 1);
      tile.bg.setStrokeStyle(3, baseStrokeColor, baseStrokeAlpha);
    });

    speakIfEnabled(this, tile.colorName, {
      delayMs: 60,
      minGapMs: 320,
      rate: 0.96,
    });

    const expected = this.state.sequence[this.state.inputIndex];
    const ok = expected && expected.r === r && expected.c === c;

    if (!ok) {
      this.failFeedback();
      return;
    }

    this.state.inputIndex += 1;

    if (this.state.inputIndex >= this.state.sequence.length) {
      this.successFeedback();
    }
  }

  successFeedback() {
    if (this.gameEnded) return;

    this.state.locked = true;
    this.state.score += 1;
    this.updateStats();
    this.updateRepeatButtonState();

    speakIfEnabled(this, "Correcto", {
      delayMs: 80,
      minGapMs: 360,
      rate: 0.96,
    });

    this.showOverlayIcon(true);

    this.schedule(900, () => {
      if (!this.scene.isActive() || this.gameEnded) return;

      if (this.state.round >= this.roundsTotal) {
        this.finishGame();
      } else {
        this.nextRound();
      }
    });
  }

  failFeedback() {
    if (this.gameEnded) return;

    this.state.locked = true;
    this.state.wrongRounds += 1;
    this.updateRepeatButtonState();

    speakIfEnabled(this, "Incorrecto", {
      delayMs: 80,
      minGapMs: 360,
      rate: 0.96,
    });

    this.showOverlayIcon(false);

    this.tweens.add({
      targets: [this.title, this.sub, this.stats],
      x: "+=8",
      yoyo: true,
      repeat: 3,
      duration: 60,
    });

    this.schedule(1000, () => {
      if (!this.scene.isActive() || this.gameEnded) return;
      this.state.inputIndex = 0;

      speakIfEnabled(this, "Mira otra vez.", {
        delayMs: 120,
        minGapMs: 420,
        rate: 0.96,
      });

      this.sequenceRunId += 1;
      this.playSequence(this.sequenceRunId);
    });
  }

  showOverlayIcon(ok) {
    const W = this.scale.width;
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add.container(W / 2, 120 * ui).setDepth(3000);

    const panel = createPanel(
      this,
      {
        width: Math.min(560, W * 0.9),
        height: 130 * ui,
        strokeAlpha: this.a11y.highContrast ? 1 : 0.18,
        lineWidth: 2,
      }
    ).rect;

    const icon = this.add
      .text(-140 * ui, 0, ok ? "✔" : "✖", {
        fontFamily: "Arial",
        fontSize: `${fitFont(68, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    const text = this.add
      .text(40 * ui, 0, ok ? "¡Bien!" : "Intenta otra vez", {
        fontFamily: "Arial",
        fontSize: `${fitFont(ok ? 38 : 32, ts)}px`,
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
      hold: ok ? 420 : 520,
      onComplete: () => overlay.destroy(true),
    });
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

    const durationMs = Date.now() - this.state.startTime;

    let level = "MEDIUM";
    if (this.difficulty === "easy") level = "EASY";
    if (this.difficulty === "medium") level = "MEDIUM";
    if (this.difficulty === "hard") level = "HARD";

    this.finalResult = {
      game: "lights-sequence",
      score: this.state.score,
      moves: this.state.attempts,
      durationMs,
      level,
      accuracy:
        this.roundsTotal > 0
          ? Number((this.state.score / this.roundsTotal).toFixed(4))
          : 0,
      attempts: this.state.attempts,
      metadata: {
        steps: this.steps,
        speedMs: this.speedMs,
        roundsTotal: this.roundsTotal,
        wrongRounds: this.state.wrongRounds,
        repeatCount: this.state.repeatCount,
        difficulty: this.difficulty,
      },
    };

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
          stopSpeech();
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
    stopSpeech();
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

