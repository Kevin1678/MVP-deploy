import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  PANEL_GAP,
} from "./a11yPanel";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

function makeTopLeftButton(scene, label, onClick, depth = 10) {
  let w = 160;
  let h = 60;
  let x0 = 0;
  let y0 = 0;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14)
    .setDepth(depth);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, label, {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => speakIfEnabled(scene, `Botón ${label}`));
  hit.on("pointerdown", onClick);

  return {
    box,
    text,
    hit,

    setLabel(next) {
      label = next;
      text.setText(next);
    },

    setTL(nx, ny) {
      x0 = nx;
      y0 = ny;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(x0 + w / 2, y0 + h / 2);
    },

    setCenter(cx, cy) {
      x0 = cx - w / 2;
      y0 = cy - h / 2;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(cx, cy);
    },

    setSize(nw, nh) {
      w = nw;
      h = nh;
      box.setSize(w, h);
      hit.setSize(w, h);

      if (hit.input?.hitArea?.setTo) {
        hit.input.hitArea.setTo(0, 0, w, h);
      }

      text.setPosition(x0 + w / 2, y0 + h / 2);
    },

    setTheme({ fill, strokeAlpha, textColor, fontSize }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, 0xffffff, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
    },

    setVisible(v) {
      box.setVisible(v);
      text.setVisible(v);
      hit.setVisible(v);
    },

    setDepth(nextDepth) {
      box.setDepth(nextDepth);
      text.setDepth(nextDepth + 1);
      hit.setDepth(nextDepth + 2);
    },

    destroy() {
      box.destroy();
      text.destroy();
      hit.destroy();
    },
  };
}

function makeBall(scene, x, y, r, hc = false) {
  const fill = hc ? 0xffffff : 0x60a5fa;
  const face = hc ? 0x000000 : 0x0b1020;

  const ball = scene.add.circle(0, 0, r, fill, 1).setStrokeStyle(Math.max(2, r * 0.1), 0xffffff, 1);
  const shine = scene.add.circle(-r * 0.28, -r * 0.28, r * 0.42, 0xffffff, hc ? 0.28 : 0.18);

  const eyes = scene.add.graphics();
  eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  eyes.beginPath();
  eyes.arc(0, r * 0.14, r * 0.18, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  eyes.strokePath();

  const container = scene.add.container(x, y, [ball, shine, eyes]);
  return { container, ball, shine, eyes, r };
}

function recolorBall(parts, r, hc = false) {
  const fill = hc ? 0xffffff : 0x60a5fa;
  const face = hc ? 0x000000 : 0x0b1020;

  parts.ball.setRadius(r);
  parts.ball.setFillStyle(fill, 1);
  parts.ball.setStrokeStyle(Math.max(2, r * 0.1), 0xffffff, 1);

  parts.shine.setPosition(-r * 0.28, -r * 0.28);
  parts.shine.setRadius(r * 0.42);
  parts.shine.setFillStyle(0xffffff, hc ? 0.28 : 0.18);

  parts.eyes.clear();
  parts.eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  parts.eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.beginPath();
  parts.eyes.arc(0, r * 0.14, r * 0.18, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  parts.eyes.strokePath();
}

/* ===================== MENU ===================== */
class CountPickMenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("CountPickMenuScene");
    this._onExit = onExit;
  }

  create() {
    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    this.title = this.add.text(0, 0, "Contar y elegir", {
      fontFamily: "Arial",
      fontSize: "50px",
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

    this.btnEasy = makeTopLeftButton(this, "Fácil (5 rondas)", () => {
      stopSpeech();
      this.scene.start("CountPickGameScene", { roundsTotal: 5 });
    });

    this.btnMed = makeTopLeftButton(this, "Medio (10 rondas)", () => {
      stopSpeech();
      this.scene.start("CountPickGameScene", { roundsTotal: 10 });
    });

    this.btnHard = makeTopLeftButton(this, "Difícil (15 rondas)", () => {
      stopSpeech();
      this.scene.start("CountPickGameScene", { roundsTotal: 15 });
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
    applyA11yToScene(this, this.a11y);

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(50 * ts));
    this.subtitle.setFontSize(Math.round(24 * ts));
    this.subtitle.setColor(hc ? "#ffffff" : "#cbd5e1");

    this.exitBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn.setFontSize(Math.round(16 * ts));

    const fill = hc ? 0xffffff : 0x111827;
    const strokeAlpha = hc ? 1 : 0.14;
    const textColor = hc ? "#000000" : "#ffffff";
    const fontSize = Math.round(24 * ts);
    const bw = Math.round(420 * ui);
    const bh = Math.round(60 * ui);

    [this.btnEasy, this.btnMed, this.btnHard].forEach((b) => {
      b.setSize(bw, bh);
      b.setTheme({ fill, strokeAlpha, textColor, fontSize });
    });
  }

  layout() {
    const W = this.scale.width;
    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    this.exitBtn.setPosition(W - 16, 16);

    this.title.setPosition(cx, 90);
    this.subtitle.setPosition(cx, 150);

    const gap = 92;
    const startY = 260;

    this.btnEasy.setCenter(cx, startY + 0 * gap);
    this.btnMed.setCenter(cx, startY + 1 * gap);
    this.btnHard.setCenter(cx, startY + 2 * gap);
  }
}

/* ===================== GAME ===================== */
class CountPickGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("CountPickGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
  }

  init(data) {
    this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
  }

  create() {
    this.state = {
      startTime: Date.now(),
      round: 0,
      score: 0,
      attempts: 0,
      target: 0,
      locked: false,
    };

    this.ballParts = [];
    this.choiceButtons = [];
    this.endModal = null;

    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    this.title = this.add.text(0, 0, "Contar y elegir", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    this.sub = this.add.text(0, 0, "Cuenta las bolitas y elige el número correcto", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0, 0);

    this.stats = this.add.text(0, 0, "Puntos: 0 • Intentos: 0 • Ronda: 0/0", {
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
      this.scene.start("CountPickMenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
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

    this.scale.on("resize", () => {
      if (!this.bg) return;
      this.bg.setSize(this.scale.width, this.scale.height);
      this.applyTheme();
      this.layout();
      this.layoutBalls();
      this.layoutChoices();
      this.layoutEndModal();
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(28 * ts));
    this.sub.setFontSize(Math.round(18 * ts));
    this.stats.setFontSize(Math.round(18 * ts));

    this.sub.setColor(hc ? "#ffffff" : "#cbd5e1");
    this.stats.setColor(hc ? "#ffffff" : "#cbd5e1");

    this.menuBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });

    this.menuBtn.setFontSize(Math.round(16 * ts));
    this.exitBtn.setFontSize(Math.round(16 * ts));

    const fill = hc ? 0xffffff : 0x111827;
    const strokeAlpha = hc ? 1 : 0.14;
    const textColor = hc ? "#000000" : "#ffffff";
    const fontSize = Math.round(28 * ts);

    this.choiceButtons.forEach((b) => {
      b.setTheme({ fill, strokeAlpha, textColor, fontSize });
    });

    const ui = this.a11y.uiScale || 1;
    const r = Math.round(28 * ui);
    this.ballParts.forEach((p) => recolorBall(p, r, hc));
  }

  layout() {
    const W = this.scale.width;
    const left = contentLeft(this);

    this.title.setPosition(left, 16);
    this.sub.setPosition(left, 52);
    this.stats.setPosition(left, 80);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  clearRound() {
    this.ballParts.forEach((p) => p.container.destroy(true));
    this.ballParts = [];
    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];
  }

  nextRound() {
    this.clearRound();

    this.state.round += 1;
    this.state.locked = false;
    this.state.target = randInt(1, 5);

    const options = new Set([this.state.target]);
    while (options.size < 3) options.add(randInt(1, 5));
    const choices = shuffle(Array.from(options));

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const r = Math.round(28 * ui);

    for (let i = 0; i < this.state.target; i++) {
      const parts = makeBall(this, 0, 0, r, hc);
      this.ballParts.push(parts);
    }

    choices.forEach((n) => {
      const btn = makeTopLeftButton(this, String(n), () => this.pickAnswer(n));
      this.choiceButtons.push(btn);
    });

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.layoutBalls();
    this.layoutChoices();

    speakIfEnabled(this, `Ronda ${this.state.round}. Cuenta las bolitas.`);
    speakIfEnabled(this, `${this.state.target} bolitas en pantalla.`);
  }

  layoutBalls() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const ui = this.a11y.uiScale || 1;
    const r = Math.round(28 * ui);

    const topY = 170;
    const cols = 3;
    const gapX = 28 * ui;
    const gapY = 36 * ui;
    const cellW = 110 * ui;
    const cellH = 110 * ui;

    const total = this.ballParts.length;
    const contentW = cols * cellW + (cols - 1) * gapX;
    const startX = left + Math.max(0, (W - left - 16 - contentW) / 2);

    this.ballParts.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = startX + col * (cellW + gapX) + cellW / 2;
      const y = topY + row * (cellH + gapY) + cellH / 2;

      recolorBall(p, r, !!this.a11y.highContrast);
      p.container.setPosition(x, y);
    });
  }

  layoutChoices() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const H = this.scale.height;

    const ui = this.a11y.uiScale || 1;
    const btnW = Math.round(150 * ui);
    const btnH = Math.round(62 * ui);
    const gap = Math.round(18 * ui);

    const totalW = this.choiceButtons.length * btnW + (this.choiceButtons.length - 1) * gap;
    const startX = left + Math.max(0, (W - left - 16 - totalW) / 2);
    const y = H - 120;

    this.choiceButtons.forEach((b, i) => {
      b.setSize(btnW, btnH);
      b.setTL(startX + i * (btnW + gap), y);
    });
  }

  animateCorrect() {
    const W = this.scale.width;
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    const overlay = this.add.container(W / 2, 120).setDepth(3000);

    const panel = this.add.rectangle(0, 0, Math.min(520, W * 0.82), 110, hc ? 0xffffff : 0x111827, 1)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.15);

    const icon = this.add.text(-120, 0, "✔", {
      fontFamily: "Arial",
      fontSize: `${Math.round(70 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

    const text = this.add.text(40, 0, "¡Bien hecho!", {
      fontFamily: "Arial",
      fontSize: `${Math.round(36 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

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
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    const overlay = this.add.container(W / 2, 120).setDepth(3000);

    const panel = this.add.rectangle(0, 0, Math.min(560, W * 0.86), 120, hc ? 0xffffff : 0x111827, 1)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.15);

    const icon = this.add.text(-140, 0, "✖", {
      fontFamily: "Arial",
      fontSize: `${Math.round(64 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

    const text = this.add.text(36, 0, "Intenta otra vez", {
      fontFamily: "Arial",
      fontSize: `${Math.round(32 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

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
    if (this.state.locked) return;
    this.state.locked = true;
    this.state.attempts += 1;

    const ok = value === this.state.target;

    if (ok) {
      this.state.score += 1;
      this.animateCorrect();
      speakIfEnabled(this, "Correcto");
    } else {
      this.animateWrong();
      speakIfEnabled(this, `Incorrecto. Eran ${this.state.target}`);
    }

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.time.delayedCall(1200, () => {
      if (this.state.round >= this.roundsTotal) {
        this.showEndModal();
      } else {
        this.nextRound();
      }
    });
  }

  showEndModal() {
    if (this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    const durationMs = Date.now() - this.state.startTime;

    const overlay = this.add
      .rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(4000);

    const box = this.add
      .rectangle(W / 2, H / 2, Math.min(560, W * 0.88), 250, hc ? 0xffffff : 0x0f172a, 1)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.16)
      .setDepth(4001);

    const title = this.add
      .text(W / 2, H / 2 - 70, "¡Terminaste!", {
        fontFamily: "Arial",
        fontSize: `${Math.round(38 * ts)}px`,
        color: hc ? "#000000" : "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(4002);

    const sub = this.add
      .text(
        W / 2,
        H / 2 - 18,
        `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}`,
        {
          fontFamily: "Arial",
          fontSize: `${Math.round(20 * ts)}px`,
          color: hc ? "#000000" : "#cbd5e1",
        }
      )
      .setOrigin(0.5)
      .setDepth(4002);

    const btnAgain = makeTopLeftButton(
      this,
      "Jugar otra vez",
      () => {
        this.hideEndModal();
        this.scene.restart({ roundsTotal: this.roundsTotal });
      },
      4003
    );

    const btnExit = makeTopLeftButton(
      this,
      "Salir",
      () => {
        this.hideEndModal();
        stopSpeech();
        this._onFinish?.({
          score: this.state.score,
          moves: this.state.attempts,
          durationMs,
          game: "countPick",
        });
      },
      4003
    );

    const btnAgainFill = hc ? 0x000000 : 0x2563eb;
    const btnExitFill = hc ? 0x222222 : 0xdc2626;
    const btnStrokeAlpha = 1;
    const btnTextColor = "#ffffff";
    const fontSize = Math.round(18 * ts);

    btnAgain.setSize(210, 52);
    btnAgain.setTheme({
      fill: btnAgainFill,
      strokeAlpha: btnStrokeAlpha,
      textColor: btnTextColor,
      fontSize,
    });

    btnExit.setSize(170, 52);
    btnExit.setTheme({
      fill: btnExitFill,
      strokeAlpha: btnStrokeAlpha,
      textColor: btnTextColor,
      fontSize,
    });

    this.endModal = {
      overlay,
      box,
      title,
      sub,
      btnAgain,
      btnExit,
    };

    this.layoutEndModal();
  }

  layoutEndModal() {
    if (!this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;

    this.endModal.overlay.setSize(W, H);
    this.endModal.box.setPosition(W / 2, H / 2);
    this.endModal.title.setPosition(W / 2, H / 2 - 70);
    this.endModal.sub.setPosition(W / 2, H / 2 - 18);

    this.endModal.btnAgain.setTL(W / 2 - 230, H / 2 + 46);
    this.endModal.btnExit.setTL(W / 2 + 20, H / 2 + 46);
  }

  hideEndModal() {
    if (!this.endModal) return;
    const m = this.endModal;
    m.overlay.destroy();
    m.box.destroy();
    m.title.destroy();
    m.sub.destroy();
    m.btnAgain.destroy();
    m.btnExit.destroy();
    this.endModal = null;
  }
}

export function createCountPickGame(parentId, onFinish, onExit) {
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
    scene: [new CountPickMenuScene(onExit), new CountPickGameScene(onFinish, onExit)],
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
    try { game.destroy(true); } catch {}
  };
}
