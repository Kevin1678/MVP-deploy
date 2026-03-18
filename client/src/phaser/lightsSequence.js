import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  PANEL_GAP,
} from "./a11yPanel";

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
  const bg = scene.add.rectangle(0, 0, 120, 110, 0x111827, 1).setOrigin(0.5);
  const label = scene.add.text(0, 0, getTileName(r, c), {
    fontFamily: "Arial",
    fontSize: "20px",
    color: "#ffffff",
    align: "center",
    wordWrap: { width: 90 },
  }).setOrigin(0.5);

  const focus = scene.add.rectangle(0, 0, 132, 122, 0x000000, 0)
    .setOrigin(0.5)
    .setStrokeStyle(4, 0x22c55e, 0);

  const hit = scene.add.zone(0, 0, 120, 110).setOrigin(0.5);
  hit.setInteractive({ useHandCursor: true });

  const container = scene.add.container(0, 0, [bg, label, focus, hit]);

  return { r, c, bg, label, focus, hit, container };
}

/* ===================== MENU ===================== */
class LightsMenuScene extends Phaser.Scene {
  constructor(onExit) {
    super("LightsMenuScene");
    this._onExit = onExit;
  }

  create() {
    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    this.title = this.add.text(0, 0, "Secuencia de luces", {
      fontFamily: "Arial",
      fontSize: "48px",
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

    this.btnEasy = makeTopLeftButton(this, "Fácil (3 pasos)", () => {
      stopSpeech();
      this.scene.start("LightsGameScene", { steps: 3, speedMs: 650, roundsTotal: 5, difficulty: "easy" });
    });

    this.btnMed = makeTopLeftButton(this, "Medio (4 pasos)", () => {
      stopSpeech();
      this.scene.start("LightsGameScene", { steps: 4, speedMs: 520, roundsTotal: 7, difficulty: "medium" });
    });

    this.btnHard = makeTopLeftButton(this, "Difícil (5 pasos)", () => {
      stopSpeech();
      this.scene.start("LightsGameScene", { steps: 5, speedMs: 420, roundsTotal: 10, difficulty: "hard" });
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

    this.title.setFontSize(Math.round(48 * ts));
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
    const bw = Math.round(430 * ui);
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
class LightsGameScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("LightsGameScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
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
  score: 0,          // rondas correctas
  attempts: 0,       // rondas intentadas
  wrongRounds: 0,    // rondas falladas
  locked: true,
  sequence: [],
  inputIndex: 0,
  focusIndex: 0,
};

    this.endModal = null;

    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    this.title = this.add.text(0, 0, "Secuencia de luces", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    this.sub = this.add.text(0, 0, "Observa la secuencia y repítela", {
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
      this.scene.start("LightsMenuScene");
    });

    this.exitBtn.on("pointerdown", () => {
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
    this.nextRound(true);

    this.scale.on("resize", () => {
      if (!this.bg) return;
      this.bg.setSize(this.scale.width, this.scale.height);
      this.applyTheme();
      this.layout();
      this.layoutGrid();
      this.layoutEndModal();
      this.applyFocus(this.state.focusIndex, true);
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

    this.tiles.forEach((tile) => {
      tile.bg.setFillStyle(hc ? 0x000000 : 0x111827, 1);
      tile.bg.setStrokeStyle(3, 0xffffff, hc ? 1 : 0.12);
      tile.label.setColor(hc ? "#ffffff" : "#ffffff");
      tile.focus.setStrokeStyle(4, hc ? 0xffffff : 0x22c55e, 0);
    });
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

  buildGrid() {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const tile = makeGridTile(this, r, c);

        tile.hit.on("pointerover", () => {
          this.applyFocus(r * 3 + c, true);
          speakIfEnabled(this, tile.label.text);
        });

        tile.hit.on("pointerdown", () => {
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
    const tileW = Math.round(120 * ui);
    const tileH = Math.round(110 * ui);
    const gap = Math.round(18 * ui);

    const totalW = tileW * 3 + gap * 2;
    const totalH = tileH * 3 + gap * 2;

    const centerX = left + (W - left - 16) / 2;
    const centerY = 170 + (H - 170 - 130) / 2;

    const startX = centerX - totalW / 2 + tileW / 2;
    const startY = centerY - totalH / 2 + tileH / 2;

    this.tiles.forEach((tile) => {
      const x = startX + tile.c * (tileW + gap);
      const y = startY + tile.r * (tileH + gap);

      tile.container.setPosition(x, y);
      tile.bg.setSize(tileW, tileH);
      tile.hit.setSize(tileW, tileH);
      tile.focus.setSize(tileW + 12, tileH + 12);
      tile.label.setFontSize(Math.round(20 * (this.a11y.textScale || 1)));
      tile.label.setWordWrapWidth(Math.round(tileW * 0.82));

      if (tile.hit.input?.hitArea?.setTo) {
        tile.hit.input.hitArea.setTo(-tileW / 2, -tileH / 2, tileW, tileH);
      }
    });
  }

  initKeyboard() {
    this.input.keyboard.on("keydown", (e) => {
      if (e.code === "Escape") {
        stopSpeech();
        this._onExit?.();
        return;
      }

      if (this.state.locked) return;

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
    });
  }

  applyFocus(index, silent = false) {
    const hc = !!this.a11y.highContrast;
    const focusColor = hc ? 0xffffff : 0x22c55e;

    const prev = this.tiles[this.state.focusIndex];
    if (prev?.focus) prev.focus.setStrokeStyle(4, focusColor, 0);

    this.state.focusIndex = index;

    const tile = this.tiles[index];
    if (!tile) return;

    tile.focus.setStrokeStyle(4, focusColor, 1);

    if (!silent) {
      speakIfEnabled(this, tile.label.text);
    }
  }

  nextRound(isFirst = false) {
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

    this.stats.setText(
      `Puntos: ${this.state.score} • Intentos: ${this.state.attempts} • Ronda: ${this.state.round}/${this.roundsTotal}`
    );

    speakIfEnabled(this, `Ronda ${this.state.round}. Observa la secuencia.`);
    if (isFirst) speakIfEnabled(this, "Usa flechas y Enter si no quieres usar mouse.");

    this.playSequence();
  }

  getTile(r, c) {
    return this.tiles.find((t) => t.r === r && t.c === c);
  }

  playSequence() {
    const hc = !!this.a11y.highContrast;
    const activeFill = hc ? 0xffffff : 0x60a5fa;

    this.time.delayedCall(350, async () => {
      for (let i = 0; i < this.state.sequence.length; i++) {
        const { r, c } = this.state.sequence[i];
        const tile = this.getTile(r, c);
        if (!tile) continue;

        speakIfEnabled(this, tile.label.text);

        const oldFill = tile.bg.fillColor;
        const oldAlpha = tile.bg.strokeAlpha;

        tile.bg.setFillStyle(activeFill, 1);
        tile.bg.setStrokeStyle(5, 0xffffff, 1);

        this.tweens.add({
          targets: tile.container,
          scale: { from: 1, to: 1.05 },
          yoyo: true,
          duration: Math.max(180, this.speedMs * 0.35),
        });

        await new Promise((res) => this.time.delayedCall(this.speedMs, res));

        tile.bg.setFillStyle(oldFill, 1);
        tile.bg.setStrokeStyle(3, 0xffffff, oldAlpha);

        await new Promise((res) => this.time.delayedCall(Math.max(120, this.speedMs * 0.2), res));
      }

      this.state.locked = false;
      speakIfEnabled(this, "Tu turno. Repite la secuencia.");
    });
  }

  onTilePress(r, c) {
    if (this.state.locked) return;

    const tile = this.getTile(r, c);
    if (!tile) return;

    const hc = !!this.a11y.highContrast;
    const pressFill = hc ? 0x999999 : 0xfbbf24;
    const old = tile.bg.fillColor;

    tile.bg.setFillStyle(pressFill, 1);
    this.time.delayedCall(160, () => tile.bg.setFillStyle(old, 1));

    speakIfEnabled(this, tile.label.text);

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
    speakIfEnabled(this, "Correcto");
    this.showOverlayIcon(true);

    this.time.delayedCall(900, () => {
      if (this.state.round >= this.roundsTotal) {
        this.showEndModal();
      } else {
        this.nextRound();
      }
    });
  }

  failFeedback() {
    this.state.locked = true;
    speakIfEnabled(this, "Incorrecto");
    this.showOverlayIcon(false);

    this.tweens.add({
      targets: [this.title, this.sub, this.stats],
      x: "+=8",
      yoyo: true,
      repeat: 3,
      duration: 60,
    });

    this.time.delayedCall(1000, () => {
      this.state.inputIndex = 0;
      speakIfEnabled(this, "Mira otra vez.");
      this.playSequence();
    });
  }

  showOverlayIcon(ok) {
    const W = this.scale.width;
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    const overlay = this.add.container(W / 2, 120).setDepth(3000);

    const panel = this.add.rectangle(0, 0, Math.min(560, W * 0.9), 130, hc ? 0xffffff : 0x111827, 1)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.15);

    const icon = this.add.text(-140, 0, ok ? "✔" : "✖", {
      fontFamily: "Arial",
      fontSize: `${Math.round(68 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

    const text = this.add.text(40, 0, ok ? "¡Bien!" : "Intenta otra vez", {
      fontFamily: "Arial",
      fontSize: `${Math.round((ok ? 38 : 32) * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5);

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

  showEndModal() {
    if (this.endModal) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;
    const durationMs = Date.now() - this.state.startTime;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(4000);

    const box = this.add.rectangle(W / 2, H / 2, Math.min(560, W * 0.88), 250, hc ? 0xffffff : 0x0f172a, 1)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.16)
      .setDepth(4001);

    const title = this.add.text(W / 2, H / 2 - 70, "¡Terminaste!", {
      fontFamily: "Arial",
      fontSize: `${Math.round(38 * ts)}px`,
      color: hc ? "#000000" : "#ffffff",
    }).setOrigin(0.5).setDepth(4002);

    const sub = this.add.text(
      W / 2,
      H / 2 - 18,
      `Puntos: ${this.state.score}  •  Intentos: ${this.state.attempts}`,
      {
        fontFamily: "Arial",
        fontSize: `${Math.round(20 * ts)}px`,
        color: hc ? "#000000" : "#cbd5e1",
      }
    ).setOrigin(0.5).setDepth(4002);

    const btnAgain = makeTopLeftButton(
      this,
      "Jugar otra vez",
      () => {
        this.hideEndModal();
        this.scene.restart({
          steps: this.steps,
          speedMs: this.speedMs,
          roundsTotal: this.roundsTotal,
          difficulty: this.difficulty,
        });
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
          game: "lights-sequence",
        });
      },
      4003
    );

    btnAgain.setSize(210, 52);
    btnAgain.setTheme({
      fill: hc ? 0x000000 : 0x2563eb,
      strokeAlpha: 1,
      textColor: "#ffffff",
      fontSize: Math.round(18 * ts),
    });

    btnExit.setSize(170, 52);
    btnExit.setTheme({
      fill: hc ? 0x222222 : 0xdc2626,
      strokeAlpha: 1,
      textColor: "#ffffff",
      fontSize: Math.round(18 * ts),
    });

    this.endModal = { overlay, box, title, sub, btnAgain, btnExit };
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

export function createLightsSequenceGame(parentId, onFinish, onExit) {
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
    scene: [new LightsMenuScene(onExit), new LightsGameScene(onFinish, onExit)],
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
