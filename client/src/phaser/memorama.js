import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  PANEL_GAP,
} from "./a11yPanel";

const SYMBOLS = [
  { symbol: "⭐", label: "estrella" },
  { symbol: "🟠", label: "círculo" },
  { symbol: "🔺", label: "triángulo" },
  { symbol: "🟥", label: "cuadrado" },
  { symbol: "🔶", label: "rombo" },
  { symbol: "❤️", label: "corazón" },
  { symbol: "☀️", label: "sol" },
  { symbol: "☂️", label: "sombrilla" },
  { symbol: "☘️", label: "trébol" },
  { symbol: "🎵", label: "nota musical" },
  { symbol: "🌸", label: "flor" },
  { symbol: "☕️", label: "taza" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function contentLeft(scene) {
  const panelW = scene.a11yPanel?.getWidth?.() ?? 290;
  return 16 + panelW + (PANEL_GAP ?? 16);
}

function makeMenuButton(scene, label, onClick) {
  let w = 520;
  let h = 60;
  let x0 = 0;
  let y0 = 0;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, label, {
      fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial',
      fontSize: "26px",
      color: "#ffffff",
    })
    .setOrigin(0.5);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0);
  hit.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, w, h),
    Phaser.Geom.Rectangle.Contains
  );
  hit.setDepth(1000);

  hit.on("pointerover", () => speakIfEnabled(scene, label));
  hit.on("pointerdown", onClick);

  function refreshHit() {
    hit.disableInteractive();
    hit.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains
    );
  }

  return {
    setCenter(cx, cy) {
      x0 = cx - w / 2;
      y0 = cy - h / 2;
      box.setPosition(x0, y0);
      text.setPosition(cx, cy);
      hit.setPosition(x0, y0);
    },

    setSize(newW, newH) {
      w = newW;
      h = newH;
      box.setSize(w, h);
      hit.setSize(w, h);
      refreshHit();
      text.setPosition(x0 + w / 2, y0 + h / 2);
    },

    setTheme({ fill, strokeAlpha, textColor, fontSize }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, 0xffffff, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
    },
  };
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {}

  create() {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        if (this.textures.exists("cardBack")) {
          this.textures.remove("cardBack");
        }
        this.textures.addImage("cardBack", img);
        this.scene.start("MenuScene");
      } catch (err) {
        console.error("Error registrando cardBack:", err);
        this.scene.start("MenuScene");
      }
    };

    img.onerror = (err) => {
      console.error("No se pudo cargar /assets/card-back.png", err);
      this.scene.start("MenuScene");
    };

    img.src = "/assets/card-back.png";
  }
}

class MenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("MenuScene");
    this._onExit = onExit;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x9eb7e5)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Memorama", {
        fontFamily: "Arial",
        fontSize: "54px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, "Elige dificultad", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#334155",
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

    this.btnEasy = makeMenuButton(this, "Fácil (4 pares)", () => {
      stopSpeech();
      this.scene.start("MemoryScene", { pairs: 4 });
    });

    this.btnMed = makeMenuButton(this, "Medio (6 pares)", () => {
      stopSpeech();
      this.scene.start("MemoryScene", { pairs: 6 });
    });

    this.btnHard = makeMenuButton(this, "Difícil (8 pares)", () => {
      stopSpeech();
      this.scene.start("MemoryScene", { pairs: 8 });
    });

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
      },
    });

    this.applyTheme();
    this.layout();

    this.scale.on("resize", () => {
      if (!this.bg) return;
      this.bg.setSize(this.scale.width, this.scale.height);
      this.applyTheme();
      this.layout();
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  applyTheme() {
    if (!this.a11y) return;
    try {
      applyA11yToScene(this, this.a11y);
    } catch {}

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x9eb7e5, 1);
    this.title.setFontSize(Math.round(54 * ts));
    this.subtitle.setFontSize(Math.round(24 * ts));
    this.subtitle.setColor(hc ? "#ffffff" : "#334155");

    this.exitBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn.setFontSize(Math.round(16 * ts));

    const w = Math.round(520 * ui);
    const h = Math.round(60 * ui);
    const fill = hc ? 0xffffff : 0x111827;
    const strokeAlpha = hc ? 1 : 0.14;
    const textColor = hc ? "#000000" : "#ffffff";
    const fontSize = Math.round(26 * ts);

    [this.btnEasy, this.btnMed, this.btnHard].forEach((b) => {
      b.setSize(w, h);
      b.setTheme({ fill, strokeAlpha, textColor, fontSize });
    });
  }

  layout() {
    const W = this.scale.width;
    if (W < 320) return;

    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    this.exitBtn.setPosition(W - 16, 16);
    this.title.setPosition(cx, 90);
    this.subtitle.setPosition(cx, 150);

    const startY = 260;
    const gap = 92;

    this.btnEasy.setCenter(cx, startY);
    this.btnMed.setCenter(cx, startY + gap);
    this.btnHard.setCenter(cx, startY + gap * 2);
  }
}

class MemoryScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("MemoryScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
  }

  init(data) {
    this.pairs =
      typeof data?.pairs === "number" && !Number.isNaN(data.pairs)
        ? data.pairs
        : 4;

    this.state = {
      first: null,
      second: null,
      locked: false,
      attempts: 0,
      flips: 0,
      matchedPairs: 0,
      startTime: Date.now(),
    };

    this.a11y = this.a11y || {};
    this.focusIndex = 0;
    this.gridCols = 4;
  }

  create() {
    if (![4, 6, 8].includes(this.pairs)) this.pairs = 4;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x9eb7e5)
      .setOrigin(0);

    this.title = this.add
      .text(24, 18, `Memorama - ${this.pairs} pares`, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);

    this.attemptsText = this.add
      .text(24, 48, "Intentos: 0", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#334155",
      })
      .setOrigin(0, 0);

    this.timeText = this.add
      .text(24, 72, "Tiempo: 0s", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#334155",
      })
      .setOrigin(0, 0);

    this.menuBtn = this.makeButton(this.scale.width - 140, 40, 110, 44, "Menú", () => {
      stopSpeech();
      this.scene.start("MenuScene");
    });
    this.menuBtn.container.setDepth(50);

    this.exitBtn = this.makeButton(this.scale.width - 40, 40, 110, 44, "Salir", () => {
      stopSpeech();
      this._onExit?.();
    });
    this.exitBtn.container.setDepth(50);

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const sec = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.timeText.setText(`Tiempo: ${sec}s`);
      },
    });

    const chosen = shuffle([...SYMBOLS]).slice(0, this.pairs);
    const values = shuffle([...chosen, ...chosen]);
    this.cards = values.map((item, idx) => this.createCard(idx, item));

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutCards();
        this.applyFocus(this.focusIndex, true);
      },
    });

    this.initKeyboard();

    this.applyTheme();
    this.layoutTopUI();
    this.layoutCards();
    this.applyFocus(0, true);

    this.scale.on("resize", (gameSize) => {
      const { width, height } = gameSize;
      this.bg.setSize(width, height);
      this.layoutTopUI();
      this.layoutCards();
      this.applyFocus(this.focusIndex, true);

      if (this.endModal) {
        this.relayoutEndModal();
      }
    });

    this.events.once("shutdown", () => {
      stopSpeech();
    });
  }

  say(text) {
    speakIfEnabled(this, text);
  }

  applyTheme() {
    if (!this.a11y) return;
    try {
      applyA11yToScene(this, this.a11y);
    } catch {}

    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x9eb7e5, 1);

    this.title.setFontSize(Math.round(24 * ts));
    this.attemptsText.setFontSize(Math.round(18 * ts));
    this.timeText.setFontSize(Math.round(18 * ts));

    this.title.setColor("#ffffff");
    this.attemptsText.setColor(hc ? "#ffffff" : "#334155");
    this.timeText.setColor(hc ? "#ffffff" : "#334155");

    const btnStyle = {
      fill: hc ? 0xffffff : 0x111827,
      strokeAlpha: hc ? 1 : 0.12,
      textColor: hc ? "#000000" : "#ffffff",
      fontSize: Math.round(18 * ts),
    };

    this.menuBtn.setTheme(btnStyle);
    this.exitBtn.setTheme(btnStyle);

    this.cards.forEach((card) => {
      card.backBorder.setStrokeStyle(2, 0xffffff, hc ? 1 : 0.12);

      card.faceUp.setFillStyle(hc ? 0xffffff : 0xf8fafc, 1);
      card.faceUp.setStrokeStyle(2, 0x111827, hc ? 0.9 : 0.25);

      card.txt.setColor(hc ? "#000000" : "#0b1020");

      card.faceDown.clearTint();
      if (hc) {
        card.faceDown.setTint(0xffffff);
      }
    });
  }

  layoutTopUI() {
    const W = this.scale.width;
    const left = contentLeft(this);

    this.title.setPosition(left, 16);
    this.attemptsText.setPosition(left, 48);
    this.timeText.setPosition(left, 72);

    this.menuBtn.container.setPosition(W - 140, 40);
    this.exitBtn.container.setPosition(W - 40, 40);
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
        const card = this.cards[this.focusIndex];
        if (card) this.onCardClick(card);
      }
    });
  }

  moveFocus(dx, dy) {
    const total = this.cards.length;
    if (!total) return;

    const cols = this.gridCols || 4;
    const rows = Math.ceil(total / cols);

    const idx = this.focusIndex;
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    let nr = Phaser.Math.Clamp(r + dy, 0, rows - 1);
    let nc = Phaser.Math.Clamp(c + dx, 0, cols - 1);

    let next = nr * cols + nc;
    if (next >= total) next = total - 1;

    this.applyFocus(next);
  }

  applyFocus(index, silent = false) {
    const prev = this.cards[this.focusIndex];
    if (prev?.focusOutline) prev.focusOutline.setVisible(false);

    this.focusIndex = index;
    const card = this.cards[index];
    if (!card) return;

    if (!card.focusOutline) {
      card.focusOutline = this.add
        .rectangle(0, 0, 120, 140, 0x000000, 0)
        .setStrokeStyle(4, 0x22c55e, 1);
      card.focusOutline.setVisible(false);
      card.container.add(card.focusOutline);
      card.container.sendToBack(card.focusOutline);
    }

    card.focusOutline.setVisible(true);

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
    const container = this.add.container(0, 0);

    const baseW = 110;
    const baseH = 130;

    const hit = this.add.zone(0, 0, baseW, baseH).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });

    const faceDown = this.add.image(0, 0, "cardBack").setDisplaySize(baseW, baseH);

    const backBorder = this.add
      .rectangle(0, 0, baseW, baseH, 0x000000, 0)
      .setStrokeStyle(2, 0xffffff, 0.12);

    const faceUp = this.add
      .rectangle(0, 0, baseW, baseH, 0xf8fafc, 1)
      .setStrokeStyle(2, 0x111827, 0.25);

    const txt = this.add
      .text(0, 0, item.symbol, {
        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial',
        fontSize: "52px",
        color: "#0b1020",
      })
      .setOrigin(0.5);

    container.add([hit, faceDown, backBorder, faceUp, txt]);

    const card = {
      idx,
      value: item.symbol,
      label: item.label,
      matchKey: item.label,
      container,
      hit,
      faceDown,
      backBorder,
      faceUp,
      txt,
      flipped: false,
      matched: false,
      focusOutline: null,
      scale: 1,
      x: 0,
      y: 0,
    };

    this.setCardVisual(card, false);

    hit.on("pointerdown", () => {
      if (this.state.locked || card.matched || card.flipped) return;
      this.applyFocus(idx, true);
      this.onCardClick(card);
    });

    hit.on("pointerover", () => {
      if (card.matched || card.flipped) return;
      const cols = this.gridCols || 4;
      const row = Math.floor(idx / cols) + 1;
      const col = (idx % cols) + 1;
      this.say(`Carta fila ${row}, columna ${col}`);
    });

    return card;
  }

  setCardVisual(card, isFlipped) {
    card.flipped = isFlipped;
    card.faceDown.setVisible(!isFlipped);
    card.backBorder.setVisible(!isFlipped);
    card.faceUp.setVisible(isFlipped);
    card.txt.setVisible(isFlipped);
    card.container.setAlpha(card.matched ? 0.55 : 1);
  }

  onCardClick(card) {
    if (this.state.locked || card.matched || card.flipped) return;

    this.state.flips += 1;
    this.setCardVisual(card, true);
    this.say(`Figura ${card.label}`);

    if (!this.state.first) {
      this.state.first = card;
      return;
    }

    this.state.second = card;
    this.state.locked = true;
    this.state.attempts += 1;
    this.attemptsText.setText(`Intentos: ${this.state.attempts}`);

    const a = this.state.first;
    const b = this.state.second;

    const revealDelay = 1400;
    const hideDelay = 900;

    if (a.matchKey === b.matchKey) {
      this.time.delayedCall(revealDelay, () => {
        a.matched = true;
        b.matched = true;
        this.setCardVisual(a, true);
        this.setCardVisual(b, true);

        this.say(`Correcto. Pareja de ${b.label}`);

        this.state.matchedPairs += 1;
        this.resetTurn();

        if (this.state.matchedPairs === this.pairs) {
          this.onWin();
        }
      });
    } else {
      this.time.delayedCall(revealDelay, () => {
        this.say(`Incorrecto. Era ${a.label} y ${b.label}`);

        this.time.delayedCall(hideDelay, () => {
          this.setCardVisual(a, false);
          this.setCardVisual(b, false);
          this.resetTurn();
        });
      });
    }
  }

  resetTurn() {
    this.state.first = null;
    this.state.second = null;
    this.state.locked = false;
  }

  onWin() {
    this.state.locked = true;
    this.cards.forEach((c) => c.hit.disableInteractive());

    const durationMs = Date.now() - this.state.startTime;
    const sec = Math.floor(durationMs / 1000);

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

    this.say(`Ganaste. Tiempo ${sec} segundos. Intentos ${this.state.attempts}`);
    stopSpeech();

    this._onFinish?.(this.finalResult);
    this.showEndModal(this.finalResult);
  }

  showEndModal({ durationMs, moves }) {
    if (this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    const overlay = this.add
      .rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(1000);

    const boxW = Math.min(560, W * 0.85);
    const boxH = 240;

    const panelFill = hc ? 0xffffff : 0x111827;
    const panelStroke = hc ? 0x000000 : 0xffffff;
    const textColor = hc ? "#000000" : "#ffffff";
    const subColor = hc ? "#000000" : "#cbd5e1";

    const box = this.add
      .rectangle(W / 2, H / 2, boxW, boxH, panelFill, 1)
      .setStrokeStyle(2, panelStroke, hc ? 1 : 0.16)
      .setDepth(1001);

    const t1 = this.add
      .text(W / 2, H / 2 - 70, "¡Excelente!", {
        fontFamily: "Arial",
        fontSize: Math.round(40 * ts),
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(1002);

    const sec = Math.floor(durationMs / 1000);
    const t2 = this.add
      .text(W / 2, H / 2 - 15, `Tiempo: ${sec}s  •  Intentos: ${moves}`, {
        fontFamily: "Arial",
        fontSize: Math.round(20 * ts),
        color: subColor,
      })
      .setOrigin(0.5)
      .setDepth(1002);

    const btnAgain = this.makeButton(W / 2 - 120, H / 2 + 65, 210, 48, "Jugar otra vez", () => {
      this.hideEndModal();
      this.scene.restart({ pairs: this.pairs });
    });
    btnAgain.container.setDepth(1003);

    const btnMenu = this.makeButton(W / 2 + 120, H / 2 + 65, 170, 48, "Menú", () => {
      this.hideEndModal();
      this.scene.start("MenuScene");
    });
    btnMenu.container.setDepth(1003);

    this.endModal = {
      overlay,
      box,
      t1,
      t2,
      btnAgain,
      btnMenu,
      boxH,
    };
  }

  relayoutEndModal() {
    if (!this.endModal) return;

    const { overlay, box, t1, t2, btnAgain, btnMenu, boxH } = this.endModal;
    const W = this.scale.width;
    const H = this.scale.height;

    overlay.setSize(W, H);
    box.setPosition(W / 2, H / 2).setSize(Math.min(560, W * 0.85), boxH);
    t1.setPosition(W / 2, H / 2 - 70);
    t2.setPosition(W / 2, H / 2 - 15);
    btnAgain.container.setPosition(W / 2 - 120, H / 2 + 65);
    btnMenu.container.setPosition(W / 2 + 120, H / 2 + 65);
  }

  hideEndModal() {
    if (!this.endModal) return;
    const { overlay, box, t1, t2, btnAgain, btnMenu } = this.endModal;

    try {
      overlay.destroy();
      box.destroy();
      t1.destroy();
      t2.destroy();
      btnAgain.container.destroy();
      btnMenu.container.destroy();
    } catch {}

    this.endModal = null;
  }

  layoutCards() {
    const W = this.scale.width;
    const H = this.scale.height;

    const leftPad = contentLeft(this);
    const rightPad = 24;
    const topPad = 120;
    const bottomPad = 24;

    const areaW = W - leftPad - rightPad;
    const areaH = H - topPad - bottomPad;

    const totalCards = this.pairs * 2;

    let cols = 4;
    if (totalCards >= 12) cols = 6;
    if (totalCards >= 16) cols = 8;
    this.gridCols = cols;

    const rows = Math.ceil(totalCards / cols);
    const gap = 18;

    const cardW = Math.floor((areaW - gap * (cols - 1)) / cols);
    const cardH = Math.floor((areaH - gap * (rows - 1)) / rows);

    this.cards.forEach((card, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = leftPad + c * (cardW + gap) + cardW / 2;
      const y = topPad + r * (cardH + gap) + cardH / 2;

      const scaleX = cardW / 110;
      const scaleY = cardH / 130;
      const s = Math.min(scaleX, scaleY);

      card.x = x;
      card.y = y;
      card.scale = s;

      card.container.setPosition(x, y);
      card.container.setScale(s);
      card.container.setDepth(10);
    });
  }

  makeButton(x, y, w, h, label, onClick) {
    const container = this.add.container(x, y);

    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });

    const bg = this.add
      .rectangle(0, 0, w, h, 0x111827)
      .setStrokeStyle(2, 0xffffff, 0.12);

    const txt = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    container.add([hit, bg, txt]);

    hit.on("pointerdown", onClick);
    hit.on("pointerover", () => bg.setFillStyle(0x1f2937));
    hit.on("pointerout", () => bg.setFillStyle(0x111827));

    return {
      container,
      setTheme: ({ fill, strokeAlpha, textColor, fontSize }) => {
        bg.setFillStyle(fill, 1);
        bg.setStrokeStyle(2, 0xffffff, strokeAlpha);
        txt.setColor(textColor);
        if (fontSize) txt.setFontSize(fontSize);
      },
    };
  }
}

export function createMemoramaGame(parentId, onFinish, onExit) {
  const parentEl = document.getElementById(parentId);
  if (!parentEl) throw new Error(`No existe el elemento con id="${parentId}"`);

  parentEl.style.position = "relative";
  parentEl.style.overflow = "hidden";
  parentEl.style.minHeight = "480px";

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: "#9eb7e5",
    scene: [
      new BootScene(),
      new MenuScene(onExit),
      new MemoryScene(onFinish, onExit),
    ],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
  });

  const canvas = game.canvas;
  if (canvas) {
    canvas.style.display = "block";
  }

  return () => {
    stopSpeech();
    try {
      game.destroy(true);
    } catch {}
  };
}
