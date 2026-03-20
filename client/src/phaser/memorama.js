import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  PANEL_GAP,
} from "./a11yPanel";

import cardBackUrl from "./assets/card-back-stone.png";

const SYMBOLS = ["★", "●", "▲", "■", "◆", "❤", "☀", "☂", "☘", "♫", "✿", "☕"];

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

/* ---------- Helpers de botón (menu) ---------- */
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
      fontFamily: "Arial",
      fontSize: "26px",
      color: "#ffffff",
    })
    .setOrigin(0.5);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0);
  hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  hit.setDepth(1000);

  hit.on("pointerover", () => speakIfEnabled(scene, label));
  hit.on("pointerdown", onClick);

  function refreshHit() {
    hit.disableInteractive();
    hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
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

/* ======================= MenuScene ======================= */
class MenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("MenuScene");
    this._onExit = onExit;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
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

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(54 * ts));
    this.subtitle.setFontSize(Math.round(24 * ts));
    this.subtitle.setColor(hc ? "#ffffff" : "#cbd5e1");

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

    this._btnW = w;
    this._btnH = h;
  }

  layout() {
    const W = this.scale.width;
    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    this.exitBtn.setPosition(W - 16, 16);

    this.title.setPosition(cx, 90);
    this.subtitle.setPosition(cx, 150);

    const startY = 260;
    const gap = 92;

    this.btnEasy.setCenter(cx, startY + gap * 0);
    this.btnMed.setCenter(cx, startY + gap * 1);
    this.btnHard.setCenter(cx, startY + gap * 2);
  }
}

/* ======================= MemoryScene ======================= */
class MemoryScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("MemoryScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
  }

preload() {
  console.log("Usando textura:", cardBackUrl);
  this.load.image("cardBack", cardBackUrl);

  this.load.on("filecomplete-image-cardBack", () => {
    console.log("cardBack cargada correctamente");
  });

  this.load.on("loaderror", (file) => {
    console.error("Error cargando asset:", file);
  });
}
  
  init(data) {
    this.pairs = data?.pairs ?? 8;
    this.state = {
      first: null,
      locked: false,
      attempts: 0,
      flips: 0,
      matchedPairs: 0,
      startTime: Date.now(),
    };
    this.a11y = this.a11y || {};
    this.focusIndex = 0;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
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

    this.scale.on("resize", () => {
      if (!this.bg || !this.cards) return;
      this.bg.setSize(this.scale.width, this.scale.height);
      this.applyTheme();
      this.layoutTopUI();
      this.layoutCards();
      this.applyFocus(this.focusIndex, true);
    });

    this.events.once("shutdown", () => stopSpeech());
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

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(24 * ts));
    this.attemptsText.setFontSize(Math.round(18 * ts));
    this.timeText.setFontSize(Math.round(18 * ts));

    this.attemptsText.setColor(hc ? "#ffffff" : "#cbd5e1");
    this.timeText.setColor(hc ? "#ffffff" : "#cbd5e1");

    const btnStyle = {
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    };
    this.menuBtn.setStyle(btnStyle);
    this.exitBtn.setStyle(btnStyle);
    this.menuBtn.setFontSize(Math.round(16 * ts));
    this.exitBtn.setFontSize(Math.round(16 * ts));

    this.cards.forEach((card) => {
      card.faceDown.clearTint();
      if (hc) {
        card.faceDown.setTint(0xffffff);
      }

      card.backBorder.setStrokeStyle(2, 0xffffff, hc ? 1 : 0.12);

      card.faceUp.setFillStyle(hc ? 0xffffff : 0xf8fafc, 1);
      card.faceUp.setStrokeStyle(2, 0x111827, hc ? 0.9 : 0.25);

      card.txt.setColor(hc ? "#000000" : "#0b1020");
    });
  }

  layoutTopUI() {
    const W = this.scale.width;
    const left = contentLeft(this);

    this.title.setPosition(left, 16);
    this.attemptsText.setPosition(left, 48);
    this.timeText.setPosition(left, 72);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  initKeyboard() {
    this.input.keyboard.on("keydown", (e) => {
      if (e.code === "Escape") {
        stopSpeech();
        this.scene.start("MenuScene");
        return;
      }
      if (this.state.locked) return;

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
    });
  }

  applyFocus(index, silent = false) {
    this.cards.forEach((c) => c.focusOutline?.setVisible(false));
    const card = this.cards[index];
    if (!card) return;

    if (!card.focusOutline) {
      card.focusOutline = this.add
        .rectangle(card.cx, card.cy, 120, 140, 0x000000, 0)
        .setOrigin(0.5)
        .setStrokeStyle(4, 0x22c55e, 1);
      card.focusOutline.setVisible(false);
    }

    card.focusOutline.setVisible(true);
    card.focusOutline.setPosition(card.cx, card.cy);
    card.focusOutline.setSize(card.w + 14, card.h + 14);

    if (!silent) this.say(`Carta ${index + 1}`);
  }

  createCard(idx, value) {
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
      .text(0, 0, value, {
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
      value,
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
      if (card.matched || card.flipped) return;
      const cols = this.gridCols || 4;
      const row = Math.floor(idx / cols) + 1;
      const col = (idx % cols) + 1;
      this.say(`Carta fila ${row}, columna ${col}`);
    });

    hit.on("pointerdown", () => {
      if (this.state.locked || card.matched || card.flipped) return;
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
    if (this.state.locked || card.matched || card.flipped) return;

    this.state.flips += 1;

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

    this.say(
      `Ganaste. Tiempo ${Math.floor(durationMs / 1000)} segundos. Intentos ${this.state.attempts}`
    );
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
      .setDepth(2000);

    const boxW = Math.min(560, W * 0.9);
    const boxH = 260;

    const panelFill = hc ? 0xffffff : 0x111827;
    const panelStroke = hc ? 0x000000 : 0xffffff;
    const textColor = hc ? "#000000" : "#ffffff";
    const subColor = hc ? "#000000" : "#cbd5e1";

    const box = this.add
      .rectangle(W / 2, H / 2, boxW, boxH, panelFill, 1)
      .setStrokeStyle(2, panelStroke, hc ? 1 : 0.16)
      .setDepth(2001);

    const t1 = this.add
      .text(W / 2, H / 2 - 80, "¡Excelente!", {
        fontFamily: "Arial",
        fontSize: Math.round(40 * ts),
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const sec = Math.floor(durationMs / 1000);
    const t2 = this.add
      .text(W / 2, H / 2 - 25, `Tiempo: ${sec}s   •   Intentos: ${moves}`, {
        fontFamily: "Arial",
        fontSize: Math.round(20 * ts),
        color: subColor,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const makeModalBtn = (cx, cy, label, onClick) => {
      const bw = 220;
      const bh = 52;

      const btnBg = this.add
        .rectangle(cx - bw / 2, cy - bh / 2, bw, bh, hc ? 0x000000 : 0x0b1220, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, panelStroke, hc ? 1 : 0.16)
        .setDepth(2003);

      const btnTx = this.add
        .text(cx, cy, label, {
          fontFamily: "Arial",
          fontSize: Math.round(18 * ts),
          color: textColor,
        })
        .setOrigin(0.5)
        .setDepth(2004);

      const hit = this.add
        .zone(cx - bw / 2, cy - bh / 2, bw, bh)
        .setOrigin(0, 0)
        .setDepth(2005);

      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", onClick);

      return { btnBg, btnTx, hit };
    };

    const btnAgain = makeModalBtn(W / 2 - 130, H / 2 + 70, "Jugar otra vez", () => {
      this.hideEndModal();
      this.scene.restart({ pairs: this.pairs });
    });

    const btnExit = makeModalBtn(W / 2 + 130, H / 2 + 70, "Salir", () => {
      this.hideEndModal();
      this._onExit?.();
    });

    this.endModal = { overlay, box, t1, t2, btnAgain, btnExit };

    this.__endResize = () => {
      if (!this.endModal) return;
      const W2 = this.scale.width;
      const H2 = this.scale.height;

      overlay.setSize(W2, H2);
      box.setPosition(W2 / 2, H2 / 2);

      t1.setPosition(W2 / 2, H2 / 2 - 80);
      t2.setPosition(W2 / 2, H2 / 2 - 25);

      const moveBtn = (btn, cx, cy) => {
        const bw = 220;
        const bh = 52;
        btn.btnBg.setPosition(cx - bw / 2, cy - bh / 2);
        btn.btnTx.setPosition(cx, cy);
        btn.hit.setPosition(cx - bw / 2, cy - bh / 2);
      };

      moveBtn(btnAgain, W2 / 2 - 130, H2 / 2 + 70);
      moveBtn(btnExit, W2 / 2 + 130, H2 / 2 + 70);
    };

    this.scale.on("resize", this.__endResize);
  }

  hideEndModal() {
    if (!this.endModal) return;
    const { overlay, box, t1, t2, btnAgain, btnExit } = this.endModal;

    try {
      overlay.destroy();
      box.destroy();
      t1.destroy();
      t2.destroy();
      btnAgain.btnBg.destroy();
      btnAgain.btnTx.destroy();
      btnAgain.hit.destroy();
      btnExit.btnBg.destroy();
      btnExit.btnTx.destroy();
      btnExit.hit.destroy();
    } catch {}

    this.endModal = null;

    if (this.__endResize) {
      this.scale.off("resize", this.__endResize);
      this.__endResize = null;
    }
  }

  layoutCards() {
    const W = this.scale.width;
    const H = this.scale.height;

    const leftPad = contentLeft(this);
    const rightPad = 16;
    const topPad = 120;
    const bottomPad = 16;

    const areaW = Math.max(220, W - leftPad - rightPad);
    const areaH = Math.max(220, H - topPad - bottomPad);

    const total = this.pairs * 2;
    const cols = 4;
    const rows = Math.ceil(total / cols);
    this.gridCols = cols;

    const gap = 18;

    const rawCellW = Math.floor((areaW - gap * (cols - 1)) / cols);
    const rawCellH = Math.floor((areaH - gap * (rows - 1)) / rows);

    const cellW = Math.max(50, rawCellW);
    const cellH = Math.max(60, rawCellH);

    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

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
      card.txt.setFontSize(Math.max(22, Math.floor(Math.min(w, h) * 0.42 * ts)));

      if (card.focusOutline) {
        card.focusOutline.setPosition(cx, cy);
        card.focusOutline.setSize(w + 14, h + 14);
      }
    });
  }
}

/* ======================= createMemoramaGame ======================= */
export function createMemoramaGame(parentId, onFinish, onExit) {
  const parentEl = document.getElementById(parentId);
  if (!parentEl) throw new Error(`No existe el elemento con id="${parentId}"`);

  parentEl.style.position = "relative";
  parentEl.style.overflow = "hidden";

  const w0 = Math.max(320, parentEl.clientWidth || window.innerWidth || 900);
  const h0 = Math.max(480, parentEl.clientHeight || window.innerHeight || 650);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [new MenuScene(onExit), new MemoryScene(onFinish, onExit)],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: w0,
      height: h0,
    },
  });

  const canvas = game.canvas;
  if (canvas) {
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
  }

  setTimeout(() => {
    const w = Math.max(320, parentEl.clientWidth || window.innerWidth || 900);
    const h = Math.max(480, parentEl.clientHeight || window.innerHeight || 650);
    try {
      game.scale.resize(w, h);
      game.scale.refresh();
    } catch {}
  }, 0);

  return () => {
    stopSpeech();
    try {
      game.destroy(true);
    } catch {}
  };
}
