// client/src/phaser/memorama.js
import Phaser from "phaser";
import { createA11yPanel, applyA11yToScene, speakIfEnabled, stopSpeech } from "./a11yPanel";

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

    this.title = this.add.text(this.scale.width / 2, 70, "Memorama", {
      fontFamily: "Arial",
      fontSize: "44px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.subtitle = this.add.text(this.scale.width / 2, 125, "Elige dificultad", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    this.exitBtn = this.add.text(this.scale.width - 110, 18, "Salir", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    this.exitBtn.on("pointerdown", () => {
      stopSpeech();
      this._onExit?.();
    });

    const btns = [
      { label: "Fácil (4 pares)", pairs: 4 },
      { label: "Medio (6 pares)", pairs: 6 },
      { label: "Difícil (8 pares)", pairs: 8 },
    ];

    const startY = 230;
    const gap = 78;

    this.buttons = btns.map((b, i) => {
      const y = startY + i * gap;
      const w = Math.min(520, this.scale.width * 0.65); // un poco menos por el panel
      const h = 56;

      const box = this.add.rectangle(0, 0, w, h, 0x111827).setStrokeStyle(2, 0xffffff, 0.12);
      const text = this.add.text(0, 0, b.label, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
      }).setOrigin(0.5);

      const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });

      const c = this.add.container(this.scale.width / 2, y, [box, text, hit]);

      hit.on("pointerover", () => speakIfEnabled(this, b.label));
      hit.on("pointerdown", () => {
        stopSpeech();
        this.scene.start("MemoryScene", { pairs: b.pairs });
      });

      return { container: c, box, text, hit, pairs: b.pairs, label: b.label };
    });

    // Panel al final, lado izquierdo
    this.a11yPanel = createA11yPanel(this, { anchor: "left", onChange: () => this.applyTheme() });

    this.applyTheme();

    this.scale.on("resize", (gs) => {
      this.bg.setSize(gs.width, gs.height);
      this.title.setPosition(gs.width / 2, 70);
      this.subtitle.setPosition(gs.width / 2, 125);
      this.exitBtn.setPosition(gs.width - 110, 18);

      this.buttons.forEach((btn, i) => {
        const y = startY + i * gap;
        btn.container.setPosition(gs.width / 2, y);
      });

      this.applyTheme();
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  applyTheme() {
    if (!this.a11y) return;
    try { applyA11yToScene(this, this.a11y); } catch {}

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

    this.bg?.setFillStyle?.(hc ? 0x000000 : 0x0b1020, 1);

    this.title?.setFontSize?.(Math.round(44 * ts));
    this.subtitle?.setFontSize?.(Math.round(22 * ts));
    this.subtitle?.setColor?.(hc ? "#ffffff" : "#cbd5e1");

    this.exitBtn?.setStyle?.({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn?.setFontSize?.(Math.round(16 * ts));

    // Escala de UI aplicada a contenedores (botones), hitbox se mueve con el container
    this.buttons.forEach((b) => {
      b.box?.setFillStyle?.(hc ? 0xffffff : 0x111827, 1);
      b.box?.setStrokeStyle?.(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.12);
      b.text?.setColor?.(hc ? "#000000" : "#ffffff");
      b.text?.setFontSize?.(Math.round(22 * ts));

      b.container?.setScale?.(ui);
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

    this.title = this.add.text(24, 18, `Memorama - ${this.pairs} pares`, {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
    });

    this.attemptsText = this.add.text(24, 48, "Intentos: 0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    });

    this.timeText = this.add.text(24, 72, "Tiempo: 0s", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    });

    this.backBtn = this.add.text(this.scale.width - 140, 18, "Menú", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    this.backBtn.on("pointerdown", () => {
      stopSpeech();
      this.scene.start("MenuScene");
    });

    this.exitBtn = this.add.text(this.scale.width - 110, 62, "Salir", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

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

    // Cartas
    const chosen = shuffle(SYMBOLS).slice(0, this.pairs);
    const values = shuffle([...chosen, ...chosen]);
    this.cards = values.map((val, idx) => this.createCard(idx, val));

    this.layoutCards();
    this.initKeyboard();
    this.applyFocus(0, true);

    // Panel izquierda al final
    this.a11yPanel = createA11yPanel(this, { anchor: "left", onChange: () => this.applyTheme() });

    this.applyTheme();

    this.scale.on("resize", (gs) => {
      this.bg.setSize(gs.width, gs.height);
      this.backBtn.setPosition(gs.width - 140, 18);
      this.exitBtn.setPosition(gs.width - 110, 62);
      this.layoutCards();
      this.applyTheme();
      this.applyFocus(this.a11y.focusIndex || 0, true);
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  say(text) {
    speakIfEnabled(this, text);
  }

  // ✅ applyTheme sin escalar cartas (escala solo en layoutCards)
  applyTheme() {
    if (!this.a11y) return;
    try { applyA11yToScene(this, this.a11y); } catch {}

    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    this.bg?.setFillStyle?.(hc ? 0x000000 : 0x0b1020, 1);

    this.title?.setFontSize?.(Math.round(22 * ts));
    this.attemptsText?.setFontSize?.(Math.round(18 * ts));
    this.timeText?.setFontSize?.(Math.round(18 * ts));

    this.attemptsText?.setColor?.(hc ? "#ffffff" : "#cbd5e1");
    this.timeText?.setColor?.(hc ? "#ffffff" : "#cbd5e1");

    const btnStyle = { color: hc ? "#000000" : "#ffffff", backgroundColor: hc ? "#ffffff" : "#111827" };
    this.backBtn?.setStyle?.(btnStyle);
    this.exitBtn?.setStyle?.(btnStyle);
    this.backBtn?.setFontSize?.(Math.round(16 * ts));
    this.exitBtn?.setFontSize?.(Math.round(16 * ts));

    if (Array.isArray(this.cards)) {
      this.cards.forEach((card) => {
        card.faceDown?.setFillStyle?.(hc ? 0x000000 : 0x111827, 1);
        card.faceDown?.setStrokeStyle?.(2, 0xffffff, hc ? 0.9 : 0.12);

        card.faceUp?.setFillStyle?.(hc ? 0xffffff : 0xf8fafc, 1);
        card.faceUp?.setStrokeStyle?.(2, 0x111827, hc ? 0.9 : 0.25);

        card.txt?.setColor?.(hc ? "#000000" : "#0b1020");
        card.txt?.setFontSize?.(Math.round(52 * ts));
      });
    }

    this.layoutCards?.();
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

  // ✅ HITBOX ESTABLE: rectángulo hijo interactivo (escala con container)
  createCard(idx, value) {
    const container = this.add.container(0, 0);
    const w = 110;
    const h = 130;

    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });

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

    const panelW = 260;
    const gapPanel = 16;
    const centerX = (this.scale.width + panelW + gapPanel) / 2; // empuja a la derecha
    const c = this.add.container(centerX, y, [box, text, hit]);

    const topPad = 120;
    const leftPad = 24 + panelW + gapPanel; // ✅ panel izquierda
    const rightPad = 24;
    const bottomPad = 24;

    const areaW = W - leftPad - rightPad;
    const areaH = H - topPad - bottomPad;

    const totalCards = this.pairs * 2;

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
    });
  }
}

export function createMemoramaGame(parentId, onFinish, onExit) {
  const menu = new MenuScene(onExit);
  const gameScene = new MemoryScene(onFinish, onExit);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 900,
    height: 650,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [menu, gameScene],
  });

  return () => {
    stopSpeech();
    try { game.destroy(true); } catch {}
  };
}
