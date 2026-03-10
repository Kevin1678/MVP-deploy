import Phaser from "phaser";

/* ----------------- Voz ----------------- */
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

/* ----------------- Utils ----------------- */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/* ----------------- Temas ----------------- */
const THEMES = {
  normal: {
    bg: 0x0b1020,
    panel: 0x111827,
    text: "#ffffff",
    muted: "#cbd5e1",
    accent: 0x22c55e,
    tile: 0x111827,
    tileStroke: 0xffffff,
    tileStrokeAlpha: 0.12,
    tileActive: 0x60a5fa,
    tileActive2: 0xfbbf24,
    btnFill: 0x111827,
    btnHover: 0x1f2937,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.14,
    focusStroke: 0x22c55e,
  },
  protanopia: {
    bg: 0x0b1020,
    panel: 0x0f172a,
    text: "#ffffff",
    muted: "#e2e8f0",
    accent: 0xfbbf24,
    tile: 0x0f172a,
    tileStroke: 0xffffff,
    tileStrokeAlpha: 0.16,
    tileActive: 0x38bdf8,
    tileActive2: 0xa78bfa,
    btnFill: 0x0f172a,
    btnHover: 0x1e293b,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.18,
    focusStroke: 0xfbbf24,
  },
  tritanopia: {
    bg: 0x0b1020,
    panel: 0x111827,
    text: "#ffffff",
    muted: "#e2e8f0",
    accent: 0xa78bfa,
    tile: 0x111827,
    tileStroke: 0xffffff,
    tileStrokeAlpha: 0.16,
    tileActive: 0x34d399,
    tileActive2: 0xfbbf24,
    btnFill: 0x111827,
    btnHover: 0x1f2937,
    btnText: "#ffffff",
    btnStrokeAlpha: 0.16,
    focusStroke: 0xa78bfa,
  },
  highContrast: {
    bg: 0x000000,
    panel: 0x000000,
    text: "#ffffff",
    muted: "#ffffff",
    accent: 0xffffff,
    tile: 0x000000,
    tileStroke: 0xffffff,
    tileStrokeAlpha: 1,
    tileActive: 0xffffff,
    tileActive2: 0xffffff,
    btnFill: 0xffffff,
    btnHover: 0xffffff,
    btnText: "#000000",
    btnStrokeAlpha: 1,
    focusStroke: 0xffffff,
  },
};

/* ----------------- Prefs ----------------- */
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

/* ----------------- Posiciones habladas ----------------- */
function posName(r, c) {
  const row = r === 0 ? "arriba" : r === 1 ? "centro" : "abajo";
  const col = c === 0 ? "izquierda" : c === 1 ? "centro" : "derecha";
  if (row === "centro" && col === "centro") return "centro";
  if (row === "centro") return `centro ${col}`;
  if (col === "centro") return `${row} centro`;
  return `${row} ${col}`;
}

export function createLightsSequenceGame(parentId, onFinish, onExit, options = {}) {
  const prefs = loadPrefs();

  // anti-spam voz
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

  const getTheme = () => (prefs.contrast ? THEMES.highContrast : (THEMES[prefs.theme] || THEMES.normal));

  const difficultyChoices =
    Array.isArray(options.difficultyChoices) && options.difficultyChoices.length
      ? options.difficultyChoices
      : [
          { label: "Fácil (3 pasos)", difficulty: "easy", steps: 3, speedMs: 650, rounds: 5 },
          { label: "Medio (4 pasos)", difficulty: "medium", steps: 4, speedMs: 520, rounds: 7 },
          { label: "Difícil (5 pasos)", difficulty: "hard", steps: 5, speedMs: 420, rounds: 10 },
        ];

  /* ------------- UI Helpers ------------- */
  function makeTextButton(scene, label, onClick) {
    const th = getTheme();
    const btn = scene.add.text(0, 16, label, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: th.btnText,
      backgroundColor: Phaser.Display.Color.IntegerToColor(th.btnFill).rgba,
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    }).setOrigin(0, 0).setDepth(50).setInteractive({ useHandCursor: true });

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

    const total = btns.reduce((sum, b) => sum + b.width, 0) + gap * (btns.length - 1);
    let x = scene.scale.width - padRight - total;
    if (x < 24) x = 24;

    btns.forEach((b) => {
      b.setPosition(x, y);
      x += b.width + gap;
    });
  }

  function applyTopButtonStyles(btns) {
    const th = getTheme();
    const bgCss = Phaser.Display.Color.IntegerToColor(th.btnFill).rgba;
    btns.forEach((b) => b.setStyle({ backgroundColor: bgCss, color: th.btnText }));
  }

  /* ---------------- Menu Scene ---------------- */
  class MenuScene extends Phaser.Scene {
    constructor() { super("MenuScene"); }

    create() {
      const th = getTheme();

      this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, th.bg).setOrigin(0);

      this.title = this.add.text(this.scale.width / 2, 84, "Secuencia de luces", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: th.text,
      }).setOrigin(0.5);

      this.subtitle = this.add.text(this.scale.width / 2, 140, "Repite la secuencia (elige dificultad)", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: th.muted,
      }).setOrigin(0.5);

      // top buttons
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

      // slider tamaño
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

      // botones dificultad
      this.diff = [];
      const startY = 240;
      const gapY = 86;

      difficultyChoices.forEach((d, i) => {
        const y = startY + i * gapY;
        const w = Math.min(600, this.scale.width * 0.80);
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
          this.scene.start("LightsScene", {
            difficulty: d.difficulty,
            steps: d.steps,
            speedMs: d.speedMs,
            roundsTotal: d.rounds,
          });
        });

        this.diff.push({ box, text, d });
      });

      // teclado
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyT") this.ttsBtn.emit("pointerdown");
        if (e.code === "KeyC") this.contrastBtn.emit("pointerdown");
        if (e.code === "Escape") this.exitBtn.emit("pointerdown");
      });

      this.refreshUI();

      this.scale.on("resize", ({ width, height }) => {
        this.bg.setSize(width, height);
        this.title.setPosition(width / 2, 84);
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

      this.diff.forEach((b, i) => {
        const y = startY + i * gapY;
        const w = Math.min(600, this.scale.width * 0.80);
        b.box.setPosition(this.scale.width / 2, y).setSize(w, 58);
        b.text.setPosition(this.scale.width / 2, y).setColor(th.btnText);
        b.box.setFillStyle(th.btnFill, 1).setStrokeStyle(2, 0xffffff, th.btnStrokeAlpha);
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

      applyTopButtonStyles(this.topBtns);
      layoutTopButtons(this, this.topBtns);

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

  /* ---------------- Game Scene ---------------- */
  class LightsScene extends Phaser.Scene {
    constructor() { super("LightsScene"); }

    init(data) {
      this.difficulty = data?.difficulty || "easy";
      this.steps = Number.isFinite(data?.steps) ? data.steps : 3;
      this.speedMs = Number.isFinite(data?.speedMs) ? data.speedMs : 650;
      this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
    }

    create() {
      const th = getTheme();
      const s = prefs.uiScale;

      this.state = {
        startTime: Date.now(),
        round: 0,
        score: 0,
        attempts: 0,
        locked: true,
        phase: "show",
        sequence: [],
        inputIndex: 0,
        tiles: [],
        focusIndex: 0, // teclado
      };

      this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, th.bg).setOrigin(0);

      this.title = this.add.text(24, 16, "Secuencia de luces", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: th.text,
      });

      this.sub = this.add.text(24, 52, "Mira la secuencia y repítela.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      this.stats = this.add.text(24, 78, `Puntos: 0 • Intentos: 0 • Ronda: 0/${this.roundsTotal}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: th.muted,
      });

      // top buttons
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

      // slider tamaño
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

      // construir grid 3x3
      this.buildGrid();

      // teclado: navegación + seleccionar
      this.initKeyboard();

      this.refreshUI();
      this.applyFocus(0, true);
      this.nextRound(true);

      this.scale.on("resize", ({ width, height }) => {
        this.bg.setSize(width, height);
        layoutTopButtons(this, this.topBtns);
        this.layoutBottomControls();
        this.layoutGrid();
        this.applyFocus(this.state.focusIndex, true);
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

      applyTopButtonStyles(this.topBtns);
      layoutTopButtons(this, this.topBtns);

      const pct = Math.round((prefs.uiScale / 1.0) * 100);
      this.scaleLabel.setText(`Tamaño: ${pct}%`).setColor(th.muted);
      this.scaleTrack.setFillStyle(0xffffff, prefs.contrast ? 1 : 0.25);
      this.scaleKnob.setFillStyle(prefs.contrast ? th.accent : 0xffffff, 1);

      const t = (prefs.uiScale - 0.9) / (1.6 - 0.9);
      const x = 170 + clamp(t, 0, 1) * 240;
      this.scaleKnob.setPosition(x, this.scaleTrack.y);

      this.layoutBottomControls();

      this.state.tiles.forEach((tile) => {
        tile.bg.setFillStyle(th.tile, 1);
        tile.bg.setStrokeStyle(3, th.tileStroke, th.tileStrokeAlpha);
        tile.lbl.setColor(th.text);
      });

      // re-aplica foco visible
      this.applyFocus(this.state.focusIndex, true);
    }

    /* --------- GRID (FIX HITBOX) --------- */
    buildGrid() {
      const th = getTheme();
      const s = prefs.uiScale;

      const tiles = [];

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const bg = this.add.rectangle(0, 0, 120 * s, 110 * s, th.tile, 1)
            .setStrokeStyle(3, th.tileStroke, th.tileStrokeAlpha);

          const code = String.fromCharCode(65 + r) + String(c + 1);
          const lbl = this.add.text(0, 0, code, {
            fontFamily: "Arial",
            fontSize: `${Math.round(28 * s)}px`,
            color: th.text,
          }).setOrigin(0.5);

          // foco visible (borde extra) dentro del container
          const focus = this.add.rectangle(0, 0, bg.width + 10, bg.height + 10, 0x000000, 0)
            .setStrokeStyle(4, th.focusStroke, 0.0) // invisible al inicio
            .setVisible(true);

          const container = this.add.container(0, 0, [bg, lbl, focus]);

          // ✅ SOLUCIÓN: usa el bg como área interactiva REAL (así no se descuadra)
          bg.setInteractive({ useHandCursor: true });

          const name = posName(r, c);

          bg.on("pointerover", () => {
            this.applyFocus(r * 3 + c, true);
            say(name, 700);
          });

          bg.on("pointerdown", () => this.onTilePress(r, c));

          tiles.push({ r, c, name, code, container, bg, lbl, focus });
        }
      }

      this.state.tiles = tiles;
      this.layoutGrid();
    }

    layoutGrid() {
      const s = prefs.uiScale;
      const W = this.scale.width;
      const H = this.scale.height;

      const topPad = 120;
      const bottomPad = 140;

      const areaH = H - topPad - bottomPad;
      const centerY = topPad + areaH * 0.52;

      const tileW = 120 * s;
      const tileH = 110 * s;
      const gap = 18 * s;

      const totalW = tileW * 3 + gap * 2;
      const totalH = tileH * 3 + gap * 2;

      const startX = (W - totalW) / 2 + tileW / 2;
      const startY = centerY - totalH / 2 + tileH / 2;

      this.state.tiles.forEach((t) => {
        const x = startX + t.c * (tileW + gap);
        const y = startY + t.r * (tileH + gap);

        t.container.setPosition(x, y);

        t.bg.setSize(tileW, tileH);
        t.lbl.setFontSize(Math.round(28 * s));

        t.focus.setSize(tileW + 10, tileH + 10);

        // ✅ el área interactiva es el bg, así que su hitbox se actualiza con displaySize
        t.bg.input?.hitArea?.setTo(-tileW/2, -tileH/2, tileW, tileH); // extra seguro
      });
    }

    /* --------- Keyboard nav --------- */
    initKeyboard() {
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyT") return this.ttsBtn.emit("pointerdown");
        if (e.code === "KeyC") return this.contrastBtn.emit("pointerdown");
        if (e.code === "Escape") return this.exitBtn.emit("pointerdown");

        // si está mostrando secuencia, no se permite input
        if (this.state.locked) return;

        const idx = this.state.focusIndex;
        const r = Math.floor(idx / 3);
        const c = idx % 3;

        let nr = r, nc = c;

        if (e.code === "ArrowLeft") nc = clamp(c - 1, 0, 2);
        if (e.code === "ArrowRight") nc = clamp(c + 1, 0, 2);
        if (e.code === "ArrowUp") nr = clamp(r - 1, 0, 2);
        if (e.code === "ArrowDown") nr = clamp(r + 1, 0, 2);

        const next = nr * 3 + nc;

        if (next !== idx && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)) {
          this.applyFocus(next);
          return;
        }

        if (e.code === "Enter" || e.code === "Space") {
          const t = this.state.tiles[this.state.focusIndex];
          if (t) this.onTilePress(t.r, t.c);
        }
      });
    }

    applyFocus(index, silent = false) {
      const th = getTheme();

      // limpia anterior
      const prev = this.state.tiles[this.state.focusIndex];
      if (prev?.focus) prev.focus.setStrokeStyle(4, th.focusStroke, 0.0);

      this.state.focusIndex = index;

      const tile = this.state.tiles[index];
      if (!tile) return;

      tile.focus.setStrokeStyle(4, th.focusStroke, 1);

      if (!silent) {
        say(tile.name, 600);
      }
    }

    /* ------------- Juego ------------- */
    nextRound(isFirst = false) {
      this.state.round += 1;
      this.state.attempts += 1;

      this.state.locked = true;
      this.state.phase = "show";
      this.state.inputIndex = 0;

      // genera secuencia (sin repetir consecutivo)
      const all = this.state.tiles.map((t) => ({ r: t.r, c: t.c }));
      let seq = [];
      let prev = null;

      for (let i = 0; i < this.steps; i++) {
        const choices = all.filter((p) => !(prev && p.r === prev.r && p.c === prev.c));
        const pick = choices[randInt(0, choices.length - 1)];
        seq.push(pick);
        prev = pick;
      }

      this.state.sequence = seq;

      this.stats.setText(
        `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
      );

      if (prefs.ttsEnabled) {
        say(`Ronda ${this.state.round}. Observa la secuencia.`, 0);
        if (isFirst) say("Usa flechas y Enter si no quieres usar mouse.", 0);
      }

      this.playSequence();
    }

    findTile(r, c) {
      return this.state.tiles.find((t) => t.r === r && t.c === c);
    }

    async playSequence() {
      const th = getTheme();
      const speed = this.speedMs;

      this.time.delayedCall(350, async () => {
        for (let i = 0; i < this.state.sequence.length; i++) {
          const { r, c } = this.state.sequence[i];
          const tile = this.findTile(r, c);
          if (!tile) continue;

          if (prefs.ttsEnabled) say(tile.name, 0);

          const originalFill = tile.bg.fillColor;
          tile.bg.setFillStyle(th.tileActive, 1);
          tile.bg.setStrokeStyle(5, 0xffffff, prefs.contrast ? 1 : 0.55);

          this.tweens.add({
            targets: tile.container,
            scale: { from: 1, to: 1.05 },
            yoyo: true,
            duration: Math.max(180, speed * 0.35),
          });

          await new Promise((res) => this.time.delayedCall(speed, res));

          tile.bg.setFillStyle(originalFill, 1);
          tile.bg.setStrokeStyle(3, th.tileStroke, th.tileStrokeAlpha);

          await new Promise((res) => this.time.delayedCall(Math.max(120, speed * 0.20), res));
        }

        this.state.phase = "input";
        this.state.locked = false;

        if (prefs.ttsEnabled) say("Tu turno. Repite la secuencia.", 0);
      });
    }

    onTilePress(r, c) {
      if (this.state.locked || this.state.phase !== "input") return;

      const tile = this.findTile(r, c);
      if (!tile) return;

      // al click, mueve foco ahí también
      this.applyFocus(r * 3 + c, true);

      const th = getTheme();
      const old = tile.bg.fillColor;
      tile.bg.setFillStyle(th.tileActive2, 1);
      this.time.delayedCall(160, () => tile.bg.setFillStyle(old, 1));

      if (prefs.ttsEnabled) say(tile.name, 0);

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
      this.state.locked = true;
      this.state.score += 1;

      say("Correcto.", 0);
      this.showOverlayIcon(true);

      this.time.delayedCall(900, () => {
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
              difficulty: this.difficulty,
            });
          }
          return;
        }
        this.nextRound();
      });
    }

    failFeedback() {
      this.state.locked = true;
      say("Incorrecto.", 0);
      this.showOverlayIcon(false);

      this.tweens.add({
        targets: [this.title, this.sub, this.stats],
        x: "+=8",
        yoyo: true,
        repeat: 3,
        duration: 60,
      });

      this.time.delayedCall(1000, () => {
        this.state.phase = "show";
        this.state.locked = true;
        this.state.inputIndex = 0;
        say("Mira otra vez.", 0);
        this.playSequence();
      });
    }

    showOverlayIcon(ok) {
      const th = getTheme();
      const s = prefs.uiScale;

      const overlay = this.add.container(this.scale.width / 2, 120 * s).setDepth(3000);

      const panelW = Math.min(560, this.scale.width * 0.90);
      const panelH = 130 * s;

      const panel = this.add.rectangle(0, 0, panelW, panelH, th.panel, prefs.contrast ? 1 : 0.9)
        .setStrokeStyle(2, 0xffffff, prefs.contrast ? 1 : 0.15);

      const icon = this.add.text(-panelW * 0.28, 0, ok ? "✔" : "✖", {
        fontFamily: "Arial",
        fontSize: `${Math.round(78 * s)}px`,
        color: prefs.contrast ? "#000000" : "#ffffff",
      }).setOrigin(0.5);

      const text = this.add.text(panelW * 0.08, 0, ok ? "¡Bien!" : "Intenta otra vez", {
        fontFamily: "Arial",
        fontSize: `${Math.round((ok ? 44 : 36) * s)}px`,
        color: th.text,
      }).setOrigin(0.5);

      overlay.add([panel, icon, text]);
      overlay.setAlpha(0);

      this.tweens.add({
        targets: overlay,
        alpha: { from: 0, to: 1 },
        duration: 120,
        yoyo: true,
        hold: ok ? 420 : 520,
        onComplete: () => overlay.destroy(true),
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 900,
    height: 650,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [MenuScene, LightsScene],
  });

  return () => {
    stopVoice();
    game.destroy(true);
  };
}
