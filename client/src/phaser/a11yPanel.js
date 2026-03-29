import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";

export const PANEL_OPEN_W = 290;
export const PANEL_CLOSED_W = 78;
export const PANEL_GAP = 16;

// Compat
export const A11Y_PANEL_WIDTH = PANEL_OPEN_W;
export const A11Y_PANEL_GAP = PANEL_GAP;

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,
    highContrast: false,
    colorMode: "normal", // normal | protanopia | tritanopia | grayscale
    uiScale: 1.0,
    textScale: 1.0,
    panelOpen: true,
  };
}

export function loadA11yPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveA11yPrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {}
}

let speechTimer = null;
let speechToken = 0;
let lastSpeechAt = 0;

export function stopSpeech() {
  try {
    speechToken += 1;

    if (speechTimer) {
      clearTimeout(speechTimer);
      speechTimer = null;
    }

    window.speechSynthesis?.cancel();
  } catch {}
}

export function speakIfEnabled(scene, text, options = {}) {
  try {
    if (!scene?.a11y?.ttsEnabled) return;
    if (!text || !String(text).trim()) return;

    const {
      delayMs = 120,
      minGapMs = 320,
      rate = 1,
      pitch = 1,
      lang = "es-MX",
    } = options;

    const now = Date.now();
    const sinceLast = now - lastSpeechAt;
    const extraGap = Math.max(0, minGapMs - sinceLast);
    const waitMs = Math.max(delayMs, extraGap);

    speechToken += 1;
    const myToken = speechToken;

    if (speechTimer) {
      clearTimeout(speechTimer);
      speechTimer = null;
    }

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    speechTimer = setTimeout(() => {
      if (myToken !== speechToken) return;

      try {
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = lang;
        u.rate = rate;
        u.pitch = pitch;

        u.onstart = () => {
          lastSpeechAt = Date.now();
        };

        u.onend = () => {
          lastSpeechAt = Date.now();
        };

        u.onerror = () => {
          lastSpeechAt = Date.now();
        };

        window.speechSynthesis?.speak(u);
      } catch {}
    }, waitMs);
  } catch {}
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const MIN_UI_SCALE = 0.9;
const MAX_UI_SCALE = 1.3;
const MIN_TEXT_SCALE = 1.0;
const MAX_TEXT_SCALE = 1.5;

// Matrices 4x5 para ColorMatrix
const CVD = {
  protanopia: [
    0.567, 0.433, 0.0,   0, 0,
    0.558, 0.442, 0.0,   0, 0,
    0.0,   0.242, 0.758, 0, 0,
    0,     0,     0,     1, 0,
  ],
  tritanopia: [
    0.95,  0.05,  0.0,   0, 0,
    0.0,   0.433, 0.567, 0, 0,
    0.0,   0.475, 0.525, 0, 0,
    0,     0,     0,     1, 0,
  ],
};

function destroyA11yFx(scene) {
  const cam = scene?.cameras?.main;
  const fx = scene?.__a11yFx;

  try {
    if (fx && cam?.postFX?.remove) {
      cam.postFX.remove(fx);
    }
  } catch {}

  try {
    fx?.setActive?.(false);
  } catch {}

  try {
    fx?.reset?.();
  } catch {}

  try {
    fx?.destroy?.();
  } catch {}

  try {
    cam?.clearFX?.();
  } catch {}

  try {
    cam?.resetPostPipeline?.(true);
  } catch {}

  scene.__a11yFx = null;
  scene.__a11yFxMode = "normal";
}

export function applyA11yToScene(scene, prefs) {
  if (!scene) return;

  scene.a11y = { ...(scene.a11y || {}), ...(prefs || {}) };

  const cam = scene.cameras?.main;
  const mode = scene.a11y?.colorMode || "normal";
  const needsFx =
    mode === "grayscale" || mode === "protanopia" || mode === "tritanopia";

  if (!cam?.postFX?.addColorMatrix) {
    destroyA11yFx(scene);
    return;
  }

  if (!needsFx) {
    destroyA11yFx(scene);
    return;
  }

  const mustRebuild = !scene.__a11yFx || scene.__a11yFxMode !== mode;

  if (mustRebuild) {
    destroyA11yFx(scene);

    try {
      scene.__a11yFx = cam.postFX.addColorMatrix();
      scene.__a11yFxMode = mode;
    } catch {
      scene.__a11yFx = null;
      scene.__a11yFxMode = "normal";
      return;
    }
  }

  const fx = scene.__a11yFx;
  if (!fx) return;

  try {
    fx.reset();
  } catch {}

  switch (mode) {
    case "grayscale":
      try {
        fx.grayscale();
      } catch {}
      break;

    case "protanopia":
      try {
        fx.set(CVD.protanopia);
      } catch {}
      break;

    case "tritanopia":
      try {
        fx.set(CVD.tritanopia);
      } catch {}
      break;

    default:
      destroyA11yFx(scene);
      break;
  }
}
function makeBtn(scene, x, y, w, h, label, onClick) {
  const box = scene.add.rectangle(x, y, w, h, 0x111827, 1).setOrigin(0, 0);
  box.setStrokeStyle(2, 0xffffff, 0.16);

  const text = scene.add.text(x + w / 2, y + h / 2, label, {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#ffffff",
  }).setOrigin(0.5);

  const hit = scene.add.zone(x, y, w, h).setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerdown", onClick);

  const setLabel = (t) => text.setText(t);

  const setVisible = (v) => {
    box.setVisible(v);
    text.setVisible(v);
    hit.setVisible(v);
  };

  const setStyle = (fill, textColor, strokeAlpha) => {
    box.setFillStyle(fill, 1);
    box.setStrokeStyle(2, 0xffffff, strokeAlpha);
    text.setColor(textColor);
  };

  const setPos = (nx, ny) => {
    box.setPosition(nx, ny);
    text.setPosition(nx + w / 2, ny + h / 2);
    hit.setPosition(nx, ny);
  };

  const setSize = (nw, nh) => {
    w = nw;
    h = nh;
    box.setSize(w, h);
    hit.setSize(w, h);
    text.setPosition(box.x + w / 2, box.y + h / 2);
  };

  const destroy = () => {
    box.destroy();
    text.destroy();
    hit.destroy();
  };

  return { box, text, hit, setLabel, setVisible, setStyle, setPos, setSize, destroy };
}

export function createA11yPanel(scene, { anchor = "left", onChange } = {}) {
  const loaded = loadA11yPrefs();
  scene.a11y = { ...defaultA11yPrefs(), ...(loaded || {}), ...(scene.a11y || {}) };

  const pad = 14;
  const headerH = 64;

  const root = scene.add.container(0, 0).setDepth(9999);

  const shadow = scene.add
    .rectangle(6, 8, PANEL_OPEN_W, scene.scale.height - 32, 0x000000, 0.18)
    .setOrigin(0, 0);

  const bg = scene.add
    .rectangle(0, 0, PANEL_OPEN_W, scene.scale.height - 32, 0x0a1222, 0.92)
    .setOrigin(0, 0);

  bg.setStrokeStyle(2, 0xffffff, 0.14);

  const title = scene.add.text(pad, 14, "Accesibilidad", {
    fontFamily: "Arial",
    fontSize: "20px",
    color: "#ffffff",
  });

  const hint = scene.add.text(pad, 40, "Opciones rápidas", {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#cbd5e1",
  });

  root.add([shadow, bg, title, hint]);

  function commit() {
scene.a11y.uiScale = clamp(scene.a11y.uiScale ?? 1, MIN_UI_SCALE, MAX_UI_SCALE);
scene.a11y.textScale = clamp(scene.a11y.textScale ?? 1, MIN_TEXT_SCALE, MAX_TEXT_SCALE);

    saveA11yPrefs({ ...scene.a11y });
    applyA11yToScene(scene, scene.a11y);

    if (typeof onChange === "function") onChange(scene.a11y);
  }

  const toggle = makeBtn(
    scene,
    PANEL_OPEN_W - 112,
    14,
    98,
    40,
    scene.a11y.panelOpen ? "Ocultar" : "Mostrar",
    () => {
      scene.a11y.panelOpen = !scene.a11y.panelOpen;
      commit();
      refresh();
    }
  );

  const btnTTS = makeBtn(
    scene,
    pad,
    102,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.ttsEnabled ? "Voz: Encendido" : "Voz: Apagado",
    () => {
      scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;
      if (!scene.a11y.ttsEnabled) stopSpeech();
      commit();
      refresh();
    }
  );

  const btnHC = makeBtn(
    scene,
    pad,
    158,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal",
    () => {
      scene.a11y.highContrast = !scene.a11y.highContrast;
      commit();
      refresh();
    }
  );

  const labelFilter = scene.add.text(pad, 220, "Filtros", {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#cbd5e1",
  });

  const btnNormal = makeBtn(scene, pad, 244, 124, 42, "Normal", () => {
    scene.a11y.colorMode = "normal";
    commit();
    refresh();
  });

  const btnProtan = makeBtn(scene, pad + 138, 244, 124, 42, "Protan.", () => {
    scene.a11y.colorMode = "protanopia";
    commit();
    refresh();
  });

  const btnTritan = makeBtn(scene, pad, 294, 124, 42, "Tritan.", () => {
    scene.a11y.colorMode = "tritanopia";
    commit();
    refresh();
  });

  const btnGray = makeBtn(scene, pad + 138, 294, 124, 42, "Grises", () => {
    scene.a11y.colorMode = "grayscale";
    commit();
    refresh();
  });

  const labelSize = scene.add.text(pad, 350, "Tamaño", {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#cbd5e1",
  });

  const btnAminus = makeBtn(scene, pad, 374, 124, 42, "T-", () => {
    scene.a11y.textScale = clamp(scene.a11y.textScale - 0.1, 0.9, 1.3);
    commit();
    refresh();
  });

  const btnAplus = makeBtn(scene, pad + 138, 374, 124, 42, "T+", () => {
    scene.a11y.textScale = clamp(scene.a11y.textScale + 0.1, 0.9, 1.3);
    commit();
    refresh();
  });

  const btnUIminus = makeBtn(scene, pad, 426, 124, 42, "UI-", () => {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale - 0.1, 0.9, 1.3);
    commit();
    refresh();
  });

  const btnUIplus = makeBtn(scene, pad + 138, 426, 124, 42, "UI+", () => {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale + 0.1, 0.9, 1.3);
    commit();
    refresh();
  });

  const btnReset = makeBtn(scene, pad, 486, PANEL_OPEN_W - 2 * pad, 46, "Restablecer", () => {
    scene.a11y = { ...defaultA11yPrefs() };
    stopSpeech();
    commit();
    refresh();
  });

  root.add([
    toggle.box, toggle.text, toggle.hit,
    btnTTS.box, btnTTS.text, btnTTS.hit,
    btnHC.box, btnHC.text, btnHC.hit,
    labelFilter,
    btnNormal.box, btnNormal.text, btnNormal.hit,
    btnProtan.box, btnProtan.text, btnProtan.hit,
    btnTritan.box, btnTritan.text, btnTritan.hit,
    btnGray.box, btnGray.text, btnGray.hit,
    labelSize,
    btnAminus.box, btnAminus.text, btnAminus.hit,
    btnAplus.box, btnAplus.text, btnAplus.hit,
    btnUIminus.box, btnUIminus.text, btnUIminus.hit,
    btnUIplus.box, btnUIplus.text, btnUIplus.hit,
    btnReset.box, btnReset.text, btnReset.hit,
  ]);

  function getWidth() {
    return scene.a11y.panelOpen ? PANEL_OPEN_W : PANEL_CLOSED_W;
  }

  function place() {
    const w = scene.scale.width;
    const x = anchor === "left" ? 16 : (w - getWidth() - 16);
    root.setPosition(x, 16);
  }

  function refresh() {
    const open = !!scene.a11y.panelOpen;

    toggle.setLabel(open ? "Ocultar" : "Mostrar");
    btnTTS.setLabel(scene.a11y.ttsEnabled ? "Voz: Encendido" : "Voz: Apagado");
    btnHC.setLabel(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");

    const hc = !!scene.a11y.highContrast;

    const panelW = getWidth();
    const panelH = open ? scene.scale.height - 32 : headerH;

    bg.setSize(panelW, panelH);
    shadow.setSize(panelW, panelH);

    const panelFill = hc ? 0xffffff : 0x0a1222;
    bg.setFillStyle(panelFill, hc ? 1 : 0.92);
    bg.setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.14);
    shadow.setVisible(!hc);

    const titleColor = hc ? "#000000" : "#ffffff";
    const muted = hc ? "#000000" : "#cbd5e1";
    title.setColor(titleColor);
    hint.setColor(muted);
    labelFilter.setColor(muted);
    labelSize.setColor(muted);

    const btnFill = hc ? 0xffffff : 0x111827;
    const btnText = hc ? "#000000" : "#ffffff";
    const strokeA = hc ? 1 : 0.16;

    [
      toggle,
      btnTTS,
      btnHC,
      btnNormal,
      btnProtan,
      btnTritan,
      btnGray,
      btnAminus,
      btnAplus,
      btnUIminus,
      btnUIplus,
      btnReset,
    ].forEach((b) => b.setStyle(btnFill, btnText, strokeA));

    title.setVisible(open);
    hint.setVisible(open);
    labelFilter.setVisible(open);
    labelSize.setVisible(open);

    [
      btnTTS,
      btnHC,
      btnNormal,
      btnProtan,
      btnTritan,
      btnGray,
      btnAminus,
      btnAplus,
      btnUIminus,
      btnUIplus,
      btnReset,
    ].forEach((b) => b.setVisible(open));

    toggle.setPos(panelW - 112, 14);

    place();
  }

  place();
  refresh();

  const resizeHandler = () => {
    place();
    refresh();
  };

  scene.scale.on("resize", resizeHandler);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    try {
      scene.scale.off("resize", resizeHandler);
    } catch {}

    destroyA11yFx(scene);
  };

  scene.events?.once("shutdown", cleanup);
  scene.events?.once("destroy", cleanup);

  return {
    getWidth,
    refresh,
    destroy: () => {
      cleanup();
      root.destroy(true);
    },
  };
}
