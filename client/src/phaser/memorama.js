import Phaser from "phaser";

const SYMBOLS = ["★","●","▲","■","◆","❤","☀","☂"]; // 8 pares

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

export function createMemoramaGame(parentId, onFinish, onExit) {
  const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 650,
    parent: parentId,
    backgroundColor: "#0b1020",
    scene: {
create() {
  const pairs = 8;

  // Preferencias: por defecto voz OFF, contraste OFF
  const savedTts = localStorage.getItem("memorama_tts") === "1";
  const savedContrast = localStorage.getItem("memorama_contrast") === "1";

  const state = {
    first: null,
    second: null,
    locked: false,
    attempts: 0,
    matchedPairs: 0,
    startTime: Date.now(),
  };

  const a11y = {
    ttsEnabled: savedTts,       // ✅ por defecto OFF si no hay storage
    contrast: savedContrast,
    focusIndex: 0,
    cols: 4,
  };

  const stopVoice = () => {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  };

  const say = (text) => {
    if (!a11y.ttsEnabled) return;
    speak(text);
  };

  // ------- UI base -------
  const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020).setOrigin(0);

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

  // ------- Botones superiores -------
  const makeTopBtn = (x, label, onClick) => {
    const btn = this.add.text(x, 18, label, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#111827",
      padding: { left: 10, right: 10, top: 8, bottom: 8 },
    })
    .setOrigin(0, 0)
    .setDepth(50)
    .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", onClick);
    return btn;
  };

  // Posiciones: Salir a la derecha, y los toggles antes
  let exitBtn, ttsBtn, contrastBtn;

  const updateButtonsText = () => {
    if (ttsBtn) ttsBtn.setText(a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF");
    if (contrastBtn) contrastBtn.setText(a11y.contrast ? "Contraste: ON" : "Contraste: OFF");
  };

  const doExit = () => {
    // ✅ importantísimo: cortar voz al salir/terminar
    stopVoice();
    if (typeof onExit === "function") onExit();
  };

  const doFinish = (payload) => {
    stopVoice();
    if (typeof onFinish === "function") onFinish(payload);
  };

  // Crear botones (los acomodamos con layoutButtons())
  ttsBtn = makeTopBtn(0, "Voz: OFF", () => {
    a11y.ttsEnabled = !a11y.ttsEnabled;
    localStorage.setItem("memorama_tts", a11y.ttsEnabled ? "1" : "0");
    updateButtonsText();
    if (a11y.ttsEnabled) say("Voz activada"); else stopVoice();
  });

  contrastBtn = makeTopBtn(0, "Contraste: OFF", () => {
    a11y.contrast = !a11y.contrast;
    localStorage.setItem("memorama_contrast", a11y.contrast ? "1" : "0");
    updateButtonsText();
    applyContrast();
    say(a11y.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
  });

  exitBtn = makeTopBtn(0, "Salir", doExit);

  const layoutButtons = () => {
    // Alinea a la derecha: [Voz] [Contraste] [Salir]
    const padRight = 18;
    const gap = 10;
    const y = 18;

    // Medimos por el width del texto renderizado
    const exitW = exitBtn.width;
    const contrastW = contrastBtn.width;
    const ttsW = ttsBtn.width;

    const total = ttsW + contrastW + exitW + gap * 2;

    let x = this.scale.width - padRight - total;
    if (x < 24) x = 24; // si no cabe, que no se salga

    ttsBtn.setPosition(x, y);
    contrastBtn.setPosition(x + ttsW + gap, y);
    exitBtn.setPosition(x + ttsW + gap + contrastW + gap, y);
  };

  // ------- Cards -------
  const cards = [];

  const setCardVisual = (card, flipped) => {
    card.flipped = flipped;
    card.faceDown.setVisible(!flipped);
    card.faceUp.setVisible(flipped);
    card.txt.setVisible(flipped);
    card.container.setAlpha(card.matched ? 0.55 : 1);
  };

  const applyContrast = () => {
    const on = a11y.contrast;

    bg.setFillStyle(on ? 0x000000 : 0x0b1020, 1);
    title.setColor("#ffffff");
    attemptsText.setColor(on ? "#ffffff" : "#cbd5e1");
    timeText.setColor(on ? "#ffffff" : "#cbd5e1");

    const btnBg = on ? "#ffffff" : "#111827";
    const btnColor = on ? "#000000" : "#ffffff";
    [ttsBtn, contrastBtn, exitBtn].forEach((b) => b.setStyle({ backgroundColor: btnBg, color: btnColor }));

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

    if (!silent) {
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

    doFinish({ score: state.matchedPairs, moves: state.attempts, durationMs });
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

    const faceDown = this.add.rectangle(0, 0, w, h, 0x111827).setStrokeStyle(2, 0xffffff, 0.12);
    const faceUp = this.add.rectangle(0, 0, w, h, 0xf8fafc).setStrokeStyle(2, 0x111827, 0.25);
    const txt = this.add.text(0, 0, value, {
      fontFamily: "Arial",
      fontSize: "52px",
      color: "#0b1020",
    }).setOrigin(0.5);

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

    const gap = 18;
    const cardW = Math.floor((areaW - gap * (cols - 1)) / cols);
    const cardH = Math.floor((areaH - gap * (Math.ceil(totalCards / cols) - 1)) / Math.ceil(totalCards / cols));

    cards.forEach((card, i) => {
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
  updateButtonsText();
  buildCards();
  applyFocus(0, true);
  applyContrast();
  layoutButtons();

  // ----- keyboard -----
  this.input.keyboard.on("keydown", (e) => {
    if (e.code === "KeyT") {
      a11y.ttsEnabled = !a11y.ttsEnabled;
      localStorage.setItem("memorama_tts", a11y.ttsEnabled ? "1" : "0");
      updateButtonsText();
      if (a11y.ttsEnabled) say("Voz activada"); else stopVoice();
      return;
    }

    if (e.code === "KeyC") {
      a11y.contrast = !a11y.contrast;
      localStorage.setItem("memorama_contrast", a11y.contrast ? "1" : "0");
      updateButtonsText();
      applyContrast();
      say(a11y.contrast ? "Contraste alto activado" : "Contraste alto desactivado");
      return;
    }

    if (e.code === "Escape") {
      doExit();
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

  // ----- timer -----
  this.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => {
      const sec = Math.floor((Date.now() - state.startTime) / 1000);
      timeText.setText(`Tiempo: ${sec}s`);
    },
  });

  // ----- resize -----
  this.scale.on("resize", ({ width, height }) => {
    bg.setSize(width, height);
    layoutButtons();
    layoutCards();
    applyFocus(a11y.focusIndex, true);
  });
}
