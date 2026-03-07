import Phaser from "phaser";

function stopVoice() {
  try { window.speechSynthesis.cancel(); } catch (_) {}
}
function speak(text) {
  try {
    stopVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pickDistinctNumbers(correct, min, max, total) {
  const set = new Set([correct]);
  while (set.size < total) set.add(randInt(min, max));
  return [...set].sort(() => Math.random() - 0.5);
}

// Paletas “seguras” (adaptación, no simulación real)
const THEMES = {
  normal: {
    bg: 0x0b1020,
    panel: 0x111827,
    text: "#ffffff",
    muted: "#cbd5e1",
    accent: 0x22c55e,
    objFill: 0x60a5fa,
    objStroke: 0xffffff,
    btnFill: 0x111827,
    btnHover: 0x1f2937,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.14,
  },
  protanopia: {
    bg: 0x0b1020,
    panel: 0x0f172a,
    text: "#ffffff",
    muted: "#e2e8f0",
    accent: 0xfbbf24,
    objFill: 0x38bdf8,
    objStroke: 0xffffff,
    btnFill: 0x0f172a,
    btnHover: 0x1e293b,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.18,
  },
  tritanopia: {
    bg: 0x0b1020,
    panel: 0x111827,
    text: "#ffffff",
    muted: "#e2e8f0",
    accent: 0xa78bfa,
    objFill: 0x34d399,
    objStroke: 0xffffff,
    btnFill: 0x111827,
    btnHover: 0x1f2937,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.16,
  },
  highContrast: {
    bg: 0x000000,
    panel: 0x000000,
    text: "#ffffff",
    muted: "#ffffff",
    accent: 0xffffff,
    objFill: 0xffffff,
    objStroke: 0xffffff,
    btnFill: 0xffffff,
    btnHover: 0xffffff,
    btnText: "#000000",
    btnStrokeAlpha: 1,
  },
};

function loadPrefs() {
  const tts = localStorage.getItem("a11y_tts") === "1";
  const contrast = localStorage.getItem("a11y_contrast") === "1";
  const theme = localStorage.getItem("a11y_theme") || "normal";
  const scale = parseFloat(localStorage.getItem("a11y_uiScale") || "1");
  return {
    ttsEnabled: tts,
    contrast,
    theme: theme in THEMES ? theme : "normal",
    uiScale: clamp(isNaN(scale) ? 1 : scale, 0.9, 1.6),
  };
}
function savePrefs(p) {
  localStorage.setItem("a11y_tts", p.ttsEnabled ? "1" : "0");
  localStorage.setItem("a11y_contrast", p.contrast ? "1" : "0");
  localStorage.setItem("a11y_theme", p.theme);
  localStorage.setItem("a11y_uiScale", String(p.uiScale));
}

/**
 * Pelota llamativa (sin imágenes): círculo + brillo + carita.
 * Devuelve Container con _parts para recolorear/redibujar.
 */
function makeBall(scene, x, y, r, theme, isContrast) {
  const ball = scene.add.circle(0, 0, r, theme.objFill, 1);
  ball.setStrokeStyle(Math.max(2, r * 0.12), theme.objStroke, 1);

  const shine = scene.add.circle(-r * 0.25, -r * 0.25, r * 0.45, 0xffffff, isContrast ? 0.28 : 0.18);

  const g = scene.add.graphics();
  const faceLine = isContrast ? 0x000000 : 0x0b1020;
  g.lineStyle(Math.max(2, r * 0.09), faceLine, 0.95);
  g.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  g.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  g.beginPath();
  g.arc(0, r * 0.12, r * 0.18, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();

  const container = scene.add.container(x, y, [ball, shine, g]);
  container.setSize(r * 2, r * 2);
  container.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains);
  container._parts = { ball, shine, g, r };

  return container;
}

/**
 * Juego: contar y elegir
 * onFinish: ({score, attempts, durationMs, roundsPlayed, roundsTotal}) => void
 * onExit: () => void
 * options (opcional):
 *  - roundsChoices: [{label, rounds}]  (para el menú)
 *  - minCount, maxCount (rango de objetos por ronda)
 */
export function createCountPickGame(parentId, onFinish, onExit, options = {}) {
  const prefs = loadPrefs();

  const roundsChoices =
    Array.isArray(options.roundsChoices) && options.roundsChoices.length
      ? options.roundsChoices
      : [
          { label: "Fácil (5 rondas)", rounds: 5 },
          { label: "Medio (10 rondas)", rounds: 10 },
          { label: "Difícil (15 rondas)", rounds: 15 },
        ];

  const minCount = Number.isFinite(options.minCount) ? options.minCount : 1;
  const maxCount = Number.isFinite(options.maxCount) ? options.maxCount : 5;

  // Anti-spam de voz
  let lastSpoken = "";
  let lastSpokenAt = 0;
  const say = (msg, cooldownMs = 650) => {
    if (!prefs.ttsEnabled) return;
    const now = Date.now();
    if (msg === lastSpoken && now - lastSpokenAt < cooldownMs) return;
    lastSpoken = msg;
    lastSpokenAt = now;
    speak(msg);
  };

  const getTheme = () => {
    if (prefs.contrast) return THEMES.highContrast;
    return THEMES[prefs.theme] || THEMES.normal;
  };

  // Helpers UI compartidos entre escenas
  function makeTextButton(scene, label, onClick) {
    const th = getTheme();
    const btn = scene.add
      .text(0, 16, label, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: th.btnText,
        backgroundColor: Phaser.Display.Color.IntegerToColor(th.btnFill).rgba,
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
      })
      .setOrigin(0, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => {
      const t = btn.text || "";
      if (t) say(t.replace(":", ""), 900);
    });

    return btn;
  }

  function layoutTopButtons(scene, btns) {
    const gap = 10;
    const padRight = 18;
    const y = 16;

    const widths = btns.map((b) => b.width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (btns.length - 1);

    let x = scene.scale.width - padRight - total;
    if (x < 24) x = 24;

    btns.forEach((b, i) => {
      b.setPosition(x, y);
      x += b.width + gap;
    });
  }

  function applyButtonStyles(scene, btns) {
    const th = getTheme();
    const btnBgCss = Phaser.Display.Color.IntegerToColor(th.btnFill).rgba;
    const btnColor = th.btnText;
    btns.forEach((b) => b.setStyle({ backgroundColor: btnBgCss, color: btnColor }));
  }

  // ---------------- Menu Scene (Dificultad) ----------------
  class MenuScene extends Phaser.Scene {
    constructor() {
      super("MenuScene");
    }

    create() {
      const th = getTheme();

      this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, th.bg).setOrigin(0);

      this.title = this.add.text(this.scale.width / 2, 86, "Contar y elegir", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: th.text,
      }).setOrigin(0.5);

      this.subtitle = this.add.text(this.scale.width / 2, 140, "Elige dificultad (rondas)", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: th.muted,
      }).setOrigin(0.5);

      // Top buttons
      this.ttsBtn = makeTextButton(this, prefs.ttsEnabled ? "Voz: ON" : "Voz: OFF", () => {
        prefs.ttsEnabled = !prefs.ttsEnabled;
        if (!prefs.ttsEnabled) stopVoice();
        savePrefs(prefs);
        this.refreshUI();
        say(prefs.ttsEnabled ? "Voz activada" : "Voz desactivada", 0);
      });

      this.contrastBtn = makeTextButton(this, prefs.contrast ? "Contraste: ON" : "Contraste: OFF", () => {
        prefs.contrast = !prefs.contrast;
        savePrefs(prefs);
        this.refreshUI();
        say(prefs.contrast ? "Contraste alto activado" : "Contraste alto desactivado", 0);
      });

      this.themeBtn = makeTextButton(this, `Tema: ${prefs.theme}`, () => {
        const order = ["normal", "protanopia", "tritanopia"];
        const idx = order.indexOf(prefs.theme);
        prefs.theme = order[(idx + 1) % order.length];
        savePrefs(prefs);
        this.refreshUI();
        say(`Tema ${prefs.theme}`, 0);
      });

      this.exitBtn = makeTextButton(this, "Salir", () => {
        stopVoice();
        if (typeof onExit === "function") onExit();
      });

      this.topBtns = [this.ttsBtn, this.contrastBtn, this.themeBtn, this.exitBtn];
      layoutTopButtons(this, this.topBtns);

      // Dificultades
      this.diffBtns = [];

      const startY = 240;
      const gapY = 86;

      roundsChoices.forEach((d, i) => {
        const y = startY + i * gapY;
        const w = Math.min(560, this.scale.width * 0.78);
        const h = 58;

        const box = this.add.rectangle(this.scale.width / 2, y, w, h, th.btnFill, 1)
          .setStrokeStyle(2, 0xffffff, th.btnStrokeAlpha)
          .setInteractive({ useHandCursor: true });

        const text = this.add.text(this.scale.width / 2, y, d.label, {
          fontFamily: "Arial",
          fontSize: "24px",
          color: th.btnText,
        }).setOrigin(0.5);

        box.on("pointerover", () => {
          box.setFillStyle(th.btnHover, 1);
          say(d.label, 900);
        });
        box.on("pointerout", () => box.setFillStyle(th.btnFill, 1));

        box.on("pointerdown", () => {
          // inicia el juego con las rondas elegidas
          this.scene.start("CountScene", { roundsTotal: d.rounds });
        });

        this.diffBtns.push({ box, text, rounds: d.rounds, label: d.label });
      });

      // Slider tamaño (en menú también, para que se note antes de jugar)
      this.scaleLabel = this.add.text(24, this.scale.height - 78, "Tamaño: 100%", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      this.scaleTrack = this.add.rectangle(170, this.scale.height - 68, 240, 10, 0xffffff, prefs.contrast ? 1 : 0.25).setOrigin(0, 0.5);
      this.scaleKnob = this.add.circle(170, this.scale.height - 68, 10, prefs.contrast ? th.accent : 0xffffff).setOrigin(0.5);

      this.scaleTrack.setInteractive({ useHandCursor: true });
      this.scaleKnob.setInteractive({ useHandCursor: true });

      const setScaleFromX = (x) => {
        const left = 170, right = left + 240;
        const clamped = clamp(x, left, right);
        const t = (clamped - left) / (right - left);
        prefs.uiScale = 0.9 + t * (1.6 - 0.9);
        savePrefs(prefs);
        this.refreshUI();
      };

      this.input.setDraggable(this.scaleKnob);
      this.scaleTrack.on("pointerdown", (p) => setScaleFromX(p.x));
      this.scaleKnob.on("drag", (_p, dragX) => setScaleFromX(dragX));

      // Atajos
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyT") this.ttsBtn.emit("pointerdown");
        if (e.code === "KeyC") this.contrastBtn.emit("pointerdown");
        if (e.code === "Escape") this.exitBtn.emit("pointerdown");
      });

      this.refreshUI();

      this.scale.on("resize", ({ width, height }) => {
        this.bg.setSize(width, height);
        this.title.setPosition(width / 2, 86);
        this.subtitle.setPosition(width / 2, 140);
        layoutTopButtons(this, this.topBtns);
        this.layoutBottomControls();
        this.layoutDiffButtons();
      });
    }

    layoutBottomControls() {
      this.scaleLabel.setPosition(24, this.scale.height - 78);
      const y = this.scale.height - 68;
      this.scaleTrack.setPosition(170, y);
      this.scaleKnob.setPosition(this.scaleKnob.x, y);
    }

    layoutDiffButtons() {
      const th = getTheme();
      const startY = 240;
      const gapY = 86;

      this.diffBtns.forEach((b, i) => {
        const y = startY + i * gapY;
        const w = Math.min(560, this.scale.width * 0.78);
        b.box.setPosition(this.scale.width / 2, y).setSize(w, 58);
        b.text.setPosition(this.scale.width / 2, y);
        b.box.setFillStyle(th.btnFill, 1).setStrokeStyle(2, 0xffffff, th.btnStrokeAlpha);
        b.text.setColor(th.btnText);
      });
    }

    refreshUI() {
      const th = getTheme();

      this.bg.setFillStyle(th.bg, 1);
      this.title.setColor(th.text);
      this.subtitle.setColor(th.muted);

      this.ttsBtn.setText(prefs.ttsEnabled ? "Voz: ON" : "Voz: OFF");
      this.contrastBtn.setText(prefs.contrast ? "Contraste: ON" : "Contraste: OFF");
      this.themeBtn.setText(`Tema: ${prefs.theme}`);

      applyButtonStyles(this, this.topBtns);
      layoutTopButtons(this, this.topBtns);

      // slider
      const pct = Math.round((prefs.uiScale / 1.0) * 100);
      this.scaleLabel.setText(`Tamaño: ${pct}%`).setColor(th.muted);
      this.scaleTrack.setFillStyle(0xffffff, prefs.contrast ? 1 : 0.25);
      this.scaleKnob.setFillStyle(prefs.contrast ? th.accent : 0xffffff, 1);

      const t = (prefs.uiScale - 0.9) / (1.6 - 0.9);
      const x = 170 + clamp(t, 0, 1) * 240;
      this.scaleKnob.setPosition(x, this.scaleTrack.y);

      this.layoutBottomControls();
      this.layoutDiffButtons();
    }
  }

  // ---------------- Count Scene (Juego) ----------------
  class CountScene extends Phaser.Scene {
    constructor() {
      super("CountScene");
    }

    init(data) {
      this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
    }

    create() {
      this.state = {
        startTime: Date.now(),
        attempts: 0,
        score: 0,
        round: 0,
        locked: false,
        correct: 0,
        options: [],
        objects: [],
        optionButtons: [],
      };

      const th = getTheme();

      this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, th.bg).setOrigin(0);

      this.title = this.add.text(24, 16, "Contar y elegir", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: th.text,
      });

      this.sub = this.add.text(24, 52, "Cuenta las pelotas y elige el número correcto.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      this.stats = this.add.text(24, 78, `Puntos: 0  •  Intentos: 0  •  Ronda: 0/${this.roundsTotal}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      // Top buttons (mismos)
      this.ttsBtn = makeTextButton(this, prefs.ttsEnabled ? "Voz: ON" : "Voz: OFF", () => {
        prefs.ttsEnabled = !prefs.ttsEnabled;
        if (!prefs.ttsEnabled) stopVoice();
        savePrefs(prefs);
        this.refreshUI();
        say(prefs.ttsEnabled ? "Voz activada" : "Voz desactivada", 0);
      });

      this.contrastBtn = makeTextButton(this, prefs.contrast ? "Contraste: ON" : "Contraste: OFF", () => {
        prefs.contrast = !prefs.contrast;
        savePrefs(prefs);
        this.refreshUI();
        say(prefs.contrast ? "Contraste alto activado" : "Contraste alto desactivado", 0);
      });

      this.themeBtn = makeTextButton(this, `Tema: ${prefs.theme}`, () => {
        const order = ["normal", "protanopia", "tritanopia"];
        const idx = order.indexOf(prefs.theme);
        prefs.theme = order[(idx + 1) % order.length];
        savePrefs(prefs);
        this.refreshUI();
        say(`Tema ${prefs.theme}`, 0);
      });

      // “Menú” (para cambiar dificultad) + “Salir”
      this.menuBtn = makeTextButton(this, "Menú", () => {
        stopVoice();
        this.scene.start("MenuScene");
      });

      this.exitBtn = makeTextButton(this, "Salir", () => {
        stopVoice();
        if (typeof onExit === "function") onExit();
      });

      this.topBtns = [this.ttsBtn, this.contrastBtn, this.themeBtn, this.menuBtn, this.exitBtn];
      layoutTopButtons(this, this.topBtns);

      // Slider tamaño (en juego)
      this.scaleLabel = this.add.text(24, this.scale.height - 78, "Tamaño: 100%", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      this.scaleTrack = this.add.rectangle(170, this.scale.height - 68, 240, 10, 0xffffff, prefs.contrast ? 1 : 0.25).setOrigin(0, 0.5);
      this.scaleKnob = this.add.circle(170, this.scale.height - 68, 10, prefs.contrast ? th.accent : 0xffffff).setOrigin(0.5);

      this.scaleTrack.setInteractive({ useHandCursor: true });
      this.scaleKnob.setInteractive({ useHandCursor: true });

      const setScaleFromX = (x) => {
        const left = 170, right = left + 240;
        const clamped = clamp(x, left, right);
        const t = (clamped - left) / (right - left);
        prefs.uiScale = 0.9 + t * (1.6 - 0.9);
        savePrefs(prefs);
        this.refreshUI();
      };

      this.input.setDraggable(this.scaleKnob);
      this.scaleTrack.on("pointerdown", (p) => setScaleFromX(p.x));
      this.scaleKnob.on("drag", (_p, dragX) => setScaleFromX(dragX));

      // Atajos
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyT") this.ttsBtn.emit("pointerdown");
        if (e.code === "KeyC") this.contrastBtn.emit("pointerdown");
        if (e.code === "Escape") this.exitBtn.emit("pointerdown");
      });

      this.refreshUI();
      this.newRound(true);

      this.scale.on("resize", ({ width, height }) => {
        this.bg.setSize(width, height);
        layoutTopButtons(this, this.topBtns);
        this.layoutBottomControls();
        this.layoutRound();
      });
    }

    layoutBottomControls() {
      this.scaleLabel.setPosition(24, this.scale.height - 78);
      const y = this.scale.height - 68;
      this.scaleTrack.setPosition(170, y);
      this.scaleKnob.setPosition(this.scaleKnob.x, y);
    }

    refreshUI() {
      const th = getTheme();

      this.bg.setFillStyle(th.bg, 1);
      this.title.setColor(th.text);
      this.sub.setColor(th.muted);
      this.stats.setColor(th.muted);

      this.ttsBtn.setText(prefs.ttsEnabled ? "Voz: ON" : "Voz: OFF");
      this.contrastBtn.setText(prefs.contrast ? "Contraste: ON" : "Contraste: OFF");
      this.themeBtn.setText(`Tema: ${prefs.theme}`);

      applyButtonStyles(this, this.topBtns);
      layoutTopButtons(this, this.topBtns);

      const pct = Math.round((prefs.uiScale / 1.0) * 100);
      this.scaleLabel.setText(`Tamaño: ${pct}%`).setColor(th.muted);
      this.scaleTrack.setFillStyle(0xffffff, prefs.contrast ? 1 : 0.25);
      this.scaleKnob.setFillStyle(prefs.contrast ? th.accent : 0xffffff, 1);

      const t = (prefs.uiScale - 0.9) / (1.6 - 0.9);
      const x = 170 + clamp(t, 0, 1) * 240;
      this.scaleKnob.setPosition(x, this.scaleTrack.y);

      this.layoutBottomControls();
      this.layoutRound();
    }

    // ---------- Animaciones feedback ----------
    animateCorrect() {
      const th = getTheme();
      const s = prefs.uiScale;

      this.tweens.add({
        targets: this.bg,
        alpha: { from: 1, to: 0.86 },
        yoyo: true,
        duration: 120,
        repeat: 2,
      });

      this.state.objects.forEach((obj, i) => {
        this.tweens.add({
          targets: obj,
          scale: { from: 1, to: 1.12 },
          yoyo: true,
          duration: 150,
          delay: i * 40,
          ease: "Back.Out",
        });
      });

      const correct = this.state.correct;
      const btn = this.state.optionButtons.find((b) => b.value === correct);
      if (btn?.bg) {
        this.tweens.add({
          targets: btn.bg,
          scale: { from: 1, to: 1.1 },
          yoyo: true,
          duration: 170,
          repeat: 1,
          ease: "Back.Out",
        });

        const oldFill = btn.bg.fillColor;
        btn.bg.setFillStyle(th.accent, 1);
        this.time.delayedCall(340, () => btn.bg.setFillStyle(oldFill, 1));
      }

      // ✔ grande
      const overlay = this.add.container(this.scale.width / 2, 120 * s).setDepth(3000);

      const panelW = Math.min(520, this.scale.width * 0.86);
      const panelH = 120 * s;

      const panel = this.add
        .rectangle(0, 0, panelW, panelH, th.panel, prefs.contrast ? 1 : 0.9)
        .setStrokeStyle(2, 0xffffff, prefs.contrast ? 1 : 0.15);

      const icon = this.add.text(-panelW * 0.28, 0, "✔", {
        fontFamily: "Arial",
        fontSize: `${Math.round(82 * s)}px`,
        color: prefs.contrast ? "#000000" : "#ffffff",
      }).setOrigin(0.5);

      const text = this.add.text(panelW * 0.06, 0, "¡Bien!", {
        fontFamily: "Arial",
        fontSize: `${Math.round(46 * s)}px`,
        color: th.text,
      }).setOrigin(0.5);

      overlay.add([panel, icon, text]);
      overlay.setAlpha(0);

      this.tweens.add({
        targets: overlay,
        alpha: { from: 0, to: 1 },
        duration: 120,
        yoyo: true,
        hold: 520,
        onComplete: () => overlay.destroy(true),
      });
    }

    animateWrong() {
      const th = getTheme();
      const s = prefs.uiScale;

      this.tweens.add({
        targets: [this.title, this.sub, this.stats],
        x: "+=8",
        yoyo: true,
        repeat: 3,
        duration: 60,
      });

      const flashColor = prefs.contrast ? 0xffffff : th.panel;
      const overlayFlash = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, flashColor, 0.18)
        .setOrigin(0)
        .setDepth(2500);

      this.tweens.add({
        targets: overlayFlash,
        alpha: { from: 0.22, to: 0 },
        duration: 260,
        onComplete: () => overlayFlash.destroy(),
      });

      // ✖ grande
      const overlay = this.add.container(this.scale.width / 2, 120 * s).setDepth(3000);

      const panelW = Math.min(560, this.scale.width * 0.9);
      const panelH = 130 * s;

      const panel = this.add
        .rectangle(0, 0, panelW, panelH, th.panel, prefs.contrast ? 1 : 0.9)
        .setStrokeStyle(2, 0xffffff, prefs.contrast ? 1 : 0.15);

      const icon = this.add.text(-panelW * 0.28, 0, "✖", {
        fontFamily: "Arial",
        fontSize: `${Math.round(78 * s)}px`,
        color: prefs.contrast ? "#000000" : "#ffffff",
      }).setOrigin(0.5);

      const text = this.add.text(panelW * 0.08, 0, "Intenta otra vez", {
        fontFamily: "Arial",
        fontSize: `${Math.round(38 * s)}px`,
        color: th.text,
      }).setOrigin(0.5);

      overlay.add([panel, icon, text]);
      overlay.setAlpha(0);

      this.tweens.add({
        targets: overlay,
        alpha: { from: 0, to: 1 },
        duration: 120,
        yoyo: true,
        hold: 560,
        onComplete: () => overlay.destroy(true),
      });
    }

    // ---------- Rondas ----------
    newRound(isFirst = false) {
      const correct = randInt(minCount, maxCount);
      const options = pickDistinctNumbers(correct, minCount, maxCount, 3);

      this.state.correct = correct;
      this.state.options = options;
      this.state.round += 1;
      this.state.locked = false;

      this.clearRoundObjects();
      this.buildObjects(correct);
      this.buildOptions(options);

      this.stats.setText(
        `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}  •  Ronda: ${this.state.round}/${this.roundsTotal}`
      );

      if (prefs.ttsEnabled) {
        say(`Ronda ${this.state.round} de ${this.roundsTotal}. Cuenta las pelotas.`, 0);
        if (isFirst) say("Si quieres, activa la voz con el botón Voz.", 0);
      }
    }

    clearRoundObjects() {
      this.state.objects.forEach((o) => o.destroy(true));
      this.state.objects = [];

      this.state.optionButtons.forEach((b) => {
        b.bg.destroy();
        b.txt.destroy();
      });
      this.state.optionButtons = [];
    }

    buildObjects(count) {
      const th = getTheme();
      const s = prefs.uiScale;
      const r = (54 * s) / 2;

      for (let i = 0; i < count; i++) {
        const obj = makeBall(this, 0, 0, r, th, prefs.contrast);
        obj.on("pointerover", () => say(`Pelota ${i + 1} de ${count}.`, 800));
        this.state.objects.push(obj);
      }

      say(`${count} pelotas en pantalla.`, 0);
      this.layoutRound();
    }

    buildOptions(options) {
      const th = getTheme();

      options.forEach((num) => {
        const bg = this.add
          .rectangle(0, 0, 120, 56, th.btnFill, 1)
          .setStrokeStyle(2, 0xffffff, th.btnStrokeAlpha);

        const txt = this.add
          .text(0, 0, String(num), {
            fontFamily: "Arial",
            fontSize: "26px",
            color: th.btnText,
          })
          .setOrigin(0.5);

        bg.setInteractive({ useHandCursor: true });

        bg.on("pointerover", () => {
          say(`Botón ${num}`, 800);
          bg.setFillStyle(th.btnHover, 1);
        });
        bg.on("pointerout", () => bg.setFillStyle(th.btnFill, 1));

        bg.on("pointerdown", () => this.pickAnswer(num));

        this.state.optionButtons.push({ bg, txt, value: num });
      });

      this.layoutRound();
    }

    /**
     * ✅ Layout con 1 o 2 filas AUTOMÁTICO.
     * Si no caben en una fila con el uiScale actual, las pasa a 2 filas.
     */
    layoutObjectsTwoRows(th) {
      const s = prefs.uiScale;
      const W = this.scale.width;

      const topAreaY = 120;
      const objSize = 54 * s;
      const desiredR = objSize / 2;
      const gap = 18 * s;

      const objs = this.state.objects;
      const n = objs.length;
      if (!n) return;

      // área horizontal “segura”
      const leftPad = 24;
      const rightPad = 24;
      const areaW = W - leftPad - rightPad;

      const totalW1 = n * objSize + (n - 1) * gap;

      // si cabe: 1 fila
      if (totalW1 <= areaW) {
        const startX = leftPad + (areaW - totalW1) / 2;
        const y = topAreaY + 120 * s;

        for (let i = 0; i < n; i++) {
          const x = startX + i * (objSize + gap) + objSize / 2;
          this.placeAndRestyleObject(i, x, y, desiredR, th, n);
        }
        return;
      }

      // si NO cabe: 2 filas
      const topCount = Math.ceil(n / 2);
      const bottomCount = n - topCount;

      const totalWTop = topCount * objSize + (topCount - 1) * gap;
      const totalWBot = bottomCount > 0 ? bottomCount * objSize + (bottomCount - 1) * gap : 0;

      const startTopX = leftPad + Math.max(0, (areaW - totalWTop) / 2);
      const startBotX = leftPad + Math.max(0, (areaW - totalWBot) / 2);

      const y1 = topAreaY + 96 * s;
      const y2 = topAreaY + 160 * s;

      // fila 1
      for (let i = 0; i < topCount; i++) {
        const x = startTopX + i * (objSize + gap) + objSize / 2;
        this.placeAndRestyleObject(i, x, y1, desiredR, th, n);
      }

      // fila 2
      for (let j = 0; j < bottomCount; j++) {
        const idx = topCount + j;
        const x = startBotX + j * (objSize + gap) + objSize / 2;
        this.placeAndRestyleObject(idx, x, y2, desiredR, th, n);
      }
    }

    placeAndRestyleObject(index, x, y, desiredR, th, totalCount) {
      const obj = this.state.objects[index];
      obj.setPosition(x, y);

      const parts = obj._parts;
      if (!parts) return;

      // si el radio cambió mucho, recrea el objeto para que la carita no se vea rara
      if (Math.abs(desiredR - parts.r) > 6) {
        const old = obj;
        const idx = index;

        const newObj = makeBall(this, x, y, desiredR, th, prefs.contrast);
        newObj.on("pointerover", () => say(`Pelota ${idx + 1} de ${totalCount}.`, 800));

        old.destroy(true);
        this.state.objects[idx] = newObj;
        return;
      }

      parts.ball.setFillStyle(th.objFill, 1);
      parts.ball.setStrokeStyle(Math.max(2, 3 * prefs.uiScale), th.objStroke, 1);
      parts.shine.setFillStyle(0xffffff, prefs.contrast ? 0.28 : 0.18);

      parts.g.clear();
      const faceLine = prefs.contrast ? 0x000000 : 0x0b1020;
      parts.g.lineStyle(Math.max(2, desiredR * 0.09), faceLine, 0.95);
      parts.g.strokeCircle(-desiredR * 0.18, -desiredR * 0.05, desiredR * 0.06);
      parts.g.strokeCircle(desiredR * 0.18, -desiredR * 0.05, desiredR * 0.06);
      parts.g.beginPath();
      parts.g.arc(0, desiredR * 0.12, desiredR * 0.18, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
      parts.g.strokePath();
    }

    layoutRound() {
      const th = getTheme();
      const s = prefs.uiScale;

      // Pelotas: 1 fila o 2 filas automático
      this.layoutObjectsTwoRows(th);

      // Botones de respuesta
      const opts = this.state.optionButtons;
      if (opts.length) {
        const W = this.scale.width;
        const H = this.scale.height;

        const bottomAreaY = H - 170;
        const btnW = 130 * s;
        const btnH = 58 * s;
        const btnGap = 18 * s;

        const total = opts.length * btnW + (opts.length - 1) * btnGap;
        let x0 = (W - total) / 2;
        const y = bottomAreaY;

        opts.forEach((b, i) => {
          const cx = x0 + i * (btnW + btnGap) + btnW / 2;
          b.bg.setPosition(cx, y).setSize(btnW, btnH);
          b.txt.setPosition(cx, y).setFontSize(Math.round(28 * s));

          b.bg.setFillStyle(th.btnFill, 1).setStrokeStyle(2, 0xffffff, th.btnStrokeAlpha);
          b.txt.setColor(th.btnText);
        });
      }
    }

    pickAnswer(value) {
      if (this.state.locked) return;
      this.state.locked = true;

      this.state.attempts += 1;
      const correct = this.state.correct;

      const isOk = value === correct;

      if (isOk) {
        this.state.score += 1;
        say("Correcto.", 0);
        this.animateCorrect();
      } else {
        say(`Incorrecto. Eran ${correct}.`, 0);
        this.animateWrong();
      }

      this.stats.setText(
        `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}  •  Ronda: ${this.state.round}/${this.roundsTotal}`
      );

      this.time.delayedCall(1200, () => {
        if (this.state.round >= this.roundsTotal) {
          const durationMs = Date.now() - this.state.startTime;
          stopVoice();
          if (typeof onFinish === "function") {
            onFinish({
              score: this.state.score,
              attempts: this.state.attempts,
              durationMs,
              roundsPlayed: this.state.round,
              roundsTotal: this.roundsTotal,
            });
          }
          return;
        }
        this.newRound();
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 900,
    height: 650,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [MenuScene, CountScene],
  });

  return () => {
    stopVoice();
    game.destroy(true);
  };
}