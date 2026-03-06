import Phaser from "phaser";

const SYMBOLS = ["★", "●", "▲", "■", "◆", "❤", "☀", "☂"]; // 8 pares máximo

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stopVoice() {
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}
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

/**
 * parentId: id del div donde se monta Phaser
 * onFinish: ({score, moves, durationMs, pairs}) => void
 * onExit: () => void
 */
export function createMemoramaGame(parentId, onFinish, onExit) {
  // Preferencias globales para este juego (se comparten entre escenas)
  const prefs = {
    ttsEnabled: localStorage.getItem("memorama_tts") === "1", // por defecto OFF si no existe
    contrast: localStorage.getItem("memorama_contrast") === "1",
  };

  const say = (text) => {
    if (!prefs.ttsEnabled) return;
    speak(text);
  };

  class MenuScene extends Phaser.Scene {
    constructor() {
      super("MenuScene");
    }

    create() {
      this.bg = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
        .setOrigin(0);

      const title = this.add
        .text(this.scale.width / 2, 70, "Memorama", {
          fontFamily: "Arial",
          fontSize: "40px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      const subtitle = this.add
        .text(this.scale.width / 2, 120, "Elige dificultad", {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#cbd5e1",
        })
        .setOrigin(0.5);

      // Botón salir a React
      const exitBtn = this.add
        .text(this.scale.width - 110, 18, "Salir", {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#111827",
          padding: { left: 10, right: 10, top: 8, bottom: 8 },
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      exitBtn.on("pointerdown", () => {
        stopVoice();
        if (typeof onExit === "function") onExit();
      });

      const btns = [
        { label: "Fácil (4 pares)", pairs: 4 },
        { label: "Medio (6 pares)", pairs: 6 },
        { label: "Difícil (8 pares)", pairs: 8 },
      ];

      const startY = 220;
      const gap = 80;

      btns.forEach((b, i) => {
        const y = startY + i * gap;
        const w = Math.min(520, this.scale.width * 0.75);
        const h = 54;

        const box = this.add
          .rectangle(this.scale.width / 2, y, w, h, 0x111827)
          .setStrokeStyle(2, 0xffffff, 0.12)
          .setInteractive({ useHandCursor: true });

        const text = this.add
          .text(this.scale.width / 2, y, b.label, {
            fontFamily: "Arial",
            fontSize: "22px",
            color: "#ffffff",
          })
          .setOrigin(0.5);

        box.on("pointerdown", () => {
          // Inicia memoria con dificultad
          this.scene.start("MemoryScene", { pairs: b.pairs });
        });

        // hover
        box.on("pointerover", () => box.setFillStyle(0x1f2937));
        box.on("pointerout", () => box.setFillStyle(0x111827));
      });

      // accesibilidad: voz si la activan
      if (prefs.ttsEnabled) say("Elige dificultad. Fácil, medio o difícil.");

      const applyContrast = () => {
        const on = prefs.contrast;
        this.bg.setFillStyle(on ? 0x000000 : 0x0b1020);
        subtitle.setColor(on ? "#ffffff" : "#cbd5e1");
        exitBtn.setStyle({
          backgroundColor: on ? "#ffffff" : "#111827",
          color: on ? "#000000" : "#ffffff",
        });
      };

      applyContrast();

      this.scale.on("resize", ({ width, height }) => {
        this.bg.setSize(width, height);
        title.setPosition(width / 2, 70);
        subtitle.setPosition(width / 2, 120);
        exitBtn.setPosition(width - 110, 18);
      });

      // atajo contraste (igual que en juego)
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyC") {
          prefs.contrast = !prefs.contrast;
          localStorage.setItem("memorama_contrast", prefs.contrast ? "1" : "0");
          applyContrast();
          say(prefs.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
        }
        if (e.code === "KeyT") {
          prefs.ttsEnabled = !prefs.ttsEnabled;
          localStorage.setItem("memorama_tts", prefs.ttsEnabled ? "1" : "0");
          if (prefs.ttsEnabled) say("Voz activada");
          else stopVoice();
        }
        if (e.code === "Escape") {
          stopVoice();
          if (typeof onExit === "function") onExit();
        }
      });
    }
  }

  class MemoryScene extends Phaser.Scene {
    constructor() {
      super("MemoryScene");
    }

    init(data) {
      this.pairs = data?.pairs ?? 8;
    }

    create() {
      const pairs = this.pairs;
      const state = {
        first: null,
        second: null,
        locked: false,
        attempts: 0,
        matchedPairs: 0,
        startTime: Date.now(),
      };

      const bg = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
        .setOrigin(0);

      const title = this.add.text(24, 18, `Memorama - ${pairs} pares`, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
      });

      const attemptsText = this.add.text(24, 48, `Intentos: 0`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cbd5e1",
      });

      const timeText = this.add.text(24, 72, `Tiempo: 0s`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cbd5e1",
      });

      // botones: Voz / Contraste / Menú / Salir
      const makeBtn = (label, onClick) =>
        this.add
          .text(0, 18, label, {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#ffffff",
            backgroundColor: "#111827",
            padding: { left: 10, right: 10, top: 8, bottom: 8 },
          })
          .setOrigin(0, 0)
          .setDepth(50)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", onClick);

      const ttsBtn = makeBtn("Voz: OFF", () => {
        prefs.ttsEnabled = !prefs.ttsEnabled;
        localStorage.setItem("memorama_tts", prefs.ttsEnabled ? "1" : "0");
        updateBtnText();
        if (prefs.ttsEnabled) say("Voz activada");
        else stopVoice();
      });

      const contrastBtn = makeBtn("Contraste: OFF", () => {
        prefs.contrast = !prefs.contrast;
        localStorage.setItem("memorama_contrast", prefs.contrast ? "1" : "0");
        updateBtnText();
        applyContrast();
        say(prefs.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
      });

      const menuBtn = makeBtn("Dificultad", () => {
        stopVoice();
        this.scene.start("MenuScene");
      });

      const exitBtn = makeBtn("Salir", () => {
        stopVoice();
        if (typeof onExit === "function") onExit();
      });

      const updateBtnText = () => {
        ttsBtn.setText(prefs.ttsEnabled ? "Voz: ON" : "Voz: OFF");
        contrastBtn.setText(prefs.contrast ? "Contraste: ON" : "Contraste: OFF");
      };

      const layoutButtons = () => {
        const padRight = 18;
        const gap = 10;
        const y = 18;

        const w1 = ttsBtn.width;
        const w2 = contrastBtn.width;
        const w3 = menuBtn.width;
        const w4 = exitBtn.width;

        const total = w1 + w2 + w3 + w4 + gap * 3;

        let x = this.scale.width - padRight - total;
        if (x < 24) x = 24;

        ttsBtn.setPosition(x, y);
        contrastBtn.setPosition(x + w1 + gap, y);
        menuBtn.setPosition(x + w1 + gap + w2 + gap, y);
        exitBtn.setPosition(x + w1 + gap + w2 + gap + w3 + gap, y);
      };

      const cards = [];
      const a11y = { focusIndex: 0, cols: 4 };

      const setCardVisual = (card, flipped) => {
        card.flipped = flipped;
        card.faceDown.setVisible(!flipped);
        card.faceUp.setVisible(flipped);
        card.txt.setVisible(flipped);
        card.container.setAlpha(card.matched ? 0.55 : 1);
      };

      const applyContrast = () => {
        const on = prefs.contrast;

        bg.setFillStyle(on ? 0x000000 : 0x0b1020, 1);
        title.setColor("#ffffff");
        attemptsText.setColor(on ? "#ffffff" : "#cbd5e1");
        timeText.setColor(on ? "#ffffff" : "#cbd5e1");

        const btnBg = on ? "#ffffff" : "#111827";
        const btnColor = on ? "#000000" : "#ffffff";
        [ttsBtn, contrastBtn, menuBtn, exitBtn].forEach((b) =>
          b.setStyle({ backgroundColor: btnBg, color: btnColor })
        );

        cards.forEach((card) => {
          card.faceDown.setFillStyle(on ? 0x000000 : 0x111827, 1);
          card.faceDown.setStrokeStyle(2, 0xffffff, on ? 0.9 : 0.12);

          card.faceUp.setFillStyle(on ? 0xffffff : 0xf8fafc, 1);
          card.faceUp.setStrokeStyle(2, 0x111827, on ? 0.9 : 0.25);

          card.txt.setColor(on ? "#000000" : "#0b1020");
        });
      };

      const applyFocus = (index, silent = false) => {
        const prev = cards[a11y.focusIndex];
        if (prev?.focusOutline) prev.focusOutline.setVisible(false);

        a11y.focusIndex = index;
        const card = cards[index];
        if (!card) return;

        if (!card.focusOutline) {
          card.focusOutline = this.add
            .rectangle(0, 0, 110 + 12, 130 + 12, 0x000000, 0)
            .setStrokeStyle(4, 0x22c55e, 1);
          card.focusOutline.setVisible(false);
          card.container.add(card.focusOutline);
        }

        card.focusOutline.setVisible(true);

        if (!silent && prefs.ttsEnabled) {
          const status = card.matched ? "completada" : card.flipped ? `abierta ${card.value}` : "cerrada";
          say(`Carta ${index + 1}, ${status}`);
        }
      };

      const moveFocus = (dx, dy) => {
        const total = cards.length;
        if (!total) return;

        const cols = a11y.cols || 4;
        const rows = Math.ceil(total / cols);

        const idx = a11y.focusIndex;
        const r = Math.floor(idx / cols);
        const c = idx % cols;

        let nr = Phaser.Math.Clamp(r + dy, 0, rows - 1);
        let nc = Phaser.Math.Clamp(c + dx, 0, cols - 1);

        let next = nr * cols + nc;
        if (next >= total) next = total - 1;

        applyFocus(next);
      };

      const resetTurn = () => {
        state.first = null;
        state.second = null;
        state.locked = false;
      };

      const onWin = () => {
        state.locked = true;
        cards.forEach((c) => c.hit.disableInteractive());

        const durationMs = Date.now() - state.startTime;
        say(`Ganaste. Tiempo ${Math.floor(durationMs / 1000)} segundos. Intentos ${state.attempts}`);

        stopVoice();
        if (typeof onFinish === "function") {
          onFinish({ score: state.matchedPairs, moves: state.attempts, durationMs, pairs });
        }
      };

      const onCardClick = (card) => {
        if (state.locked || card.matched || card.flipped) return;

        setCardVisual(card, true);

        if (!state.first) {
          state.first = card;
          return;
        }

        state.second = card;
        state.locked = true;

        state.attempts += 1;
        attemptsText.setText(`Intentos: ${state.attempts}`);

        const a = state.first;
        const b = state.second;

        if (a.value === b.value) {
          this.time.delayedCall(250, () => {
            a.matched = true;
            b.matched = true;

            setCardVisual(a, true);
            setCardVisual(b, true);

            say("Correcto");
            state.matchedPairs += 1;

            resetTurn();
            if (state.matchedPairs === pairs) onWin();
          });
        } else {
          this.time.delayedCall(650, () => {
            say("Incorrecto");
            setCardVisual(a, false);
            setCardVisual(b, false);
            resetTurn();
          });
        }
      };

      const createCard = (idx, value) => {
        const container = this.add.container(0, 0);
        const w = 110;
        const h = 130;

        const hit = this.add.zone(0, 0, w, h).setOrigin(0.5);
        hit.setInteractive({ useHandCursor: true });

        const faceDown = this.add
          .rectangle(0, 0, w, h, 0x111827)
          .setStrokeStyle(2, 0xffffff, 0.12);
        const faceUp = this.add
          .rectangle(0, 0, w, h, 0xf8fafc)
          .setStrokeStyle(2, 0x111827, 0.25);
        const txt = this.add
          .text(0, 0, value, { fontFamily: "Arial", fontSize: "52px", color: "#0b1020" })
          .setOrigin(0.5);

        container.add([hit, faceDown, faceUp, txt]);

        const card = { idx, value, container, hit, faceDown, faceUp, txt, flipped: false, matched: false };

        setCardVisual(card, false);

        hit.on("pointerdown", () => {
          applyFocus(idx, true);
          onCardClick(card);
        });

        return card;
      };

      const layoutCards = () => {
        const W = this.scale.width;
        const H = this.scale.height;

        const topPad = 110;
        const leftPad = 24;
        const rightPad = 24;
        const bottomPad = 24;

        const areaW = W - leftPad - rightPad;
        const areaH = H - topPad - bottomPad;

        const totalCards = pairs * 2;

        let cols = 4;
        if (totalCards >= 12) cols = 6;
        if (totalCards >= 16) cols = 8;
        a11y.cols = cols;

        const rows = Math.ceil(totalCards / cols);
        const gap = 18;

        const cardW = Math.floor((areaW - gap * (cols - 1)) / cols);
        const cardH = Math.floor((areaH - gap * (rows - 1)) / rows);

        cards.forEach((card, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;

          const x = leftPad + c * (cardW + gap) + cardW / 2;
          const y = topPad + r * (cardH + gap) + cardH / 2;

          card.container.setPosition(x, y);

          const s = Math.min(cardW / 110, cardH / 130);
          card.container.setScale(s);
          card.container.setDepth(10);
        });
      };

      const buildCards = () => {
        const symbols = shuffle(SYMBOLS).slice(0, pairs);
        const values = shuffle([...symbols, ...symbols]);

        cards.length = 0;
        values.forEach((val, idx) => cards.push(createCard(idx, val)));

        layoutCards();
        applyContrast();
      };

      // init
      updateBtnText();
      buildCards();
      applyFocus(0, true);
      applyContrast();
      layoutButtons();

      // timer
      this.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => {
          const sec = Math.floor((Date.now() - state.startTime) / 1000);
          timeText.setText(`Tiempo: ${sec}s`);
        },
      });

      // keyboard
      this.input.keyboard.on("keydown", (e) => {
        if (e.code === "KeyT") {
          prefs.ttsEnabled = !prefs.ttsEnabled;
          localStorage.setItem("memorama_tts", prefs.ttsEnabled ? "1" : "0");
          updateBtnText();
          if (prefs.ttsEnabled) say("Voz activada");
          else stopVoice();
          return;
        }

        if (e.code === "KeyC") {
          prefs.contrast = !prefs.contrast;
          localStorage.setItem("memorama_contrast", prefs.contrast ? "1" : "0");
          updateBtnText();
          applyContrast();
          say(prefs.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
          return;
        }

        if (e.code === "Escape") {
          stopVoice();
          if (typeof onExit === "function") onExit();
          return;
        }

        if (state.locked) return;

        if (e.code === "ArrowLeft") return moveFocus(-1, 0);
        if (e.code === "ArrowRight") return moveFocus(1, 0);
        if (e.code === "ArrowUp") return moveFocus(0, -1);
        if (e.code === "ArrowDown") return moveFocus(0, 1);

        if (e.code === "Enter" || e.code === "Space") {
          const card = cards[a11y.focusIndex];
          if (card) onCardClick(card);
        }
      });

      // resize
      this.scale.on("resize", ({ width, height }) => {
        bg.setSize(width, height);
        layoutButtons();
        layoutCards();
        applyFocus(a11y.focusIndex, true);
      });
    }
  }

  const game = new Phaser.Game({
    ...config,
    scene: [new MenuScene(), new MemoryScene()],
  });

  return () => {
    stopVoice();
    game.destroy(true);
  };
}
