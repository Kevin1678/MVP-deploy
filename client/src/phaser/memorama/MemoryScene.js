import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../a11yPanel";
import { shuffle, contentLeft, getScales, fitFont, styleTextButton } from "../shared/common";
import { SYMBOLS } from "./constants";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../shared/ui/endModal";

export class MemoryScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("MemoryScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
    this._keyHandler = null;
  }

  init(data) {
    const pairs =
      typeof data?.pairs === "number" && !Number.isNaN(data.pairs)
        ? data.pairs
        : 8;

    this.pairs = [4, 6, 8].includes(pairs) ? pairs : 8;

    this.state = {
      first: null,
      locked: false,
      attempts: 0,
      flips: 0,
      matchedPairs: 0,
      startTime: Date.now(),
    };

    this.focusIndex = 0;
  }

  create() {
    this.pendingTimers = [];
    this.endModal = null;
    this.finalResult = null;
    this.gameEnded = false;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x9eb7e5)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, `Memorama - ${this.pairs} pares`, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);

    this.attemptsText = this.add
      .text(0, 0, "Intentos: 0", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cbd5e1",
      })
      .setOrigin(0, 0);

    this.timeText = this.add
      .text(0, 0, "Tiempo: 0s", {
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
      this.cleanupTransientState();
      stopSpeech();
      this.scene.start("MenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cleanupTransientState();
      stopSpeech();
      this._onExit?.();
    });

    this.clockEvent = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const sec = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.timeText.setText(`Tiempo: ${sec}s`);
      },
    });

    const chosen = shuffle(SYMBOLS).slice(0, this.pairs);
    const values = shuffle([...chosen, ...chosen]);
    this.cards = values.map((item, idx) => this.createCard(idx, item));

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutCards();
        this.layoutEndModal();
        this.applyFocus(this.focusIndex, true);
      },
    });

    this.initKeyboard();

    this.applyTheme();
    this.layoutTopUI();
    this.layoutCards();
    this.layoutEndModal();
    this.applyFocus(0, true);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupTransientState() {
    this.cancelPendingTimers();
    this.hideEndModal();
  }

  cleanupScene() {
    this.cancelPendingTimers();
    this.hideEndModal();

    if (this.clockEvent) {
      try {
        this.clockEvent.remove(false);
      } catch {}
      this.clockEvent = null;
    }

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

  cancelPendingTimers() {
    if (!this.pendingTimers?.length) return;

    this.pendingTimers.forEach((timer) => {
      try {
        timer.remove(false);
      } catch {}
    });

    this.pendingTimers = [];
  }

  schedule(delay, callback) {
    const timer = this.time.delayedCall(delay, () => {
      this.pendingTimers = this.pendingTimers.filter((t) => t !== timer);
      callback?.();
    });
    this.pendingTimers.push(timer);
    return timer;
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
    this.layoutCards();
    this.layoutEndModal();
    this.applyFocus(this.focusIndex, true);
  }

  say(text) {
    speakIfEnabled(this, text);
  }

  applyTheme() {
    if (!this.a11y) return;
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ts } = getScales(this);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    this.title.setFontSize(fitFont(24, ts));
    this.title.setColor(theme.text);

    this.attemptsText.setFontSize(fitFont(18, ts));
    this.attemptsText.setColor(theme.textMuted);

    this.timeText.setFontSize(fitFont(18, ts));
    this.timeText.setColor(theme.textMuted);

    styleTextButton(this.menuBtn, this, "default", 16);
    styleTextButton(this.exitBtn, this, "default", 16);

    this.cards?.forEach((card) => {
      card.faceDown.clearTint();

      if (this.a11y.highContrast) {
        card.faceDown.setTint(0xffffff);
      }

      card.backBorder.setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.16
      );
      card.faceUp.setFillStyle(theme.surfaceAlt, 1);
      card.faceUp.setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.28
      );
      card.txt.setColor(theme.text);

      if (card.focusOutline) {
        card.focusOutline.setStrokeStyle(
          4,
          this.a11y.highContrast ? 0x000000 : 0x22c55e,
          1
        );
      }
    });

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }
  }

  layoutTopUI() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);

    this.title.setPosition(left, 16 * ui);
    this.attemptsText.setPosition(left, 48 * ui);
    this.timeText.setPosition(left, 72 * ui);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  initKeyboard() {
    if (!this.input?.keyboard) return;

    this._keyHandler = (e) => {
      if (e.code === "Escape") {
        stopSpeech();
        this.scene.start("MenuScene");
        return;
      }

      if (this.state.locked || this.gameEnded) return;

      const cols = this.gridCols || 4;
      const total = this.cards.length;

      const r = Math.floor(this.focusIndex / cols);
      const c = this.focusIndex % cols;

      let nr = r;
      let nc = c;

      if (e.code === "ArrowLeft") nc = Math.max(0, c - 1);
      if (e.code === "ArrowRight") nc = Math.min(cols - 1, c + 1);
      if (e.code === "ArrowUp") nr = Math.max(0, r - 1);
      if (e.code === "ArrowDown") nr = nr + 1;

      let next = nr * cols + nc;
      if (next >= total) next = total - 1;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
        this.focusIndex = next;
        this.applyFocus(this.focusIndex);
        return;
      }

      if (e.code === "Enter" || e.code === "Space") {
        const card = this.cards[this.focusIndex];
        if (card) this.onCardClick(card);
      }
    };

    this.input.keyboard.on("keydown", this._keyHandler);
  }

  applyFocus(index, silent = false) {
    this.cards.forEach((c) => c.focusOutline?.setVisible(false));
    const card = this.cards[index];
    if (!card) return;

    if (!card.focusOutline) {
      card.focusOutline = this.add
        .rectangle(card.cx, card.cy, 120, 140, 0x000000, 0)
        .setOrigin(0.5)
        .setStrokeStyle(
          4,
          this.a11y?.highContrast ? 0x000000 : 0x22c55e,
          1
        );
      card.focusOutline.setVisible(false);
    }

    card.focusOutline.setVisible(true);
    card.focusOutline.setPosition(card.cx, card.cy);
    card.focusOutline.setSize(card.w + 14, card.h + 14);

    if (!silent) {
      const cols = this.gridCols || 4;
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      const status = card.matched
        ? "emparejada"
        : card.flipped
          ? `volteada, ${card.label}`
          : "oculta";
      this.say(`Carta fila ${row}, columna ${col}, ${status}`);
    }
  }

  createCard(idx, item) {
    const faceDown = this.add.image(0, 0, "cardBack").setOrigin(0, 0);

    const backBorder = this.add
      .rectangle(0, 0, 110, 130, 0x000000, 0)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.12);

    const faceUp = this.add
      .rectangle(0, 0, 110, 130, 0xf8fafc, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x111827, 0.25);

    const txt = this.add
      .text(0, 0, item.symbol, {
        fontFamily: "Arial",
        fontSize: "52px",
        color: "#0b1020",
      })
      .setOrigin(0.5);

    const hit = this.add.zone(0, 0, 110, 130).setOrigin(0, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.setDepth(10);

    const card = {
      idx,
      value: item.symbol,
      label: item.label,
      matchKey: item.label,
      faceDown,
      backBorder,
      faceUp,
      txt,
      hit,
      flipped: false,
      matched: false,
      focusOutline: null,
      x0: 0,
      y0: 0,
      cx: 0,
      cy: 0,
      w: 110,
      h: 130,
    };

    this.setCardVisual(card, false);

    hit.on("pointerover", () => {
      if (card.matched || card.flipped || this.gameEnded) return;
      const cols = this.gridCols || 4;
      const row = Math.floor(idx / cols) + 1;
      const col = (idx % cols) + 1;
      this.say(`Carta fila ${row}, columna ${col}`);
    });

    hit.on("pointerdown", () => {
      if (this.state.locked || card.matched || card.flipped || this.gameEnded)
        return;
      this.focusIndex = idx;
      this.applyFocus(idx, true);
      this.onCardClick(card);
    });

    return card;
  }

  setCardVisual(card, isFlipped) {
    card.flipped = isFlipped;

    card.faceDown.setVisible(!isFlipped);
    card.backBorder.setVisible(!isFlipped);
    card.faceUp.setVisible(isFlipped);
    card.txt.setVisible(isFlipped);

    const alpha = card.matched ? 0.55 : 1;
    card.faceDown.setAlpha(alpha);
    card.backBorder.setAlpha(alpha);
    card.faceUp.setAlpha(alpha);
    card.txt.setAlpha(alpha);
    card.hit.setAlpha(1);
    card.focusOutline?.setAlpha(alpha);
  }

  onCardClick(card) {
    if (this.state.locked || card.matched || card.flipped || this.gameEnded)
      return;

    this.state.flips += 1;
    this.setCardVisual(card, true);
    this.say(`Figura ${card.label}`);

    if (!this.state.first) {
      this.state.first = card;
      return;
    }

    this.state.locked = true;
    this.state.attempts += 1;
    this.attemptsText.setText(`Intentos: ${this.state.attempts}`);

    const a = this.state.first;
    const b = card;

    const revealDelay = 1400;
    const hideDelay = 900;

    if (a.matchKey === b.matchKey) {
      this.schedule(revealDelay, () => {
        if (!this.scene.isActive()) return;

        a.matched = true;
        b.matched = true;
        this.setCardVisual(a, true);
        this.setCardVisual(b, true);

        this.say(`Correcto. Pareja de ${b.label}`);

        this.state.matchedPairs += 1;
        this.state.first = null;
        this.state.locked = false;

        if (this.state.matchedPairs === this.pairs) {
          this.onWin();
        }
      });
    } else {
      this.schedule(revealDelay, () => {
        if (!this.scene.isActive()) return;
        this.say(`Incorrecto. Era ${a.label} y ${b.label}`);

        this.schedule(hideDelay, () => {
          if (!this.scene.isActive()) return;
          this.setCardVisual(a, false);
          this.setCardVisual(b, false);
          this.state.first = null;
          this.state.locked = false;
          this.applyFocus(this.focusIndex, true);
        });
      });
    }
  }

  async onWin() {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.state.locked = true;
    this.cards.forEach((c) => c.hit.disableInteractive());
    this.menuBtn.disableInteractive();
    this.exitBtn.disableInteractive();

    const durationMs = Date.now() - this.state.startTime;

    let level = "MEDIUM";
    if (this.pairs === 4) level = "EASY";
    if (this.pairs === 6) level = "MEDIUM";
    if (this.pairs === 8) level = "HARD";

    this.finalResult = {
      game: "memorama",
      score: this.state.matchedPairs,
      moves: this.state.attempts,
      durationMs,
      level,
      accuracy: this.state.matchedPairs,
      attempts: this.state.attempts,
      metadata: {
        pairs: this.pairs,
        matchedPairs: this.state.matchedPairs,
        flips: this.state.flips,
      },
    };

    try {
      await this._onFinish?.(this.finalResult);
    } catch (err) {
      console.error("Error guardando resultado:", err);
    }

    this.showEndModal(this.finalResult);
    this.say("Ganaste. Selecciona jugar otra vez o salir.");
  }

  showEndModal({ durationMs, moves }) {
    if (this.endModal) return;

    const sec = Math.floor(durationMs / 1000);

    this.endModal = createEndModal(this, {
      depth: 2000,
      title: "¡Excelente!",
      bodyText: `Tiempo: ${sec}s   •   Intentos: ${moves}`,
      preferredBoxWidth: 560,
      minBoxWidth: 360,
      maxBoxWidthPct: 0.92,
      minBoxHeight: 260,
      bodyWrapMin: 220,
      titleBaseFont: 40,
      bodyBaseFont: 20,
      primaryButton: {
        label: "Jugar otra vez",
        variant: "primary",
        width: 220,
        height: 52,
        baseFont: 18,
        onClick: () => this.restartGame(),
      },
      secondaryButton: {
        label: "Salir",
        variant: "danger",
        width: 220,
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
    layoutSharedEndModal(this, this.endModal);
  }

  hideEndModal() {
    this.endModal = destroyEndModal(this.endModal);
  }

  layoutCards() {
    const W = this.scale.width;
    const H = this.scale.height;

    const { ui, ts } = getScales(this);

    const leftPad = contentLeft(this);
    const rightPad = 16;
    const topPad = Math.round(120 * ui);
    const bottomPad = 16;

    const areaW = Math.max(220, W - leftPad - rightPad);
    const areaH = Math.max(220, H - topPad - bottomPad);

    const total = this.pairs * 2;
    const cols = 4;
    const rows = Math.ceil(total / cols);
    this.gridCols = cols;

    const gap = Math.max(10, Math.round(18 * Math.min(ui, 1.15)));

    const rawCellW = Math.floor((areaW - gap * (cols - 1)) / cols);
    const rawCellH = Math.floor((areaH - gap * (rows - 1)) / rows);

    const cellW = Math.max(50, rawCellW);
    const cellH = Math.max(60, rawCellH);

    let w = Math.floor(cellW * 0.92 * ui);
    let h = Math.floor(cellH * 0.92 * ui);

    w = Math.min(w, cellW);
    h = Math.min(h, cellH);

    w = Math.max(w, 50);
    h = Math.max(h, 60);

    this.cards.forEach((card, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const cx = leftPad + c * (cellW + gap) + cellW / 2;
      const cy = topPad + r * (cellH + gap) + cellH / 2;

      const x0 = cx - w / 2;
      const y0 = cy - h / 2;

      card.x0 = x0;
      card.y0 = y0;
      card.cx = cx;
      card.cy = cy;
      card.w = w;
      card.h = h;

      card.faceDown.setPosition(x0, y0);
      card.faceDown.setDisplaySize(w, h);

      card.backBorder.setPosition(x0, y0).setSize(w, h);
      card.faceUp.setPosition(x0, y0).setSize(w, h);

      card.hit.setPosition(x0, y0);
      card.hit.setSize(w, h);
      if (card.hit.input?.hitArea?.setTo) {
        card.hit.input.hitArea.setTo(0, 0, w, h);
      }

      card.txt.setPosition(cx, cy);
      card.txt.setFontSize(
        Math.max(22, Math.floor(Math.min(w, h) * 0.42 * ts))
      );

      if (card.focusOutline) {
        card.focusOutline.setPosition(cx, cy);
        card.focusOutline.setSize(w + 14, h + 14);
      }
    });
  }
}

