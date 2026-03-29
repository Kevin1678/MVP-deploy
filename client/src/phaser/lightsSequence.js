import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
  PANEL_GAP,
} from "./a11yPanel";

const TILE_DEFS = [
  { hex: "#D74663", colorName: "rosa" },
  { hex: "#7C3F8C", colorName: "morado" },
  { hex: "#AED13F", colorName: "verde limón" },
  { hex: "#F2A413", colorName: "amarillo naranja" },
  { hex: "#D23806", colorName: "rojo naranja" },
  { hex: "#288896", colorName: "azul petróleo" },
  { hex: "#AB6831", colorName: "café" },
  { hex: "#5CFAC7", colorName: "turquesa" },
  { hex: "#FAF37F", colorName: "amarillo claro" },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function contentLeft(scene) {
  const panelW = scene.a11yPanel?.getWidth?.() ?? 290;
  return 16 + panelW + (PANEL_GAP ?? 16);
}

function hexToNumber(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

function mixColors(colorA, colorB, amount = 0.25) {
  const ar = (colorA >> 16) & 0xff;
  const ag = (colorA >> 8) & 0xff;
  const ab = colorA & 0xff;

  const br = (colorB >> 16) & 0xff;
  const bg = (colorB >> 8) & 0xff;
  const bb = colorB & 0xff;

  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const b = Math.round(ab + (bb - ab) * amount);

  return (r << 16) | (g << 8) | b;
}

function getScales(scene) {
  return {
    ui: scene?.a11y?.uiScale || 1,
    ts: scene?.a11y?.textScale || 1,
  };
}

function fitFont(base, ts, min = 12) {
  return Math.max(min, Math.round(base * ts));
}

function colorToCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function getButtonPalette(scene, variant = "default") {
  const theme = getA11yTheme(scene.a11y || {});
  const hc = !!scene.a11y?.highContrast;

  if (variant === "primary") {
    if (hc) {
      return {
        fill: 0x000000,
        strokeColor: 0x000000,
        strokeAlpha: 1,
        textColor: "#ffffff",
      };
    }
    return {
      fill: theme.primary,
      strokeColor: theme.tileStroke,
      strokeAlpha: 0.28,
      textColor: "#ffffff",
    };
  }

  if (variant === "danger") {
    if (hc) {
      return {
        fill: 0x222222,
        strokeColor: 0x000000,
        strokeAlpha: 1,
        textColor: "#ffffff",
      };
    }
    return {
      fill: 0xdc2626,
      strokeColor: theme.tileStroke,
      strokeAlpha: 0.28,
      textColor: "#ffffff",
    };
  }

  return {
    fill: theme.buttonFill,
    strokeColor: theme.tileStroke,
    strokeAlpha: hc ? 1 : theme.buttonStrokeAlpha,
    textColor: theme.buttonText,
  };
}

function styleTextButton(textObj, scene, variant = "default", baseFont = 16) {
  const palette = getButtonPalette(scene, variant);
  const { ts } = getScales(scene);

  textObj.setStyle({
    color: palette.textColor,
    backgroundColor: colorToCss(palette.fill),
  });

  textObj.setFontSize(fitFont(baseFont, ts));
}

function makeTopLeftButton(scene, label, onClick, depth = 10, opts = {}) {
  let w = opts.width ?? 160;
  let h = opts.height ?? 60;
  let x0 = 0;
  let y0 = 0;
  let enabled = true;
  let variant = opts.variant ?? "default";
  let baseFont = opts.baseFont ?? 28;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14)
    .setDepth(depth);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, label, {
      fontFamily: "Arial",
      fontSize: `${baseFont}px`,
      color: "#ffffff",
      align: "center",
      wordWrap: { width: Math.max(100, w - 20) },
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => {
    if (!enabled) return;
    speakIfEnabled(scene, `Botón ${label}`, {
      delayMs: 160,
      minGapMs: 380,
      rate: 0.96,
    });
  });

  hit.on("pointerdown", () => {
    if (!enabled) return;
    onClick?.();
  });

  function refreshTextPos() {
    text.setPosition(x0 + w / 2, y0 + h / 2);
    text.setWordWrapWidth(Math.max(100, w - 20));
  }

  function applyCurrentTheme() {
    const palette = getButtonPalette(scene, variant);
    const { ts } = getScales(scene);

    box.setFillStyle(palette.fill, 1);
    box.setStrokeStyle(2, palette.strokeColor, palette.strokeAlpha);
    text.setColor(palette.textColor);
    text.setFontSize(fitFont(baseFont, ts));
    text.setWordWrapWidth(Math.max(100, w - 20));
  }

  return {
    box,
    text,
    hit,

    setLabel(next) {
      label = next;
      text.setText(next);
      refreshTextPos();
    },

    setVariant(nextVariant) {
      variant = nextVariant;
      applyCurrentTheme();
    },

    setTL(nx, ny) {
      x0 = nx;
      y0 = ny;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      refreshTextPos();
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

      refreshTextPos();
      applyCurrentTheme();
    },

    setTheme({ fill, strokeAlpha, textColor, fontSize, strokeColor = 0xffffff }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, strokeColor, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
      text.setWordWrapWidth(Math.max(100, w - 20));
    },

    applyTheme() {
      applyCurrentTheme();
    },

    setEnabled(v) {
      enabled = !!v;

      if (enabled) {
        hit.setInteractive({ useHandCursor: true });
        if (hit.input) hit.input.cursor = "pointer";
      } else {
        hit.disableInteractive();
      }

      box.setAlpha(enabled ? 1 : 0.55);
      text.setAlpha(enabled ? 1 : 0.55);
    },

    destroy() {
      box.destroy();
      text.destroy();
      hit.destroy();
    },
  };
}

function getTileName(r, c) {
  const rows = ["arriba", "centro", "abajo"];
  const cols = ["izquierda", "centro", "derecha"];

  if (r === 1 && c === 1) return "centro";
  if (r === 1) return `centro ${cols[c]}`;
  if (c === 1) return `${rows[r]} centro`;
  return `${rows[r]} ${cols[c]}`;
}

function makeGridTile(scene, r, c) {
  const index = r * 3 + c;
  const def = TILE_DEFS[index];
  const positionName = getTileName(r, c);

  const baseColor = hexToNumber(def.hex);
  const activeColor = mixColors(baseColor, 0xffffff, 0.30);
  const pressColor = mixColors(baseColor, 0xffffff, 0.18);

  const bg = scene.add
    .rectangle(0, 0, 120, 110, baseColor, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(3, 0xffffff, 0.18);

  const shine = scene.add
    .rectangle(0, 0, 120, 34, 0xffffff, 0.10)
    .setOrigin(0, 0);

  const focus = scene.add
    .rectangle(0, 0, 132, 122, 0x000000, 0)
    .setOrigin(0.5)
    .setStrokeStyle(4, 0x22c55e, 0);

  const hit = scene.add.zone(0, 0, 120, 110).setOrigin(0, 0);
  hit.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, 120, 110),
    Phaser.Geom.Rectangle.Contains
  );
  hit.input.cursor = "pointer";

  return {
    r,
    c,
    index,
    positionName,
    colorName: def.colorName,
    voiceName: `${def.colorName}, ${positionName}`,
    baseColor,
    activeColor,
    pressColor,
    bg,
    shine,
    focus,
    hit,
    x0: 0,
    y0: 0,
    w: 120,
    h: 110,
    cx: 60,
    cy: 55,
  };
}

/* ===================== MENU ===================== */
class LightsMenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("LightsMenuScene");
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Secuencia de luces", {
        fontFamily: "Arial",
        fontSize: "48px",
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

    this.btnEasy = makeTopLeftButton(
      this,
      "Fácil (3 pasos)",
      () => {
        stopSpeech();
        this.scene.start("LightsGameScene", {
          steps: 3,
          speedMs: 650,
          roundsTotal: 5,
          difficulty: "easy",
        });
      },
      10,
      { width: 430, height: 60, baseFont: 24 }
    );

    this.btnMed = makeTopLeftButton(
      this,
      "Medio (4 pasos)",
      () => {
        stopSpeech();
        this.scene.start("LightsGameScene", {
          steps: 4,
          speedMs: 520,
          roundsTotal: 7,
          difficulty: "medium",
        });
      },
      10,
      { width: 430, height: 60, baseFont: 24 }
    );

    this.btnHard = makeTopLeftButton(
      this,
      "Difícil (5 pasos)",
      () => {
        stopSpeech();
        this.scene.start("LightsGameScene", {
          steps: 5,
          speedMs: 420,
          roundsTotal: 10,
          difficulty: "hard",
        });
      },
      10,
      { width: 430, height: 60, baseFont: 24 }
    );

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
      },
    });

    this.applyTheme();
    this.layout();
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupScene() {
    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    stopSpeech();
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
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ui, ts } = getScales(this);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    this.title.setFontSize(fitFont(48, ts));
    this.title.setColor(theme.text);

    this.subtitle.setFontSize(fitFont(24, ts));
    this.subtitle.setColor(theme.textMuted);

    styleTextButton(this.exitBtn, this, "default", 16);

    const bw = Math.round(430 * ui);
    const bh = Math.round(60 * ui);

    [this.btnEasy, this.btnMed, this.btnHard].forEach((b) => {
      b.setSize(bw, bh);
      b.applyTheme();
    });
  }

  layout() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);
    const right = 16;
    const cx = left + (W - left - right) / 2;

    this.exitBtn.setPosition(W - 16, 16);

    this.title.setPosition(cx, 90 * ui);
    this.subtitle.setPosition(cx, 150 * ui);

    const gap = 92 * ui;
    const startY = 260 * ui;

    this.btnEasy.setCenter(cx, startY + 0 * gap);
    this.btnMed.setCenter(cx, startY + 1 * gap);
    this.btnHard.setCenter(cx, startY + 2 * gap);
  }
}

/* ===================== GAME ===================== */
class LightsGameScene extends Phaser.Scene {
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
      this.endModal.box.setFillStyle(theme.surface, 1);
      this.endModal.box.setStrokeStyle(
        2,
        theme.tileStroke,
        hc ? 1 : 0.18
      );

      this.endModal.title.setStyle({
        fontFamily: "Arial",
        fontSize: `${fitFont(38, ts)}px`,
        color: theme.text,
      });

      this.endModal.sub.setStyle({
        fontFamily: "Arial",
        fontSize: `${fitFont(20, ts)}px`,
        color: theme.textMuted,
      });

      const againPalette = getButtonPalette(this, "primary");
      const exitPalette = getButtonPalette(this, "danger");

      this.endModal.btnAgain.setTheme({
        fill: againPalette.fill,
        strokeColor: againPalette.strokeColor,
        strokeAlpha: againPalette.strokeAlpha,
        textColor: againPalette.textColor,
        fontSize: fitFont(18, ts),
      });

      this.endModal.btnExit.setTheme({
        fill: exitPalette.fill,
        strokeColor: exitPalette.strokeColor,
        strokeAlpha: exitPalette.strokeAlpha,
        textColor: exitPalette.textColor,
        fontSize: fitFont(18, ts),
      });
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

    const panel = this.add
      .rectangle(0, 0, Math.min(560, W * 0.9), 130 * ui, theme.surface, 1)
      .setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.18
      );

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

    const W = this.scale.width;
    const H = this.scale.height;
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add
      .rectangle(0, 0, W, H, theme.overlay, 0.55)
      .setOrigin(0)
      .setDepth(4000)
      .setInteractive();

    overlay.on("pointerdown", (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
    });

    const box = this.add
      .rectangle(
        W / 2,
        H / 2,
        Math.min(600, W * 0.9),
        Math.round(300 * ui),
        theme.surface,
        1
      )
      .setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.18
      )
      .setDepth(4001)
      .setInteractive();

    box.on("pointerdown", (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
    });

    const title = this.add
      .text(W / 2, H / 2 - 92 * ui, "¡Terminaste!", {
        fontFamily: "Arial",
        fontSize: `${fitFont(38, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5)
      .setDepth(4002);

    const sub = this.add
      .text(
        W / 2,
        H / 2 - 18 * ui,
        [
          `Puntos: ${this.state.score}`,
          `Errores: ${this.state.wrongRounds}`,
          `Ayudas usadas: ${this.state.repeatCount}`,
        ].join("\n"),
        {
          fontFamily: "Arial",
          fontSize: `${fitFont(20, ts)}px`,
          color: theme.textMuted,
          align: "center",
          lineSpacing: Math.round(10 * ui),
          wordWrap: { width: Math.min(500, W * 0.72) },
        }
      )
      .setOrigin(0.5)
      .setDepth(4002);

    const btnAgain = makeTopLeftButton(
      this,
      "Jugar otra vez",
      () => this.restartGame(),
      4003,
      { width: 210, height: 52, baseFont: 18, variant: "primary" }
    );

    const btnExit = makeTopLeftButton(
      this,
      "Salir",
      () => {
        this.hideEndModal();
        stopSpeech();
        this._onExit?.();
      },
      4003,
      { width: 170, height: 52, baseFont: 18, variant: "danger" }
    );

    this.endModal = { overlay, box, title, sub, btnAgain, btnExit };

    this.applyTheme();
    this.layoutEndModal();
  }

  layoutEndModal() {
    if (!this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const { ui } = getScales(this);

    this.endModal.overlay.setSize(W, H);
    this.endModal.box.setPosition(W / 2, H / 2);
    this.endModal.title.setPosition(W / 2, H / 2 - 92 * ui);
    this.endModal.sub.setPosition(W / 2, H / 2 - 8 * ui);

    this.endModal.btnAgain.setSize(Math.round(210 * ui), Math.round(52 * ui));
    this.endModal.btnExit.setSize(Math.round(170 * ui), Math.round(52 * ui));

    this.endModal.btnAgain.setTL(W / 2 - 230 * ui, H / 2 + 82 * ui);
    this.endModal.btnExit.setTL(W / 2 + 20 * ui, H / 2 + 82 * ui);
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

export function createLightsSequenceGame(parentId, onFinish, onExit) {
  const parentEl = document.getElementById(parentId);
  if (!parentEl) throw new Error(`No existe el elemento con id="${parentId}"`);

  parentEl.style.position = "relative";
  parentEl.style.overflow = "hidden";
  parentEl.style.width = "100%";
  parentEl.style.height = "100%";
  parentEl.style.minWidth = "320px";
  parentEl.style.minHeight = "480px";

  const getSize = () => {
    const rect = parentEl.getBoundingClientRect();
    return {
      width: Math.max(320, Math.floor(rect.width || window.innerWidth || 900)),
      height: Math.max(480, Math.floor(rect.height || window.innerHeight || 650)),
    };
  };

  const initial = getSize();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [new LightsMenuScene(onExit), new LightsGameScene(onFinish, onExit)],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: initial.width,
      height: initial.height,
    },
  });

  const canvas = game.canvas;
  if (canvas) {
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  let resizeRaf = 0;

  const syncSize = () => {
    resizeRaf = 0;

    if (!game || !game.scale) return;

    const { width, height } = getSize();

    if (game.scale.width !== width || game.scale.height !== height) {
      try {
        game.scale.resize(width, height);
      } catch (err) {
        console.error("Error al redimensionar el juego:", err);
      }
    }
  };

  const requestSyncSize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(syncSize);
  };

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      requestSyncSize();
    });
    ro.observe(parentEl);
  }

  window.addEventListener("resize", requestSyncSize);
  setTimeout(requestSyncSize, 0);

  return () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);

    window.removeEventListener("resize", requestSyncSize);

    try {
      ro?.disconnect();
    } catch {}

    stopSpeech();

    try {
      game.destroy(true);
    } catch {}
  };
}
