// client/src/phaser/memorama.js
import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  A11Y_PANEL_WIDTH,
  A11Y_PANEL_GAP,
} from "./a11yPanel";

const SYMBOLS = ["★","●","▲","■","◆","❤","☀","☂","☘","♫","✿","☕"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class MenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("MenuScene");
    this._onExit = onExit;
  }

  create() {
    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    // UI
    this.title = this.add.text(0, 0, "Memorama", {
      fontFamily: "Arial",
      fontSize: "54px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.subtitle = this.add.text(0, 0, "Elige dificultad", {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    this.exitBtn = this.add.text(0, 0, "Salir", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.exitBtn.on("pointerdown", () => {
      stopSpeech();
      this._onExit?.();
    });

    // Botones dificultad (container con hit para hover/tts)
    const btns = [
      { label: "Fácil (4 pares)", pairs: 4 },
      { label: "Medio (6 pares)", pairs: 6 },
      { label: "Difícil (8 pares)", pairs: 8 },
    ];

    this.buttons = btns.map((b) => {
      const box = this.add.rectangle(0, 0, 520, 60, 0x111827, 1).setStrokeStyle(2, 0xffffff, 0.14);
      const text = this.add.text(0, 0, b.label, {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
      }).setOrigin(0.5);

      const hit = this.add.rectangle(0, 0, 520, 60, 0x000000, 0).setInteractive({ useHandCursor: true });

      const c = this.add.container(0, 0, [box, text, hit]);

      hit.on("pointerover", () => speakIfEnabled(this, b.label));
      hit.on("pointerdown", () => {
        stopSpeech();
        this.scene.start("MemoryScene", { pairs: b.pairs });
      });

      return { container: c, box, text, hit };
    });

    // Panel (izquierda) al final
    this.a11yPanel = createA11yPanel(this, { anchor: "left", onChange: () => this.applyTheme() });

    // Layout + theme
    this.applyTheme();
    this.layout();

    this.scale.on("resize", () => {
      this.layout();
      this.applyTheme();
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  layout() {
    const W = this.scale.width;
    const H = this.scale.height;

    // zona de contenido a la derecha del panel
    const left = 16 + A11Y_PANEL_WIDTH + A11Y_PANEL_GAP;
    const right = 16;
    const areaW = W - left - right;

    const centerX = left + areaW / 2;

    this.exitBtn.setPosition(W - 16, 16);

    this.title.setPosition(centerX, 90);
    this.subtitle.setPosition(centerX, 150);

    const startY = 260;
    const gap = 92;

    this.buttons.forEach((b, i) => {
      b.container.setPosition(centerX, startY + i * gap);
    });
  }

  applyTheme() {
    if (!this.a11y) return;
    try { applyA11yToScene(this, this.a11y); } catch {}

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(54 * ts));
    this.subtitle.setFontSize(Math.round(24 * ts));
    this.subtitle.setColor(hc ? "#ffffff" : "#cbd5e1");

    this.exitBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn.setFontSize(Math.round(16 * ts));

    this.buttons.forEach((b) => {
      b.box.setFillStyle(hc ? 0xffffff : 0x111827, 1);
      b.box.setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.14);
      b.text.setColor(hc ? "#000000" : "#ffffff");
      b.text.setFontSize(Math.round(26 * ts));

      b.container.setScale(ui);

      // actualiza hit a tamaño visible
      b.hit.setSize(520 * ui, 60 * ui);
    });
  }
}

class MemoryScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("MemoryScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
  }

  init(data) {
    this.pairs = data?.pairs ?? 8;
    this.state = { first: null, locked: false, attempts: 0, matchedPairs: 0, startTime: Date.now() };
    this.a11y = this.a11y || {};
  }

  create() {
    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    this.title = this.add.text(0, 0, `Memorama - ${this.pairs} pares`, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    this.attemptsText = this.add.text(0, 0, "Intentos: 0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0, 0);

    this.timeText = this.add.text(0, 0, "Tiempo: 0s", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0, 0);

    this.menuBtn = this.add.text(0, 0, "Menú", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.exitBtn = this.add.text(0, 0, "Salir", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.menuBtn.on("pointerdown", () => {
      stopSpeech();
      this.scene.start("MenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
      stopSpeech();
      this._onExit?.();
    });

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const sec = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.timeText.setText(`Tiempo: ${sec}s`);
      },
    });

    const chosen = shuffle(SYMBOLS).slice(0, this.pairs);
    const values = shuffle([...chosen, ...chosen]);
    this.cards = values.map((val, idx) => this.createCard(idx, val));

    this.initKeyboard();
    this.applyFocus(0, true);

    // Panel izquierda al final
    this.a11yPanel = createA11yPanel(this, { anchor: "left", onChange: () => this.applyTheme() });

    this.layout();
    this.applyTheme();
    this.layoutCards();

    this.scale.on("resize", () => {
      this.layout();
      this.applyTheme();
      this.layoutCards();
      this.applyFocus(this.a11y.focusIndex || 0, true);
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  say(text) {
    speakIfEnabled(this, text);
  }

  layout() {
    const W = this.scale.width;

    // texto y botones arriba en el área a la derecha del panel
    const left = 16 + A11Y_PANEL_WIDTH + A11Y_PANEL_GAP;

    this.title.setPosition(left, 16);
    this.attemptsText.setPosition(left, 48);
    this.timeText.setPosition(left, 72);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  applyTheme() {
    if (!this.a11y) return;
    try { applyA11yToScene(this, this.a11y); } catch {}

    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(24 * ts));
    this.attemptsText.setFontSize(Math.round(18 * ts));
    this.timeText.setFontSize(Math.round(18 * ts));

    this.attemptsText.setColor(hc ? "#ffffff" : "#cbd5e1");
    this.timeText.setColor(hc ? "#ffffff" : "#cbd5e1");

    const btnStyle = { color: hc ? "#000000" : "#ffffff", backgroundColor: hc ? "#ffffff" : "#111827" };
    this.menuBtn.setStyle(btnStyle);
    this.exitBtn.setStyle(btnStyle);
    this.menuBtn.setFontSize(Math.round(16 * ts));
    this.exitBtn.setFontSize(Math.round(16 * ts));

    // cartas: colores y tamaño de símbolo
    this.cards.forEach((card) => {
      card.faceDown.setFillStyle(hc ? 0x000000 : 0x111827, 1);
      card.faceDown.setStrokeStyle(2, 0xffffff, hc ? 0.9 : 0.12);

      card.faceUp.setFillStyle(hc ? 0xffffff : 0xf8fafc, 1);
      card.faceUp.setStrokeStyle(2, 0x111827, hc ? 0.9 : 0.25);

      card.txt.setColor(hc ? "#000000" : "#0b1020");
      card.txt.setFontSize(Math.round(52 * ts));
    });
  }

  initKeyboard() {
    this.input.keyboard.on("keydown", (e) => {
      if (e.code === "Escape") {
        stopSpeech();
        this.scene.start("MenuScene");
        return;
      }
      if (this.state.locked) return;

      if (e.code === "ArrowLeft") return this.moveFocus(-1, 0);
      if (e.code === "ArrowRight") return this.moveFocus(1, 0);
      if (e.code === "ArrowUp") return this.moveFocus(0, -1);
      if (e.code === "ArrowDown") return this.moveFocus(0, 1);

      if (e.code === "Enter" || e.code === "Space") {
        const card = this.cards[this.a11y.focusIndex || 0];
        if (card) this.onCardClick(card);
      }
    });
  }

  moveFocus(dx, dy) {
    const total = this.cards.length;
    if (!total) return;

    const cols = this.a11y.cols || 4;
    const rows = Math.ceil(total / cols);

    const idx = this.a11y.focusIndex || 0;
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    let nr = Phaser.Math.Clamp(r + dy, 0, rows - 1);
    let nc = Phaser.Math.Clamp(c + dx, 0, cols - 1);

    let next = nr * cols + nc;
    if (next >= total) next = total - 1;

    this.applyFocus(next);
  }

  applyFocus(index, silent = false) {
    const prev = this.cards[this.a11y.focusIndex || 0];
    if (prev?.focusOutline) prev.focusOutline.setVisible(false);

    this.a11y.focusIndex = index;
    const card = this.cards[index];
    if (!card) return;

    if (!card.focusOutline) {
      const w = 110;
      const h = 130;
      card.focusOutline = this.add.rectangle(0, 0, w + 14, h + 14, 0x000000, 0)
        .setStrokeStyle(4, 0x22c55e, 1);
      card.focusOutline.setVisible(false);
      card.container.add(card.focusOutline);
    }

    card.focusOutline.setVisible(true);

    if (!silent) {
      const cols = this.a11y.cols || 4;
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      const state = card.matched ? "completada" : card.flipped ? `abierta ${card.value}` : "cerrada";
      this.say(`Carta fila ${row}, columna ${col}. ${state}`);
    }
  }

  // HITBOX estable + re-size con escala
  createCard(idx, value) {
    const container = this.add.container(0, 0);
    const w = 110;
    const h = 130;

    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });

    const faceDown = this.add.rectangle(0, 0, w, h, 0x111827).setStrokeStyle(2, 0xffffff, 0.12);
    const faceUp = this.add.rectangle(0, 0, w, h, 0xf8fafc).setStrokeStyle(2, 0x111827, 0.25);

    const txt = this.add.text(0, 0, value, {
      fontFamily: "Arial",
      fontSize: "52px",
      color: "#0b1020",
    }).setOrigin(0.5);

    container.add([hit, faceDown, faceUp, txt]);

    const card = { idx, value, container, hit, faceDown, faceUp, txt, flipped: false, matched: false, focusOutline: null };
    this.setCardVisual(card, false);

    hit.on("pointerover", () => {
      const cols = this.a11y.cols || 4;
      const row = Math.floor(idx / cols) + 1;
      const col = (idx % cols) + 1;
      this.say(`Carta fila ${row}, columna ${col}`);
    });

    hit.on("pointerdown", () => {
      this.applyFocus(idx, true);
      this.onCardClick(card);
    });

    return card;
  }

  setCardVisual(card, isFlipped) {
    card.flipped = isFlipped;
    card.faceDown.setVisible(!isFlipped);
    card.faceUp.setVisible(isFlipped);
    card.txt.setVisible(isFlipped);
    card.container.setAlpha(card.matched ? 0.55 : 1);
  }

  onCardClick(card) {
    if (this.state.locked || card.matched || card.flipped) return;

    this.setCardVisual(card, true);
    this.say(`Figura ${card.value}`);

    if (!this.state.first) {
      this.state.first = card;
      return;
    }

    this.state.locked = true;
    this.state.attempts += 1;
    this.attemptsText.setText(`Intentos: ${this.state.attempts}`);

    const a = this.state.first;
    const b = card;

    if (a.value === b.value) {
      this.time.delayedCall(250, () => {
        a.matched = true;
        b.matched = true;
        this.setCardVisual(a, true);
        this.setCardVisual(b, true);

        this.say("Correcto");
        this.state.matchedPairs += 1;
        this.state.first = null;
        this.state.locked = false;

        if (this.state.matchedPairs === this.pairs) this.onWin();
      });
    } else {
      this.time.delayedCall(650, () => {
        this.say("Incorrecto");
        this.setCardVisual(a, false);
        this.setCardVisual(b, false);

        this.state.first = null;
        this.state.locked = false;
      });
    }
  }

  onWin() {
    this.state.locked = true;
    this.cards.forEach((c) => c.hit.disableInteractive());

    const durationMs = Date.now() - this.state.startTime;
    this.say(`Ganaste. Tiempo ${Math.floor(durationMs / 1000)} segundos. Intentos ${this.state.attempts}`);

    stopSpeech();
    this._onFinish?.({ score: this.state.matchedPairs, moves: this.state.attempts, durationMs });
  }

  layoutCards() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Área de juego a la derecha del panel
    const leftPad = 16 + A11Y_PANEL_WIDTH + A11Y_PANEL_GAP;
    const rightPad = 16;
    const topPad = 120;
    const bottomPad = 16;

    const areaW = W - leftPad - rightPad;
    const areaH = H - topPad - bottomPad;

    const totalCards = this.pairs * 2;

    // columnas adaptativas
    let cols = 4;
    if (totalCards >= 12) cols = 6;
    if (totalCards >= 16) cols = 8;
    this.a11y.cols = cols;

    const rows = Math.ceil(totalCards / cols);
    const gap = 18;

    const cardW = Math.floor((areaW - gap * (cols - 1)) / cols);
    const cardH = Math.floor((areaH - gap * (rows - 1)) / rows);

    const ui = this.a11y.uiScale || 1;

    this.cards.forEach((card, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = leftPad + c * (cardW + gap) + cardW / 2;
      const y = topPad + r * (cardH + gap) + cardH / 2;

      card.container.setPosition(x, y);

      const baseW = 110;
      const baseH = 130;
      const s = Math.min(cardW / baseW, cardH / baseH) * ui;

      card.container.setScale(s);

      // 🔧 Ajusta hitbox al tamaño visible
      card.hit.setSize(baseW * s, baseH * s);
    });
  }
}

export function createMemoramaGame(parentId, onFinish, onExit) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [new MenuScene(onExit), new MemoryScene(onFinish, onExit)],
    scale: {
      mode: Phaser.Scale.RESIZE,          // ✅ fullscreen responsive
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
  });

  return () => {
    stopSpeech();
    try { game.destroy(true); } catch {}
  };
}
