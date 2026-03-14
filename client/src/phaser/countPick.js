import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  PANEL_GAP,
} from "./a11yPanel";

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function contentLeft(scene) {
  const panelW = scene.a11yPanel?.getWidth?.() ?? 290;
  return 16 + panelW + (PANEL_GAP ?? 16);
}

// Botón estable (top-left + Zone hitbox)
function makeChoiceButton(scene, label, onClick) {
  let w = 160;
  let h = 64;

  const box = scene.add.rectangle(0, 0, w, h, 0x111827, 1).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.14);
  const text = scene.add.text(0, 0, label, { fontFamily: "Arial", fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);

  const hit = scene.add.zone(0, 0, w, h).setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => speakIfEnabled(scene, `Botón ${label}`));
  hit.on("pointerdown", onClick);

  return {
    setTL(x0, y0) {
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(x0 + w / 2, y0 + h / 2);
    },
    setSize(nw, nh) {
      w = nw; h = nh;
      box.setSize(w, h);
      hit.setSize(w, h);
      if (hit.input?.hitArea?.setTo) hit.input.hitArea.setTo(0, 0, w, h);
      text.setPosition(box.x + w / 2, box.y + h / 2);
    },
    setTheme({ fill, strokeAlpha, textColor, fontSize }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, 0xffffff, strokeAlpha);
      text.setColor(textColor);
      text.setFontSize(fontSize);
    },
    destroy() {
      box.destroy(); text.destroy(); hit.destroy();
    }
  };
}

class CountPickScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("CountPickScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
  }

  create() {
    // Estado
    this.round = 0;
    this.correct = 0;
    this.target = 0;
    this.objects = [];
    this.choiceBtns = [];

    // Fondo
    this.bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

    // UI top
    this.title = this.add.text(0, 0, "Contar y elegir", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    this.sub = this.add.text(0, 0, "Cuenta los objetos y elige el número correcto", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0, 0);

    this.scoreText = this.add.text(0, 0, "Aciertos: 0", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0, 0);

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

    // ✅ Panel accesibilidad (GLOBAL)
    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layout();
        this.layoutObjects();
        this.layoutChoices();
      }
    });

    // Layout inicial
    this.applyTheme();
    this.layout();

    // 1ra ronda
    this.nextRound();

    // Resize
    this.scale.on("resize", () => {
      if (!this.bg) return;
      this.bg.setSize(this.scale.width, this.scale.height);
      this.applyTheme();
      this.layout();
      this.layoutObjects();
      this.layoutChoices();
    });

    this.events.once("shutdown", () => stopSpeech());
  }

  applyTheme() {
    // ✅ filtro real (protanopia/tritanopia/grises)
    applyA11yToScene(this, this.a11y);

    const hc = !!this.a11y.highContrast;
    const ts = this.a11y.textScale || 1;

    this.bg.setFillStyle(hc ? 0x000000 : 0x0b1020, 1);

    this.title.setFontSize(Math.round(28 * ts));
    this.sub.setFontSize(Math.round(18 * ts));
    this.scoreText.setFontSize(Math.round(18 * ts));

    this.sub.setColor(hc ? "#ffffff" : "#cbd5e1");
    this.scoreText.setColor(hc ? "#ffffff" : "#cbd5e1");

    this.exitBtn.setStyle({
      color: hc ? "#000000" : "#ffffff",
      backgroundColor: hc ? "#ffffff" : "#111827",
    });
    this.exitBtn.setFontSize(Math.round(16 * ts));

    // botones de elección: se ajustan en layoutChoices() (tamaño + tema)
  }

  layout() {
    const W = this.scale.width;
    const left = contentLeft(this);

    this.title.setPosition(left, 16);
    this.sub.setPosition(left, 52);
    this.scoreText.setPosition(left, 78);

    this.exitBtn.setPosition(W - 16, 16);
  }

  // Genera objetos (pelotas) y opciones 3 botones
  nextRound() {
    this.round += 1;

    // limpiar
    this.objects.forEach(o => o.destroy());
    this.objects = [];
    this.choiceBtns.forEach(b => b.destroy());
    this.choiceBtns = [];

    // target 1..5
    this.target = randInt(1, 5);

    // narración al inicio de ronda
    speakIfEnabled(this, `Cuenta los objetos. ¿Cuántos hay?`);

    // crear objetos (círculos)
    for (let i = 0; i < this.target; i++) {
      const c = this.add.circle(0, 0, 26, 0x60a5fa, 1); // color base
      c.setStrokeStyle(2, 0xffffff, 0.18);
      this.objects.push(c);
    }

    // opciones (incluye correcto + 2 distracciones)
    const options = new Set([this.target]);
    while (options.size < 3) options.add(randInt(1, 5));
    const arr = Array.from(options).sort(() => Math.random() - 0.5);

    arr.forEach((n) => {
      const btn = makeChoiceButton(this, String(n), () => this.pick(n));
      this.choiceBtns.push(btn);
    });

    this.layoutObjects();
    this.layoutChoices();
  }

  layoutObjects() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const H = this.scale.height;

    // área para objetos (arriba/medio)
    const x0 = left;
    const x1 = W - 16;
    const y0 = 130;
    const y1 = H - 190;

    const areaW = x1 - x0;
    const areaH = y1 - y0;

    // grid simple para colocar objetos
    const cols = 3;
    const gap = 28;

    const ui = this.a11y.uiScale || 1;
    const r = Math.round(26 * ui);

    this.objects.forEach((o, i) => {
      o.setRadius(r);

      const row = Math.floor(i / cols);
      const col = i % cols;

      const cellW = (areaW - gap * (cols - 1)) / cols;
      const cellH = 90;

      const cx = x0 + col * (cellW + gap) + cellW / 2;
      const cy = y0 + row * (cellH + gap) + cellH / 2;

      o.setPosition(cx, cy);
    });
  }

  layoutChoices() {
    const left = contentLeft(this);
    const W = this.scale.width;
    const H = this.scale.height;

    const hc = !!this.a11y.highContrast;
    const ui = this.a11y.uiScale || 1;
    const ts = this.a11y.textScale || 1;

    const fill = hc ? 0xffffff : 0x111827;
    const strokeAlpha = hc ? 1 : 0.14;
    const textColor = hc ? "#000000" : "#ffffff";
    const fontSize = Math.round(28 * ts);

    const btnW = Math.round(160 * ui);
    const btnH = Math.round(64 * ui);
    const gap = 18;

    const totalW = this.choiceBtns.length * btnW + (this.choiceBtns.length - 1) * gap;
    const startX = left + (W - left - 16 - totalW) / 2;
    const y = H - 110;

    this.choiceBtns.forEach((b, i) => {
      const x = startX + i * (btnW + gap);
      b.setSize(btnW, btnH);
      b.setTheme({ fill, strokeAlpha, textColor, fontSize });
      b.setTL(x, y);
    });
  }

  pick(n) {
    const ok = n === this.target;

    if (ok) {
      this.correct += 1;
      this.scoreText.setText(`Aciertos: ${this.correct}`);
      speakIfEnabled(this, "Correcto");
    } else {
      speakIfEnabled(this, "Incorrecto");
    }

    // efecto rápido
    this.cameras.main.flash(120);

    // terminar tras 10 rondas (ejemplo)
    if (this.round >= 10) {
      stopSpeech();
      this._onFinish?.({
        score: this.correct,
        moves: this.round,
        durationMs: 0,
        game: "countPick",
      });
      return;
    }

    // siguiente ronda
    this.time.delayedCall(450, () => this.nextRound());
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
    scene: [new CountPickScene(onFinish, onExit)],
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
    try { game.scale.resize(w, h); game.scale.refresh(); } catch {}
  }, 0);

  return () => {
    stopSpeech();
    try { game.destroy(true); } catch {}
  };
}
