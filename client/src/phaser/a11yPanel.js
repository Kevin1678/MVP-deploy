// client/src/phaser/a11yPanel.js
import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";
export const A11Y_PANEL_WIDTH = 290; // ⬅️ ancho visual del panel
export const A11Y_PANEL_GAP = 18;    // ⬅️ espacio entre panel y contenido

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,
    highContrast: false,
    colorMode: "normal",   // normal | protanopia | tritanopia | grayscale
    uiScale: 1.0,          // 0.9 - 1.3
    textScale: 1.0,        // 0.9 - 1.3
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
 * Aplica filtros globales de cámara si existe ColorMatrix.
 * No depende del UI.
 */
export function applyA11yToScene(scene, prefs) {
  if (!scene) return;
  scene.a11y = { ...(scene.a11y || {}), ...(prefs || {}) };

  const cam = scene.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return;

  if (!scene.__a11yColorFx) {
    scene.__a11yColorFx = cam.postFX.addColorMatrix();
  }
  const fx = scene.__a11yColorFx;
  fx.reset();

  switch (scene.a11y.colorMode) {
    case "protanopia":
      fx.protanopia?.();
      break;
    case "tritanopia":
      fx.tritanopia?.();
      break;
    case "grayscale":
      fx.grayscale?.();
      break;
    default:
      break;
  }
}

function makeBtn(scene, x, y, w, h, label, onClick, style = {}) {
  const c = scene.add.container(x, y);

  const bg = scene.add
    .rectangle(0, 0, w, h, style.fill ?? 0x111827, style.alpha ?? 1)
    .setStrokeStyle(2, style.stroke ?? 0xffffff, style.strokeAlpha ?? 0.18);

  const txt = scene.add.text(0, 0, label, {
    fontFamily: "Arial",
    fontSize: style.fontSize ?? 16,
    color: style.color ?? "#ffffff",
  }).setOrigin(0.5);

  c.add([bg, txt]);
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

  c.on("pointerdown", onClick);
  c.on("pointerover", () => bg.setFillStyle(style.hoverFill ?? 0x1f2937, 1));
  c.on("pointerout", () => bg.setFillStyle(style.fill ?? 0x111827, style.alpha ?? 1));

  return { c, bg, txt };
}

/**
 * Panel lateral. No dispara onChange al crear.
 * - anchor: "left" | "right"
 */
export function createA11yPanel(scene, { onChange, anchor = "left" } = {}) {
  const loaded = loadA11yPrefs();
  const prefs = { ...defaultA11yPrefs(), ...(loaded || {}) };
  scene.a11y = { ...(scene.a11y || {}), ...prefs };

  const panelW = A11Y_PANEL_WIDTH;
  const headerH = 64;  // alto cuando colapsa
  const pad = 14;

  const root = scene.add.container(0, 16).setDepth(9999);

  // Sombra “falsa”
  const shadow = scene.add.rectangle(6, 8, panelW, scene.scale.height - 32, 0x000000, 0.18)
    .setOrigin(0, 0);

  // Fondo más sólido (más llamativo)
  const bg = scene.add.rectangle(0, 0, panelW, scene.scale.height - 32, 0x0a1222, 0.92)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14);

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

  const body = scene.add.container(0, 70);
  root.add(body);

  function commit() {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale ?? 1, 0.9, 1.3);
    scene.a11y.textScale = clamp(scene.a11y.textScale ?? 1, 0.9, 1.3);

    saveA11yPrefs({ ...scene.a11y });
    applyA11yToScene(scene, scene.a11y);

    if (typeof onChange === "function") onChange(scene.a11y);
  }

  function applyCollapseVisual() {
    const open = !!scene.a11y.panelOpen;
    body.setVisible(open);
    hint.setVisible(open);
    collapse.txt.setText(open ? "Ocultar" : "Mostrar");

    const h = open ? (scene.scale.height - 32) : headerH;
    bg.setSize(panelW, h);
    shadow.setSize(panelW, h);
  }

  const collapse = makeBtn(
    scene,
    panelW - 64,
    30,
    98,
    40,
    scene.a11y.panelOpen ? "Ocultar" : "Mostrar",
    () => {
      scene.a11y.panelOpen = !scene.a11y.panelOpen;
      applyCollapseVisual();
      commit();
    },
    {
      fill: 0x16233d,
      hoverFill: 0x1b2a49,
      stroke: 0xffffff,
      strokeAlpha: 0.18,
      fontSize: 15,
      color: "#ffffff",
    }
  );
  root.add(collapse.c);

  // Separador
  const sep = scene.add.rectangle(panelW / 2, 62, panelW - 2 * pad, 1, 0xffffff, 0.12);
  root.add(sep);

  // --- Controles ---
  let y = 0;

  const section = (label) => {
    const t = scene.add.text(pad, y + 6, label, { fontFamily: "Arial", fontSize: 13, color: "#cbd5e1" });
    body.add(t);
    y += 24;
  };

  const wideBtnStyle = {
    fill: 0x111827,
    hoverFill: 0x1f2937,
    stroke: 0xffffff,
    strokeAlpha: 0.18,
    fontSize: 16,
    color: "#ffffff",
  };

  const bTTS = makeBtn(scene, panelW / 2, y + 22, panelW - 2 * pad, 46, scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF", () => {
    scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;
    bTTS.txt.setText(scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF");
    if (!scene.a11y.ttsEnabled) stopSpeech();
    commit();
  }, wideBtnStyle);
  body.add(bTTS.c);
  y += 60;

  const bHC = makeBtn(scene, panelW / 2, y + 22, panelW - 2 * pad, 46, scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal", () => {
    scene.a11y.highContrast = !scene.a11y.highContrast;
    bHC.txt.setText(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");
    commit();
  }, wideBtnStyle);
  body.add(bHC.c);
  y += 64;

  section("Daltonismo / filtro");

  const smallStyle = {
    fill: 0x16233d,
    hoverFill: 0x1b2a49,
    stroke: 0xffffff,
    strokeAlpha: 0.18,
    fontSize: 14,
    color: "#ffffff",
  };

  const row1 = scene.add.container(0, y);
  const bNormal = makeBtn(scene, 82, 20, 124, 42, "Normal", () => { scene.a11y.colorMode = "normal"; commit(); }, smallStyle);
  const bProt = makeBtn(scene, 206, 20, 124, 42, "Protan.", () => { scene.a11y.colorMode = "protanopia"; commit(); }, smallStyle);
  row1.add([bNormal.c, bProt.c]);
  body.add(row1);
  y += 52;

  const row2 = scene.add.container(0, y);
  const bTrit = makeBtn(scene, 82, 20, 124, 42, "Tritan.", () => { scene.a11y.colorMode = "tritanopia"; commit(); }, smallStyle);
  const bGray = makeBtn(scene, 206, 20, 124, 42, "Grises", () => { scene.a11y.colorMode = "grayscale"; commit(); }, smallStyle);
  row2.add([bTrit.c, bGray.c]);
  body.add(row2);
  y += 62;

  section("Tamaño");

  const row3 = scene.add.container(0, y);
  const bTextMinus = makeBtn(scene, 64, 20, 56, 40, "A-", () => { scene.a11y.textScale = clamp((scene.a11y.textScale ?? 1) - 0.1, 0.9, 1.3); commit(); }, smallStyle);
  const bTextPlus  = makeBtn(scene, 124, 20, 56, 40, "A+", () => { scene.a11y.textScale = clamp((scene.a11y.textScale ?? 1) + 0.1, 0.9, 1.3); commit(); }, smallStyle);
  const bUiMinus   = makeBtn(scene, 184, 20, 56, 40, "UI-", () => { scene.a11y.uiScale   = clamp((scene.a11y.uiScale ?? 1) - 0.1, 0.9, 1.3); commit(); }, smallStyle);
  const bUiPlus    = makeBtn(scene, 244, 20, 56, 40, "UI+", () => { scene.a11y.uiScale   = clamp((scene.a11y.uiScale ?? 1) + 0.1, 0.9, 1.3); commit(); }, smallStyle);
  row3.add([bTextMinus.c, bTextPlus.c, bUiMinus.c, bUiPlus.c]);
  body.add(row3);
  y += 62;

  const bReset = makeBtn(scene, panelW / 2, y + 22, panelW - 2 * pad, 46, "Restablecer", () => {
    scene.a11y = { ...(scene.a11y || {}), ...defaultA11yPrefs() };
    bTTS.txt.setText("Voz: OFF");
    bHC.txt.setText("Contraste: normal");
    stopSpeech();
    applyCollapseVisual();
    commit();
  }, wideBtnStyle);
  body.add(bReset.c);

  // posicionar panel
  const place = (w, h) => {
    const x = anchor === "left" ? 16 : (w - panelW - 16);
    root.setPosition(x, 16);
    shadow.setPosition(x + 6, 24); // sombra un poco desplazada
    // ojo: shadow está dentro root, así que aquí solo ajustamos tamaño:
    const currentH = (scene.a11y?.panelOpen ? (h - 32) : headerH);
    bg.setSize(panelW, currentH);
    shadow.setSize(panelW, currentH);
  };

  // Como shadow está dentro root, mejor no lo reposicionamos con setPosition fuera del root:
  // Ajustamos con offsets locales:
  shadow.setPosition(6, 8);

  place(scene.scale.width, scene.scale.height);
  scene.scale.on("resize", (gs) => place(gs.width, gs.height));

  applyCollapseVisual(); // NO dispara onChange

  return { root, getPrefs: () => scene.a11y };
}
