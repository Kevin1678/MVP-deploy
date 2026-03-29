import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
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
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => {
    if (!enabled) return;
    speakIfEnabled(scene, `Botón ${label}`);
  });

  hit.on("pointerdown", () => {
    if (!enabled) return;
    onClick?.();
  });

  function applyCurrentTheme() {
    const palette = getButtonPalette(scene, variant);
    const { ts } = getScales(scene);

    box.setFillStyle(palette.fill, 1);
    box.setStrokeStyle(2, palette.strokeColor, palette.strokeAlpha);
    text.setColor(palette.textColor);
    text.setFontSize(fitFont(baseFont, ts));
  }

  return {
    box,
    text,
    hit,

    setLabel(next) {
      label = next;
      text.setText(next);
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

    setTheme({
      fill,
      strokeAlpha,
      textColor,
      fontSize,
      strokeColor = 0xffffff,
    }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, strokeColor, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
    },

    applyTheme() {
      applyCurrentTheme();
    },

    setVisible(v) {
      box.setVisible(v);
      text.setVisible(v);
      hit.setVisible(v);
    },

    setEnabled(v) {
      enabled = !!v;
      if (enabled) {
        if (!hit.input) hit.setInteractive({ useHandCursor: true });
      } else {
        hit.disableInteractive();
      }
      box.setAlpha(enabled ? 1 : 0.55);
      text.setAlpha(enabled ? 1 : 0.55);
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

function makeBall(scene, x, y, r, hc = false, index = 0) {
  const theme = getA11yTheme(scene.a11y || {});
  const fill = hc ? 0xffffff : theme.primary;
  const face = hc ? 0x000000 : theme.sceneBg;
  const stroke = hc ? 0x000000 : theme.tileStroke;

  const ball = scene.add
    .circle(0, 0, r, fill, 1)
    .setStrokeStyle(Math.max(2, r * 0.1), stroke, 1);

  const shine = scene.add.circle(
    -r * 0.28,
    -r * 0.28,
    r * 0.42,
    0xffffff,
    hc ? 0.28 : 0.18
  );

  const eyes = scene.add.graphics();
  eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  eyes.beginPath();
  eyes.arc(
    0,
    r * 0.14,
    r * 0.18,
    Phaser.Math.DegToRad(20),
    Phaser.Math.DegToRad(160)
  );
  eyes.strokePath();

  const container = scene.add.container(x, y, [ball, shine, eyes]);

  const announceBall = () => {
    speakIfEnabled(scene, `Bolita número ${index + 1}`);
  };

  ball.setInteractive(
    new Phaser.Geom.Circle(r, r, r * 1.05),
    Phaser.Geom.Circle.Contains
  );

  ball.on("pointerover", announceBall);
  ball.on("pointerdown", announceBall);

  return { container, ball, shine, eyes, r };
}

function recolorBall(parts, scene, r, hc = false) {
  const theme = getA11yTheme(scene.a11y || {});
  const fill = hc ? 0xffffff : theme.primary;
  const face = hc ? 0x000000 : theme.sceneBg;
  const stroke = hc ? 0x000000 : theme.tileStroke;

  parts.ball.setRadius(r);
  parts.ball.setFillStyle(fill, 1);
  parts.ball.setStrokeStyle(Math.max(2, r * 0.1), stroke, 1);

  parts.shine.setPosition(-r * 0.28, -r * 0.28);
  parts.shine.setRadius(r * 0.42);
  parts.shine.setFillStyle(0xffffff, hc ? 0.28 : 0.18);

  parts.eyes.clear();
  parts.eyes.lineStyle(Math.max(2, r * 0.08), face, 0.95);
  parts.eyes.strokeCircle(-r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.strokeCircle(r * 0.18, -r * 0.05, r * 0.06);
  parts.eyes.beginPath();
  parts.eyes.arc(
    0,
    r * 0.14,
    r * 0.18,
    Phaser.Math.DegToRad(20),
    Phaser.Math.DegToRad(160)
  );
  parts.eyes.strokePath();

  if (parts.ball.input?.hitArea?.setTo) {
    parts.ball.input.hitArea.setTo(r, r, r * 1.05);
  } else {
    parts.ball.setInteractive(
      new Phaser.Geom.Circle(r, r, r * 1.05),
      Phaser.Geom.Circle.Contains
    );
  }
}

/* ===================== MENU ===================== */
class CountPickMenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("CountPickMenuScene");
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  create() {
    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Contar y elegir", {
        fontFamily: "Arial",
        fontSize: "50px",
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
      "Fácil (5 rondas)",
      () => {
        stopSpeech();
        this.scene.start("CountPickGameScene", { roundsTotal: 5 });
      },
      10,
      { width: 420, height: 60, baseFont: 24 }
    );

    this.btnMed = makeTopLeftButton(
      this,
      "Medio (10 rondas)",
      () => {
        stopSpeech();
        this.scene.start("CountPickGameScene", { roundsTotal: 10 });
      },
      10,
      { width: 420, height: 60, baseFont: 24 }
    );

    this.btnHard = makeTopLeftButton(
      this,
      "Difícil (15 rondas)",
      () => {
        stopSpeech();
        this.scene.start("CountPickGameScene", { roundsTotal: 15 });
      },
      10,
      { width: 420, height: 60, baseFont: 24 }
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
    this.handleResize({
      width: this.scale.width,
      height: this.scale.height,
    });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => {
      if (this._resizeHandler) {
        this.scale.off("resize", this._resizeHandler);
        this._resizeHandler = null;
      }
      stopSpeech();
    });
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

    this.title.setFontSize(fitFont(50, ts));
    this.title.setColor(theme.text);

    this.subtitle.setFontSize(fitFont(24, ts));
    this.subtitle.setColor(theme.textMuted);

    styleTextButton(this.exitBtn, this, "default", 16);

    const bw = Math.round(420 * ui);
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
class CountPickGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("CountPickGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
  }

  init(data) {
    this.roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
  }

  resetGameState() {
    this.state = {
      startTime: Date.now(),
      round: 0,
      score: 0,
      attempts: 0,
      wrongAnswers: 0,
      target: 0,
      locked: false,
    };
  }

  create() {
    this.resetGameState();

    this.ballParts = [];
    this.choiceButtons = [];
    this.endModal = null;
    this.finalResult = null;
    this.roundTimer = null;
    this.gameEnded = false;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.title = this.add
      .text(0, 0, "Contar y elegir", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0, 0);

    this.sub = this.add
      .text(
        0,
        0,
        "INSTRUCCIONES: Cuenta las bolitas y elige el número correcto.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
          wordWrap: { width: 800 },
        }
      )
      .setOrigin(0, 0);

    this.stats = this.add
      .text(0, 0, "Puntos: 0 • Intentos: 0 • Ronda: 0/0", {
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
      this.cancelRoundTimer();
      stopSpeech();
      this.scene.start("CountPickMenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
      if (this.gameEnded && this.endModal) return;
      this.cancelRoundTimer();
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
    this.handleResize({
      width: this.scale.width,
      height: this.scale.height,
    });

    stopSpeech();
    speakIfEnabled(
      this,
      "INSTRUCCIONES: Cuenta las bolitas y elige el número correcto."
    );

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupScene() {
    this.cancelRoundTimer();

    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    stopSpeech();
  }

  cancelRoundTimer() {
    if (this.roundTimer) {
      try {
        this.roundTimer.remove(false);
      } catch {}
      this.roundTimer = null;
    }
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
    this.layoutBalls();
    this.layoutChoices();
    this.layoutEndModal();
  }

  applyTheme() {
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);
    const { ui, ts } = getScales(this);

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

    const choiceFont = fitFont(28, ts);
    this.choiceButtons.forEach((b) => {
      const palette = getButtonPalette(this, "default");
      b.setTheme({
        fill: palette.fill,
        strokeColor: palette.strokeColor,
        strokeAlpha: palette.strokeAlpha,
        textColor: palette.textColor,
        fontSize: choiceFont,
      });
    });

    const r = Math.round(28 * ui);
    this.ballParts.forEach((p) => recolorBall(p, this, r, !!this.a11y.highContrast));

    if (this.endModal) {
      this.endModal.box.setFillStyle(theme.surface, 1);
      this.endModal.box.setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.18
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
  }

  layout() {
    const W = this.scale.width;
    const { ui } = getScales(this);
    const left = contentLeft(this);

    this.title.setPosition(left, 16 * ui);
    this.sub.setPosition(left, 52 * ui);
    this.sub.setWordWrapWidth(Math.max(220, W - left - 180));
    this.stats.setPosition(left, 92 * ui);

    this.menuBtn.setPosition(W - 120, 16);
    this.exitBtn.setPosition(W - 16, 16);
  }

  clearRound() {
    this.ballParts.forEach((p) => p.container.destroy(true));
    this.ballParts = [];

    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];
  }

  setChoicesEnabled(enabled) {
    this.choiceButtons.forEach((b) => b.setEnabled(enabled));
  }

  setBallsEnabled(enabled) {
    this.ballParts.forEach((p) => {
      if (!p.ball) return;

      if (enabled) {
        if (!p.ball.input) {
          const r = p.ball.radius || p.r || 28;
          p.ball.setInteractive(
            new Phaser.Geom.Circle(r, r, r * 1.05),
            Phaser.Geom.Circle.Contains
          );
        }
      } else {
        p.ball.disableInteractive();
      }
    });
  }

  nextRound() {
    if (this.gameEnded) return;

    this.cancelRoundTimer();
    this.clearRound();

    this.state.round += 1;
    this.state.locked = false;
    this.state.target = randInt(1, 5);

    const options = new Set([this.state.target]);
    while (options.size < 3) options.add(randInt(1, 5));
    const choices = shuffle(Array.from(options));

    const { ui } = getScales(this);
    const r = Math.round(28 * ui);

    for (let i = 0; i < this.state.target; i++) {
      const parts = makeBall(this, 0, 0, r, !!this.a11y.highContrast, i);
      this.ballParts.push(parts);
    }

    choices.forEach((n) => {
      const btn = makeTopLeftButton(
        this,
        String(n),
        () => this.pickAnswer(n),
        10,
        { width: 150, height: 62, baseFont: 28 }
      );
      this.choiceButtons.push(btn);
    });

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.applyTheme();
    this.layoutBalls();
    this.layoutChoices();
  }

  layoutBalls() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const { ui } = getScales(this);
    const r = Math.round(28 * ui);

    const topY = 180 * ui;
    const cols = 3;
    const gapX = 28 * ui;
    const gapY = 36 * ui;
    const cellW = 110 * ui;
    const cellH = 110 * ui;

    const contentW = cols * cellW + (cols - 1) * gapX;
    const startX = left + Math.max(0, (W - left - 16 - contentW) / 2);

    this.ballParts.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = startX + col * (cellW + gapX) + cellW / 2;
      const y = topY + row * (cellH + gapY) + cellH / 2;

      recolorBall(p, this, r, !!this.a11y.highContrast);
      p.container.setPosition(x, y);
    });
  }

  layoutChoices() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const H = this.scale.height;

    const { ui } = getScales(this);
    const btnW = Math.round(150 * ui);
    const btnH = Math.round(62 * ui);
    const gap = Math.round(18 * ui);

    const totalW =
      this.choiceButtons.length * btnW +
      (this.choiceButtons.length - 1) * gap;
    const startX = left + Math.max(0, (W - left - 16 - totalW) / 2);
    const y = H - 120 * ui;

    this.choiceButtons.forEach((b, i) => {
      b.setSize(btnW, btnH);
      b.setTL(startX + i * (btnW + gap), y);
    });
  }

  animateCorrect() {
    const W = this.scale.width;
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add.container(W / 2, 120 * ui).setDepth(3000);

    const panel = this.add
      .rectangle(0, 0, Math.min(520, W * 0.82), 110 * ui, theme.surface, 1)
      .setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.18
      );

    const icon = this.add
      .text(-120 * ui, 0, "✔", {
        fontFamily: "Arial",
        fontSize: `${fitFont(70, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    const text = this.add
      .text(40 * ui, 0, "¡Bien hecho!", {
        fontFamily: "Arial",
        fontSize: `${fitFont(36, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

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
    const theme = getA11yTheme(this.a11y);
    const { ts, ui } = getScales(this);

    const overlay = this.add.container(W / 2, 120 * ui).setDepth(3000);

    const panel = this.add
      .rectangle(0, 0, Math.min(560, W * 0.86), 120 * ui, theme.surface, 1)
      .setStrokeStyle(
        2,
        theme.tileStroke,
        this.a11y.highContrast ? 1 : 0.18
      );

    const icon = this.add
      .text(-140 * ui, 0, "✖", {
        fontFamily: "Arial",
        fontSize: `${fitFont(64, ts)}px`,
        color: theme.text,
      })
      .setOrigin(0.5);

    const text = this.add
      .text(36 * ui, 0, "Intenta otra vez", {
        fontFamily: "Arial",
        fontSize: `${fitFont(32, ts)}px`,
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
      hold: 520,
      onComplete: () => overlay.destroy(true),
    });
  }

  pickAnswer(value) {
    if (this.state.locked || this.gameEnded) return;

    this.state.locked = true;
    this.state.attempts += 1;
    this.setChoicesEnabled(false);

    const ok = value === this.state.target;

    if (ok) {
      this.state.score += 1;
      this.animateCorrect();
      speakIfEnabled(this, "Correcto");
    } else {
      this.state.wrongAnswers += 1;
      this.animateWrong();
      speakIfEnabled(this, `Incorrecto. Eran ${this.state.target}`);
    }

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    this.roundTimer = this.time.delayedCall(1200, () => {
      this.roundTimer = null;

      if (!this.scene.isActive()) return;

      if (this.state.round >= this.roundsTotal) {
        this.finishGame();
      } else {
        this.nextRound();
      }
    });
  }

  async finishGame() {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.state.locked = true;

    this.cancelRoundTimer();
    this.setChoicesEnabled(false);
    this.setBallsEnabled(false);

    this.menuBtn.disableInteractive();
    this.exitBtn.disableInteractive();

    const durationMs = Date.now() - this.state.startTime;

    let level = "MEDIUM";
    if (this.roundsTotal === 5) level = "EASY";
    if (this.roundsTotal === 10) level = "MEDIUM";
    if (this.roundsTotal === 15) level = "HARD";

    this.finalResult = {
      game: "countPick",
      score: this.state.score,
      moves: this.state.attempts,
      durationMs,
      level,
      accuracy: this.state.score,
      attempts: this.state.attempts,
      metadata: {
        roundsTotal: this.roundsTotal,
        correctAnswers: this.state.score,
        wrongAnswers: this.state.wrongAnswers,
      },
    };

    try {
      await this._onFinish?.(this.finalResult);
    } catch (err) {
      console.error("Error guardando resultado:", err);
    }

    this.showEndModal();
    speakIfEnabled(this, "Juego terminado. Selecciona Jugar otra vez o Salir.");
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
        Math.min(560, W * 0.88),
        250 * ui,
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
      .text(W / 2, H / 2 - 70 * ui, "¡Terminaste!", {
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
        `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}`,
        {
          fontFamily: "Arial",
          fontSize: `${fitFont(20, ts)}px`,
          color: theme.textMuted,
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

    this.endModal = {
      overlay,
      box,
      title,
      sub,
      btnAgain,
      btnExit,
    };

    this.applyTheme();
    this.layoutEndModal();
  }

  restartGame() {
    this.cancelRoundTimer();
    stopSpeech();
    this.hideEndModal();
    this.clearRound();
    this.finalResult = null;
    this.gameEnded = false;
    this.scene.restart({ roundsTotal: this.roundsTotal });
  }

  layoutEndModal() {
    if (!this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const { ui } = getScales(this);

    this.endModal.overlay.setSize(W, H);
    this.endModal.box.setPosition(W / 2, H / 2);
    this.endModal.title.setPosition(W / 2, H / 2 - 70 * ui);
    this.endModal.sub.setPosition(W / 2, H / 2 - 18 * ui);

    this.endModal.btnAgain.setSize(Math.round(210 * ui), Math.round(52 * ui));
    this.endModal.btnExit.setSize(Math.round(170 * ui), Math.round(52 * ui));

    this.endModal.btnAgain.setTL(W / 2 - 230 * ui, H / 2 + 46 * ui);
    this.endModal.btnExit.setTL(W / 2 + 20 * ui, H / 2 + 46 * ui);
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
  parentEl.style.width = "100%";
  parentEl.style.height = "100%";
  parentEl.style.minWidth = "320px";
  parentEl.style.minHeight = "480px";

  const getSize = () => {
    const rect = parentEl.getBoundingClientRect();
    return {
      width: Math.max(320, Math.floor(rect.width || window.innerWidth || 900)),
      height: Math.max(
        480,
        Math.floor(rect.height || window.innerHeight || 650)
      ),
    };
  };

  const initial = getSize();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: [
      new CountPickMenuScene(onExit),
      new CountPickGameScene(onFinish, onExit),
    ],
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
