import Phaser from "phaser";

const SYMBOLS = ["★","●","▲","■","◆","❤","☀","☂"]; // 8 pares = 16 cartas

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

/**
 * parentId: id del div donde se monta Phaser
 * onFinish: ({score, moves, durationMs}) => void
 * onExit: () => void
 */
export function createMemoramaGame(parentId, onFinish, onExit) {
  const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 650,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: {
      init() {
        this.pairs = 8;

        this.state = {
          first: null,
          second: null,
          locked: false,
          attempts: 0,
          matchedPairs: 0,
          startTime: Date.now(),
        };

        this.a11y = {
          ttsEnabled: true,
          contrast: false,
          focusIndex: 0,
          cols: 4,
        };
      },

      create() {
        // Fondo
        this.bg = this.add
          .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
          .setOrigin(0);

        // UI textos
        this.title = this.add.text(24, 18, `Memorama - ${this.pairs} pares`, {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#ffffff",
        });

        this.attemptsText = this.add.text(24, 48, `Intentos: 0`, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        });

        this.timeText = this.add.text(24, 72, `Tiempo: 0s`, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#cbd5e1",
        });

        // ✅ Botón SALIR simple (Opción A)
        this.exitBtn = this.add
          .text(this.scale.width - 110, 18, "Salir", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#111827",
            padding: { left: 12, right: 12, top: 8, bottom: 8 },
          })
          .setOrigin(0, 0)
          .setDepth(50)
          .setInteractive({ useHandCursor: true });

        this.exitBtn.on("pointerdown", () => {
          if (typeof onExit === "function") onExit();
        });

        // Timer
        this.timerEvent = this.time.addEvent({
          delay: 250,
          loop: true,
          callback: () => {
            const sec = Math.floor((Date.now() - this.state.startTime) / 1000);
            this.timeText.setText(`Tiempo: ${sec}s`);
          },
        });

        // Construir cartas
        this.cards = [];
        this.buildCards();

        // Teclado + foco
        this.initKeyboard();
        this.applyFocus(0, true);

        // Resize responsive
        this.scale.on("resize", (gameSize) => {
          const { width, height } = gameSize;
          this.bg.setSize(width, height);

          // ✅ mover botón sin .container
          this.exitBtn.setPosition(width - 110, 18);

          this.layoutCards();
          this.applyFocus(this.a11y.focusIndex, true);
        });

        this.applyContrast(); // aplica tema al inicio
      },

      // ---------- A11Y ----------
      say(text) {
        if (!this.a11y?.ttsEnabled) return;
        speak(text);
      },

      applyContrast() {
        const on = this.a11y.contrast;

        this.bg.setFillStyle(on ? 0x000000 : 0x0b1020, 1);
        this.title.setColor("#ffffff");
        this.attemptsText.setColor(on ? "#ffffff" : "#cbd5e1");
        this.timeText.setColor(on ? "#ffffff" : "#cbd5e1");

        // ✅ Botón simple: cambia estilo con setStyle
        if (this.exitBtn) {
          this.exitBtn.setStyle({
            color: on ? "#000000" : "#ffffff",
            backgroundColor: on ? "#ffffff" : "#111827",
          });
        }

        this.cards.forEach((card) => {
          card.faceDown.setFillStyle(on ? 0x000000 : 0x111827, 1);
          card.faceDown.setStrokeStyle(2, 0xffffff, on ? 0.9 : 0.12);

          card.faceUp.setFillStyle(on ? 0xffffff : 0xf8fafc, 1);
          card.faceUp.setStrokeStyle(2, 0x111827, on ? 0.9 : 0.25);

          card.txt.setColor(on ? "#000000" : "#0b1020");
        });
      },

      initKeyboard() {
        this.input.keyboard.on("keydown", (e) => {
          // TTS toggle
          if (e.code === "KeyT") {
            this.a11y.ttsEnabled = !this.a11y.ttsEnabled;
            this.say(this.a11y.ttsEnabled ? "Voz activada" : "Voz desactivada");
            return;
          }

          // Contraste toggle
          if (e.code === "KeyC") {
            this.a11y.contrast = !this.a11y.contrast;
            this.applyContrast();
            this.say(this.a11y.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
            return;
          }

          // Salir
          if (e.code === "Escape") {
            if (typeof onExit === "function") onExit();
            return;
          }

          if (this.state.locked) return;

          if (e.code === "ArrowLeft") return this.moveFocus(-1, 0);
          if (e.code === "ArrowRight") return this.moveFocus(1, 0);
          if (e.code === "ArrowUp") return this.moveFocus(0, -1);
          if (e.code === "ArrowDown") return this.moveFocus(0, 1);

          if (e.code === "Enter" || e.code === "Space") {
            const card = this.cards[this.a11y.focusIndex];
            if (card) this.onCardClick(card);
          }
        });
      },

      moveFocus(dx, dy) {
        const total = this.cards.length;
        if (!total) return;

        const cols = this.a11y.cols || 4;
        const rows = Math.ceil(total / cols);

        const idx = this.a11y.focusIndex;
        const r = Math.floor(idx / cols);
        const c = idx % cols;

        let nr = Phaser.Math.Clamp(r + dy, 0, rows - 1);
        let nc = Phaser.Math.Clamp(c + dx, 0, cols - 1);

        let next = nr * cols + nc;
        if (next >= total) next = total - 1;

        this.applyFocus(next);
      },

      applyFocus(index, silent = false) {
        const prev = this.cards[this.a11y.focusIndex];
        if (prev?.focusOutline) prev.focusOutline.setVisible(false);

        this.a11y.focusIndex = index;
        const card = this.cards[index];
        if (!card) return;

        if (!card.focusOutline) {
          const w = 110;
          const h = 130;
          card.focusOutline = this.add
            .rectangle(0, 0, w + 12, h + 12, 0x000000, 0)
            .setStrokeStyle(4, 0x22c55e, 1);
          card.focusOutline.setVisible(false);
          card.container.add(card.focusOutline);
        }

        card.focusOutline.setVisible(true);

        if (!silent) {
          const state = card.matched ? "completada" : card.flipped ? `abierta ${card.value}` : "cerrada";
          this.say(`Carta ${index + 1}, ${state}`);
        }
      },

      // ---------- GAME ----------
      buildCards() {
        const symbols = shuffle(SYMBOLS).slice(0, this.pairs);
        const values = shuffle([...symbols, ...symbols]);

        this.cards = values.map((val, idx) => this.createCard(idx, val));
        this.layoutCards();
        this.applyContrast();
      },

      createCard(idx, value) {
        const container = this.add.container(0, 0);

        const w = 110;
        const h = 130;

        const hit = this.add.zone(0, 0, w, h).setOrigin(0.5);
        hit.setInteractive({ useHandCursor: true });

        const faceDown = this.add.rectangle(0, 0, w, h, 0x111827).setStrokeStyle(2, 0xffffff, 0.12);
        const faceUp = this.add.rectangle(0, 0, w, h, 0xf8fafc).setStrokeStyle(2, 0x111827, 0.25);
        const txt = this.add.text(0, 0, value, {
          fontFamily: "Arial",
          fontSize: "52px",
          color: "#0b1020",
        }).setOrigin(0.5);

        container.add([hit, faceDown, faceUp, txt]);

        const card = { idx, value, container, hit, faceDown, faceUp, txt, flipped: false, matched: false };

        this.setCardVisual(card, false);
        hit.on("pointerdown", () => {
          this.applyFocus(idx, true);
          this.onCardClick(card);
        });

        return card;
      },

      setCardVisual(card, isFlipped) {
        card.flipped = isFlipped;
        card.faceDown.setVisible(!isFlipped);
        card.faceUp.setVisible(isFlipped);
        card.txt.setVisible(isFlipped);
        card.container.setAlpha(card.matched ? 0.55 : 1);
      },

      onCardClick(card) {
        if (this.state.locked) return;
        if (card.matched) return;
        if (card.flipped) return;

        this.setCardVisual(card, true);

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

        if (a.value === b.value) {
          this.time.delayedCall(250, () => {
            a.matched = true;
            b.matched = true;

            this.setCardVisual(a, true);
            this.setCardVisual(b, true);

            this.say("Correcto");

            this.state.matchedPairs += 1;
            this.resetTurn();

            if (this.state.matchedPairs === this.pairs) this.onWin();
          });
        } else {
          this.time.delayedCall(650, () => {
            this.say("Incorrecto");
            this.setCardVisual(a, false);
            this.setCardVisual(b, false);
            this.resetTurn();
          });
        }
      },

      resetTurn() {
        this.state.first = null;
        this.state.second = null;
        this.state.locked = false;
      },

      onWin() {
        this.state.locked = true;
        this.cards.forEach((c) => c.hit.disableInteractive());

        const durationMs = Date.now() - this.state.startTime;
        this.say(`Ganaste. Tiempo ${Math.floor(durationMs / 1000)} segundos. Intentos ${this.state.attempts}`);

        if (typeof onFinish === "function") {
          onFinish({
            score: this.state.matchedPairs,
            moves: this.state.attempts,
            durationMs,
          });
        }
      },

      layoutCards() {
        const W = this.scale.width;
        const H = this.scale.height;

        const topPad = 110;
        const leftPad = 24;
        const rightPad = 24;
        const bottomPad = 24;

        const areaW = W - leftPad - rightPad;
        const areaH = H - topPad - bottomPad;

        const totalCards = this.pairs * 2;

        let cols = 4;
        if (totalCards >= 12) cols = 6;
        if (totalCards >= 16) cols = 8;
        this.a11y.cols = cols;

        const rows = Math.ceil(totalCards / cols);
        const gap = 18;

        const cardW = Math.floor((areaW - gap * (cols - 1)) / cols);
        const cardH = Math.floor((areaH - gap * (rows - 1)) / rows);

        this.cards.forEach((card, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;

          const x = leftPad + c * (cardW + gap) + cardW / 2;
          const y = topPad + r * (cardH + gap) + cardH / 2;

          card.container.setPosition(x, y);

          const scaleX = cardW / 110;
          const scaleY = cardH / 130;
          const s = Math.min(scaleX, scaleY);
          card.container.setScale(s);
          card.container.setDepth(10);
        });
      },
    },
  };

  const game = new Phaser.Game(config);
  return () => game.destroy(true);
}
