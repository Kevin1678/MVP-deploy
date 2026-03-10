// client/src/phaser/a11yPanel.js
import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";

export function loadA11yPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveA11yPrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,       // IMPORTANTE: ya no inicia prendido
    highContrast: false,
    colorMode: "normal",     // normal | protanopia | tritanopia | grayscale
    uiScale: 1,              // 0.9 - 1.3 (por botones)
    textScale: 1,            // 0.9 - 1.3
    panelOpen: true,
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getColorMatrixFx(scene) {
  // Phaser 3: ColorMatrix post-fx en cámara
  const cam = scene.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return null;

  // Reutiliza si ya existe
  if (scene.__a11yColorFx) return scene.__a11yColorFx;

  const fx = cam.postFX.addColorMatrix();
  scene.__a11yColorFx = fx;
  return fx;
}

export function applyA11yToScene(scene, prefs) {
  // 1) Contraste base (tú ajustas colores dentro de cada escena)
  // Aquí solo guardamos flags para que tus escenas lo usen:
  scene.a11y = { ...(scene.a11y || {}), ...prefs };

  // 2) Daltonismo / filtros (si existe ColorMatrix)
  const fx = getColorMatrixFx(scene);
  if (fx) {
    fx.reset();

    switch (prefs.colorMode) {
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
        // normal
        break;
    }
  }
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

function makeBtn(scene, x, y, w, h, label, onClick) {
  const c = scene.add.container(x, y);

  const hitRect = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
  const bg = scene.add.rectangle(0, 0, w, h, 0x111827, 1).setStrokeStyle(2, 0xffffff, 0.14);
  const txt = scene.add.text(0, 0, label, {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#ffffff",
  }).setOrigin(0.5);

  c.add([bg, txt]);

  // Hit-area robusta (NO se descuadra con escala)
  c.setSize(w, h);
  c.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
  c.on("pointerdown", onClick);

  c.on("pointerover", () => bg.setFillStyle(0x1f2937));
  c.on("pointerout", () => bg.setFillStyle(0x111827));

  return { c, bg, txt };
}

export function createA11yPanel(scene, {
  onChange,          // (prefs) => void
  anchor = "right",  // right
} = {}) {
  const loaded = loadA11yPrefs();
  const prefs = { ...defaultA11yPrefs(), ...(loaded || {}) };

  // Exponer en escena
  scene.a11y = { ...(scene.a11y || {}), ...prefs };

  const W = scene.scale.width;
  const H = scene.scale.height;

  const panelW = 260;
  const panelX = anchor === "right" ? (W - panelW - 16) : 16;
  const panelY = 16;

  const root = scene.add.container(panelX, panelY).setDepth(9999);

  const bg = scene.add.rectangle(0, 0, panelW, H - 32, 0x0b1020, 0.78)
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

  function commit() {
    // guardar
    saveA11yPrefs({
      ...scene.a11y,
      panelOpen: scene.a11y.panelOpen,
    });

    // aplicar filtros a cámara
    applyA11yToScene(scene, scene.a11y);

    // callback
    onChange?.(scene.a11y);
  }

  // Botón colapsar
  const collapse = makeBtn(scene, panelW - 60, 26, 90, 34, prefs.panelOpen ? "Ocultar" : "Mostrar", () => {
    scene.a11y.panelOpen = !scene.a11y.panelOpen;
    collapse.txt.setText(scene.a11y.panelOpen ? "Ocultar" : "Mostrar");
    body.setVisible(scene.a11y.panelOpen);
    commit();
  });
  collapse.c.setPosition(panelW - 62, 28);
  root.add(collapse.c);

  const body = scene.add.container(0, 62);
  body.setVisible(scene.a11y.panelOpen);
  root.add(body);

  // ----- Botones -----
  let y = 10;

  // TTS
  const bTTS = makeBtn(scene, panelW / 2, y + 18, panelW - 28, 44,
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

  // Contraste
  const bHC = makeBtn(scene, panelW / 2, y + 18, panelW - 28, 44,
    scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal",
    () => {
      scene.a11y.highContrast = !scene.a11y.highContrast;
      bHC.txt.setText(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");
      commit();
    }
  );
  body.add(bHC.c);
  y += 56;

  // Color modes
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

  // Tamaños (en vez de slider: + / - porque es más simple y no falla)
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
    scene.a11y.textScale = clamp(scene.a11y.textScale - 0.1, 0.9, 1.3);
    commit();
  });
  const bTextPlus = makeBtn(scene, 120, 20, 48, 40, "A+", () => {
    scene.a11y.textScale = clamp(scene.a11y.textScale + 0.1, 0.9, 1.3);
    commit();
  });
  const bUiMinus = makeBtn(scene, 180, 20, 48, 40, "UI-", () => {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale - 0.1, 0.9, 1.3);
    commit();
  });
  const bUiPlus = makeBtn(scene, 240, 20, 48, 40, "UI+", () => {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale + 0.1, 0.9, 1.3);
    commit();
  });

  row3.add([bTextMinus.c, bTextPlus.c, bUiMinus.c, bUiPlus.c]);

  y += 62;

  // Reset
  const bReset = makeBtn(scene, panelW / 2, y + 18, panelW - 28, 44, "Restablecer", () => {
    const fresh = defaultA11yPrefs();
    scene.a11y = { ...(scene.a11y || {}), ...fresh };
    // actualizar labels visibles
    bTTS.txt.setText("Voz: OFF");
    bHC.txt.setText("Contraste: normal");
    collapse.txt.setText(scene.a11y.panelOpen ? "Ocultar" : "Mostrar");
    body.setVisible(scene.a11y.panelOpen);
    stopSpeech();
    commit();
  });
  body.add(bReset.c);

  // Apply initial
  commit();

  // Resize update
  scene.scale.on("resize", (gs) => {
    const newW = gs.width;
    const newH = gs.height;

    const newX = anchor === "right" ? (newW - panelW - 16) : 16;
    root.setPosition(newX, 16);
    bg.setSize(panelW, newH - 32);
  });

  // Exponer un destroy
  const destroy = () => {
    try { root.destroy(true); } catch {}
  };

  return { root, destroy, getPrefs: () => scene.a11y };
}
