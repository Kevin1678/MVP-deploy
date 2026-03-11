import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";

// Anchos del panel
export const PANEL_OPEN_W = 290;
export const PANEL_CLOSED_W = 78;
export const PANEL_GAP = 16;

// ✅ Aliases por compatibilidad (por si algún archivo viejo los importa)
export const A11Y_PANEL_WIDTH = PANEL_OPEN_W;
export const A11Y_PANEL_GAP = PANEL_GAP;

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,
    highContrast: false,
    colorMode: "normal", // normal | grayscale
    uiScale: 1.0,        // 0.9 - 1.3
    textScale: 1.0,      // 0.9 - 1.3
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
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
}

export function stopSpeech() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

export function speakIfEnabled(scene, text) {
  try {
    if (!scene?.a11y?.ttsEnabled) return;
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Filtros de cámara (si existe ColorMatrix)
 */
export function applyA11yToScene(scene, prefs) {
  if (!scene) return;
  scene.a11y = { ...(scene.a11y || {}), ...(prefs || {}) };

  const cam = scene.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return;

  if (!scene.__a11yColorFx) scene.__a11yColorFx = cam.postFX.addColorMatrix();
  const fx = scene.__a11yColorFx;
  fx.reset();

  if (scene.a11y.colorMode === "grayscale") fx.grayscale?.();
}

function makeBtn(scene, x, y, w, h, label, onClick) {
  // x,y son TOP-LEFT del botón
  const box = scene.add.rectangle(x, y, w, h, 0x111827, 1).setOrigin(0, 0);
  box.setStrokeStyle(2, 0xffffff, 0.16);

  const text = scene.add.text(x + w / 2, y + h / 2, label, {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#ffffff",
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0, 0);
  hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

  hit.on("pointerdown", onClick);

  const setLabel = (t) => text.setText(t);

  const setPos = (nx, ny) => {
    box.setPosition(nx, ny);
    hit.setPosition(nx, ny);
    text.setPosition(nx + w / 2, ny + h / 2);
  };

  const setSize = (nw, nh) => {
    w = nw; h = nh;
    box.setSize(w, h);
    hit.setSize(w, h);
    hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    text.setPosition(box.x + w / 2, box.y + h / 2);
  };

  const setStyle = (fill, textColor, strokeAlpha) => {
    box.setFillStyle(fill, 1);
    box.setStrokeStyle(2, 0xffffff, strokeAlpha);
    text.setColor(textColor);
  };

  const setVisible = (v) => {
    box.setVisible(v);
    hit.setVisible(v);
    text.setVisible(v);
  };

  const destroy = () => {
    box.destroy();
    hit.destroy();
    text.destroy();
  };

  return { box, hit, text, setLabel, setPos, setSize, setStyle, setVisible, destroy };
}

export function createA11yPanel(scene, { anchor = "left", onChange } = {}) {
  const loaded = loadA11yPrefs();
  scene.a11y = { ...defaultA11yPrefs(), ...(loaded || {}), ...(scene.a11y || {}) };

  const pad = 14;
  const headerH = 64;

  const root = scene.add.container(0, 0).setDepth(9999);

  const shadow = scene.add.rectangle(6, 8, PANEL_OPEN_W, scene.scale.height - 32, 0x000000, 0.18).setOrigin(0, 0);
  const bg = scene.add.rectangle(0, 0, PANEL_OPEN_W, scene.scale.height - 32, 0x0a1222, 0.92).setOrigin(0, 0);
  bg.setStrokeStyle(2, 0xffffff, 0.14);

  const title = scene.add.text(pad, 14, "Accesibilidad", { fontFamily: "Arial", fontSize: "20px", color: "#ffffff" });
  const hint = scene.add.text(pad, 40, "Opciones rápidas", { fontFamily: "Arial", fontSize: "14px", color: "#cbd5e1" });

  root.add([shadow, bg, title, hint]);

  function commit() {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale ?? 1, 0.9, 1.3);
    scene.a11y.textScale = clamp(scene.a11y.textScale ?? 1, 0.9, 1.3);

    saveA11yPrefs({ ...scene.a11y });
    try { applyA11yToScene(scene, scene.a11y); } catch {}
    if (typeof onChange === "function") onChange(scene.a11y);
  }

  // Botón toggle
  const toggle = makeBtn(scene, PANEL_OPEN_W - 112, 14, 98, 40, scene.a11y.panelOpen ? "Ocultar" : "Mostrar", () => {
    scene.a11y.panelOpen = !scene.a11y.panelOpen;
    commit();
    refresh();
  });
  root.add([toggle.box, toggle.hit, toggle.text]);

  // Controles
  const btnTTS = makeBtn(scene, pad, 102, PANEL_OPEN_W - 2 * pad, 46, scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF", () => {
    scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;
    if (!scene.a11y.ttsEnabled) stopSpeech();
    commit();
    refresh();
  });
  const btnHC = makeBtn(scene, pad, 158, PANEL_OPEN_W - 2 * pad, 46, scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal", () => {
    scene.a11y.highContrast = !scene.a11y.highContrast;
    commit();
    refresh();
  });

  const labelFilter = scene.add.text(pad, 220, "Filtro", { fontFamily: "Arial", fontSize: "13px", color: "#cbd5e1" });
  const btnNormal = makeBtn(scene, pad, 244, 124, 42, "Normal", () => { scene.a11y.colorMode = "normal"; commit(); refresh(); });
  const btnGray   = makeBtn(scene, pad + 138, 244, 124, 42, "Grises", () => { scene.a11y.colorMode = "grayscale"; commit(); refresh(); });

  const labelSize = scene.add.text(pad, 302, "Tamaño", { fontFamily: "Arial", fontSize: "13px", color: "#cbd5e1" });
  const btnAminus = makeBtn(scene, pad, 326, 124, 42, "A-", () => { scene.a11y.textScale = clamp(scene.a11y.textScale - 0.1, 0.9, 1.3); commit(); refresh(); });
  const btnAplus  = makeBtn(scene, pad + 138, 326, 124, 42, "A+", () => { scene.a11y.textScale = clamp(scene.a11y.textScale + 0.1, 0.9, 1.3); commit(); refresh(); });

  const btnUIminus = makeBtn(scene, pad, 378, 124, 42, "UI-", () => { scene.a11y.uiScale = clamp(scene.a11y.uiScale - 0.1, 0.9, 1.3); commit(); refresh(); });
  const btnUIplus  = makeBtn(scene, pad + 138, 378, 124, 42, "UI+", () => { scene.a11y.uiScale = clamp(scene.a11y.uiScale + 0.1, 0.9, 1.3); commit(); refresh(); });

  const btnReset = makeBtn(scene, pad, 438, PANEL_OPEN_W - 2 * pad, 46, "Restablecer", () => {
    scene.a11y = { ...defaultA11yPrefs() };
    stopSpeech();
    commit();
    refresh();
  });

  root.add([
    btnTTS.box, btnTTS.hit, btnTTS.text,
    btnHC.box, btnHC.hit, btnHC.text,
    labelFilter,
    btnNormal.box, btnNormal.hit, btnNormal.text,
    btnGray.box, btnGray.hit, btnGray.text,
    labelSize,
    btnAminus.box, btnAminus.hit, btnAminus.text,
    btnAplus.box, btnAplus.hit, btnAplus.text,
    btnUIminus.box, btnUIminus.hit, btnUIminus.text,
    btnUIplus.box, btnUIplus.hit, btnUIplus.text,
    btnReset.box, btnReset.hit, btnReset.text,
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
    btnTTS.setLabel(scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF");
    btnHC.setLabel(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");

    const hc = !!scene.a11y.highContrast;

    // panel size
    const pw = getWidth();
    const ph = open ? (scene.scale.height - 32) : headerH;

    bg.setSize(pw, ph);
    shadow.setSize(pw, ph);

    // recolor
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

    // buttons style
    const btnFill = hc ? 0xffffff : 0x111827;
    const btnText = hc ? "#000000" : "#ffffff";
    const strokeA = hc ? 1 : 0.16;

    [toggle, btnTTS, btnHC, btnNormal, btnGray, btnAminus, btnAplus, btnUIminus, btnUIplus, btnReset]
      .forEach((b) => b.setStyle(btnFill, btnText, strokeA));

    // collapse hide
    const v = open;
    title.setVisible(v);
    hint.setVisible(v);
    labelFilter.setVisible(v);
    labelSize.setVisible(v);

    [btnTTS, btnHC, btnNormal, btnGray, btnAminus, btnAplus, btnUIminus, btnUIplus, btnReset]
      .forEach((b) => b.setVisible(v));

    // toggle pos (top-left within panel)
    toggle.setPos(pw - 112, 14);

    place();
  }

  place();
  refresh();

  scene.scale.on("resize", () => {
    place();
    refresh();
  });

  return { getWidth, refresh, destroy: () => root.destroy(true) };
}
