// client/src/phaser/a11yPanel.js
import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,     // OFF por defecto
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
  try {
    window.speechSynthesis?.cancel();
  } catch {}
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
 * Aplica filtros globales a la cámara (si existen), y guarda prefs en scene.a11y.
 * Esto NO debe depender de que existan textos/objetos del juego.
 */
export function applyA11yToScene(scene, prefs) {
  if (!scene) return;
  scene.a11y = { ...(scene.a11y || {}), ...(prefs || {}) };

  // PostFX ColorMatrix (si la build de Phaser lo soporta)
  const cam = scene.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return;

  // Reutiliza instancia
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

function makeBtn(scene, x, y, w, h, label, onClick) {
  const c = scene.add.container(x, y);

  const bg = scene.add
    .rectangle(0, 0, w, h, 0x111827, 1)
    .setStrokeStyle(2, 0xffffff, 0.14);

  const txt = scene.add
    .text(0, 0, label, { fontFamily: "Arial", fontSize: "16px", color: "#ffffff" })
    .setOrigin(0.5);

  c.add([bg, txt]);

  // Hit-area robusta (no se rompe con scale)
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

  c.on("pointerdown", onClick);
  c.on("pointerover", () => bg.setFillStyle(0x1f2937));
  c.on("pointerout", () => bg.setFillStyle(0x111827));

  return { c, bg, txt };
}

/**
 * Panel lateral global.
 * MUY IMPORTANTE:
 * - NO llama onChange durante la creación (para no romper scenes que aún no crean UI).
 * - El scene debe llamar scene.applyTheme() al final de create().
 */
export function createA11yPanel(scene, { onChange, anchor = "right" } = {}) {
  const loaded = loadA11yPrefs();
  const prefs = { ...defaultA11yPrefs(), ...(loaded || {}) };

  scene.a11y = { ...(scene.a11y || {}), ...prefs };

  const panelW = 260;
  const root = scene.add.container(0, 16).setDepth(9999);

  const bg = scene.add
    .rectangle(0, 0, panelW, scene.scale.height - 32, 0x0b1020, 0.78)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.12);

  const title = scene.add.text(14, 12, "Accesibilidad", {
    fontFamily: "Arial",
    fontSize: "20px",
    color: "#ffffff",
  });

  const hint = scene.add.text(14, 38, "Opciones rápidas", {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#cbd5e1",
  });

  root.add([bg, title, hint]);

  const body = scene.add.container(0, 62);
  root.add(body);

  // Colapsar / mostrar
// --- Botón colapsar (COLAPSO REAL) ---
const headerH = 58;
function applyCollapseVisual() {
  const open = !!scene.a11y.panelOpen;
  collapse.txt.setText(open ? "Ocultar" : "Mostrar");
  body.setVisible(open);
  hint.setVisible(open);

  // reduce el fondo cuando está cerrado
  bg.setSize(panelW, open ? (scene.scale.height - 32) : headerH);

  // evita que el panel “tape” el juego cuando está cerrado
  // (solo deja visible el encabezado)
}

const collapse = makeBtn(scene, panelW - 62, 28, 90, 34, scene.a11y.panelOpen ? "Ocultar" : "Mostrar", () => {
  scene.a11y.panelOpen = !scene.a11y.panelOpen;
  applyCollapseVisual();
  commit();
});
root.add(collapse.c);

// después de crear body:
applyCollapseVisual();

  function commit() {
    // guardar global
    saveA11yPrefs({
      ...scene.a11y,
      uiScale: clamp(scene.a11y.uiScale ?? 1, 0.9, 1.3),
      textScale: clamp(scene.a11y.textScale ?? 1, 0.9, 1.3),
    });

    // aplica filtros (no depende de UI)
    applyA11yToScene(scene, scene.a11y);

    // callback para que la escena actualice colores/tamaños
    if (typeof onChange === "function") onChange(scene.a11y);
  }

  // Botones
  let y = 10;

  const bTTS = makeBtn(
    scene,
    panelW / 2,
    y + 18,
    panelW - 28,
    44,
    scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF",
    () => {
      scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;
      bTTS.txt.setText(scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF");
      if (!scene.a11y.ttsEnabled) stopSpeech();
      commit();
    }
  );
  body.add(bTTS.c);
  y += 56;

  const bHC = makeBtn(
    scene,
    panelW / 2,
    y + 18,
    panelW - 28,
    44,
    scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal",
    () => {
      scene.a11y.highContrast = !scene.a11y.highContrast;
      bHC.txt.setText(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");
      commit();
    }
  );
  body.add(bHC.c);
  y += 56;

  const labelColor = scene.add.text(14, y + 6, "Daltonismo / filtro", {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#cbd5e1",
  });
  body.add(labelColor);
  y += 28;

  const row1 = scene.add.container(0, y);
  body.add(row1);

  const bNormal = makeBtn(scene, 70, 20, 110, 40, "Normal", () => {
    scene.a11y.colorMode = "normal";
    commit();
  });
  const bProt = makeBtn(scene, 190, 20, 110, 40, "Protan.", () => {
    scene.a11y.colorMode = "protanopia";
    commit();
  });
  row1.add([bNormal.c, bProt.c]);
  y += 52;

  const row2 = scene.add.container(0, y);
  body.add(row2);

  const bTrit = makeBtn(scene, 70, 20, 110, 40, "Tritan.", () => {
    scene.a11y.colorMode = "tritanopia";
    commit();
  });
  const bGray = makeBtn(scene, 190, 20, 110, 40, "Grises", () => {
    scene.a11y.colorMode = "grayscale";
    commit();
  });
  row2.add([bTrit.c, bGray.c]);
  y += 62;

  const labelSize = scene.add.text(14, y, "Tamaño", {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#cbd5e1",
  });
  body.add(labelSize);
  y += 26;

  const row3 = scene.add.container(0, y);
  body.add(row3);

  const bTextMinus = makeBtn(scene, 60, 20, 48, 40, "A-", () => {
    scene.a11y.textScale = clamp((scene.a11y.textScale ?? 1) - 0.1, 0.9, 1.3);
    commit();
  });
  const bTextPlus = makeBtn(scene, 120, 20, 48, 40, "A+", () => {
    scene.a11y.textScale = clamp((scene.a11y.textScale ?? 1) + 0.1, 0.9, 1.3);
    commit();
  });
  const bUiMinus = makeBtn(scene, 180, 20, 48, 40, "UI-", () => {
    scene.a11y.uiScale = clamp((scene.a11y.uiScale ?? 1) - 0.1, 0.9, 1.3);
    commit();
  });
  const bUiPlus = makeBtn(scene, 240, 20, 48, 40, "UI+", () => {
    scene.a11y.uiScale = clamp((scene.a11y.uiScale ?? 1) + 0.1, 0.9, 1.3);
    commit();
  });
  row3.add([bTextMinus.c, bTextPlus.c, bUiMinus.c, bUiPlus.c]);
  y += 62;

  const bReset = makeBtn(scene, panelW / 2, y + 18, panelW - 28, 44, "Restablecer", () => {
    scene.a11y = { ...(scene.a11y || {}), ...defaultA11yPrefs() };

    bTTS.txt.setText("Voz: OFF");
    bHC.txt.setText("Contraste: normal");

    collapse.txt.setText(scene.a11y.panelOpen ? "Ocultar" : "Mostrar");
    body.setVisible(scene.a11y.panelOpen);

    stopSpeech();
    commit();
  });
  body.add(bReset.c);

  // Posición del panel
  const place = (w, h) => {
    const x = anchor === "right" ? w - panelW - 16 : 16;
    root.setPosition(x, 16);
    bg.setSize(panelW, h - 32);
  };
  place(scene.scale.width, scene.scale.height);

  scene.scale.on("resize", (gs) => place(gs.width, gs.height));

  // ⚠️ IMPORTANTÍSIMO: aquí NO se llama onChange.
  // El scene debe llamar applyTheme() al final de create().

  const destroy = () => {
    try { root.destroy(true); } catch {}
  };

  return { root, destroy, getPrefs: () => scene.a11y };
}
