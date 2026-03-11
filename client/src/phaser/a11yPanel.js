import Phaser from "phaser";

const LS_KEY = "a11y_prefs_v1";

export const PANEL_OPEN_W = 290;
export const PANEL_CLOSED_W = 78;
export const PANEL_GAP = 16;

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,
    highContrast: false,
    colorMode: "normal", // normal | grayscale (si tu Phaser soporta postFX)
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
 * Esto NO depende del UI.
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

function makeRectButton(scene, { x, y, w, h, label, onClick, onHover }) {
  const box = scene.add.rectangle(x, y, w, h, 0x111827, 1).setStrokeStyle(2, 0xffffff, 0.16);
  const text = scene.add.text(x, y, label, {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#ffffff",
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0.5);
  hit.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

  hit.on("pointerdown", onClick);
  if (onHover) hit.on("pointerover", onHover);

  const setLabel = (t) => text.setText(t);

  const setStyle = ({ fill, strokeAlpha, textColor }) => {
    box.setFillStyle(fill, 1);
    box.setStrokeStyle(2, 0xffffff, strokeAlpha);
    text.setColor(textColor);
  };

  const setSize = (nw, nh) => {
    box.setDisplaySize(nw, nh);
    hit.setDisplaySize(nw, nh);
    hit.setInteractive(new Phaser.Geom.Rectangle(-nw / 2, -nh / 2, nw, nh), Phaser.Geom.Rectangle.Contains);
  };

  const setPos = (nx, ny) => {
    box.setPosition(nx, ny);
    text.setPosition(nx, ny);
    hit.setPosition(nx, ny);
  };

  const setVisible = (v) => {
    box.setVisible(v);
    text.setVisible(v);
    hit.setVisible(v);
  };

  const destroy = () => {
    box.destroy();
    text.destroy();
    hit.destroy();
  };

  return { box, text, hit, setLabel, setStyle, setSize, setPos, setVisible, destroy };
}

/**
 * Panel lateral estable (sin containers escalados).
 * Retorna: { getWidth(), refresh(), destroy() }
 */
export function createA11yPanel(scene, { anchor = "left", onChange } = {}) {
  const loaded = loadA11yPrefs();
  scene.a11y = { ...defaultA11yPrefs(), ...(loaded || {}), ...(scene.a11y || {}) };

  const pad = 14;
  const headerH = 64;

  const root = scene.add.container(0, 0).setDepth(9999);

  const shadow = scene.add.rectangle(6, 8, PANEL_OPEN_W, scene.scale.height - 32, 0x000000, 0.18).setOrigin(0, 0);
  const bg = scene.add.rectangle(0, 0, PANEL_OPEN_W, scene.scale.height - 32, 0x0a1222, 0.92)
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

  const sep = scene.add.rectangle(PANEL_OPEN_W / 2, 62, PANEL_OPEN_W - 2 * pad, 1, 0xffffff, 0.12);

  root.add([shadow, bg, title, hint, sep]);

  // Botón colapsar
  const toggleBtn = makeRectButton(scene, {
    x: PANEL_OPEN_W - 64,
    y: 30,
    w: 98,
    h: 40,
    label: scene.a11y.panelOpen ? "Ocultar" : "Mostrar",
    onClick: () => {
      scene.a11y.panelOpen = !scene.a11y.panelOpen;
      commit();
      refresh();
    },
  });
  root.add([toggleBtn.box, toggleBtn.text, toggleBtn.hit]);

  // Botones / controles (se colocan a mano, sin escalar contenedores)
  const controls = [];

  function commit() {
    scene.a11y.uiScale = clamp(scene.a11y.uiScale ?? 1, 0.9, 1.3);
    scene.a11y.textScale = clamp(scene.a11y.textScale ?? 1, 0.9, 1.3);

    saveA11yPrefs({ ...scene.a11y });
    try { applyA11yToScene(scene, scene.a11y); } catch {}

    if (typeof onChange === "function") onChange(scene.a11y);
  }

  function addBtn(y, label, onClick, onHoverSpeak = true) {
    const btn = makeRectButton(scene, {
      x: PANEL_OPEN_W / 2,
      y,
      w: PANEL_OPEN_W - 2 * pad,
      h: 46,
      label,
      onClick,
      onHover: onHoverSpeak ? () => speakIfEnabled(scene, label) : undefined,
    });
    controls.push(btn);
    root.add([btn.box, btn.text, btn.hit]);
    return btn;
  }

  function addSmallRow(y, items) {
    const w = 124;
    const h = 42;
    const x1 = 82;
    const x2 = 206;

    const btnA = makeRectButton(scene, { x: x1, y, w, h, ...items[0] });
    const btnB = makeRectButton(scene, { x: x2, y, w, h, ...items[1] });

    controls.push(btnA, btnB);
    root.add([btnA.box, btnA.text, btnA.hit, btnB.box, btnB.text, btnB.hit]);
    return [btnA, btnB];
  }

  // ---- construir controles ----
  let y = 102;

  const bTTS = addBtn(y, scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF", () => {
    scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;
    if (!scene.a11y.ttsEnabled) stopSpeech();
    commit();
    refresh();
  });
  y += 56;

  const bHC = addBtn(y, scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal", () => {
    scene.a11y.highContrast = !scene.a11y.highContrast;
    commit();
    refresh();
  });
  y += 64;

  const labelColor = scene.add.text(pad, y, "Filtro", { fontFamily: "Arial", fontSize: "13px", color: "#cbd5e1" });
  root.add(labelColor);
  y += 28;

  addSmallRow(y + 18, [
    {
      label: "Normal",
      onClick: () => { scene.a11y.colorMode = "normal"; commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Normal"),
    },
    {
      label: "Grises",
      onClick: () => { scene.a11y.colorMode = "grayscale"; commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Grises"),
    },
  ]);
  y += 70;

  const labelSize = scene.add.text(pad, y, "Tamaño", { fontFamily: "Arial", fontSize: "13px", color: "#cbd5e1" });
  root.add(labelSize);
  y += 28;

  addSmallRow(y + 18, [
    {
      label: "A-",
      onClick: () => { scene.a11y.textScale = clamp(scene.a11y.textScale - 0.1, 0.9, 1.3); commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Texto menos"),
    },
    {
      label: "A+",
      onClick: () => { scene.a11y.textScale = clamp(scene.a11y.textScale + 0.1, 0.9, 1.3); commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Texto más"),
    },
  ]);
  y += 56;

  addSmallRow(y + 18, [
    {
      label: "UI-",
      onClick: () => { scene.a11y.uiScale = clamp(scene.a11y.uiScale - 0.1, 0.9, 1.3); commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Interfaz menos"),
    },
    {
      label: "UI+",
      onClick: () => { scene.a11y.uiScale = clamp(scene.a11y.uiScale + 0.1, 0.9, 1.3); commit(); refresh(); },
      onHover: () => speakIfEnabled(scene, "Interfaz más"),
    },
  ]);
  y += 70;

  const bReset = addBtn(y, "Restablecer", () => {
    scene.a11y = { ...defaultA11yPrefs() };
    stopSpeech();
    commit();
    refresh();
  }, false);
  y += 56;

  function getWidth() {
    return scene.a11y.panelOpen ? PANEL_OPEN_W : PANEL_CLOSED_W;
  }

  function place() {
    const w = scene.scale.width;
    const x = anchor === "left" ? 16 : (w - getWidth() - 16);
    root.setPosition(x, 16);
  }

  function refresh() {
    // ancho efectivo (abierto/cerrado)
    const open = !!scene.a11y.panelOpen;
    toggleBtn.setLabel(open ? "Ocultar" : "Mostrar");
    bTTS.setLabel(scene.a11y.ttsEnabled ? "Voz: ON" : "Voz: OFF");
    bHC.setLabel(scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal");

    // estilos
    const hc = !!scene.a11y.highContrast;

    const fill = hc ? 0xffffff : 0x0a1222;
    const titleColor = hc ? "#000000" : "#ffffff";
    const hintColor = hc ? "#000000" : "#cbd5e1";

    bg.setFillStyle(fill, hc ? 1 : 0.92);
    bg.setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.14);
    shadow.setVisible(!hc);

    title.setColor(titleColor);
    hint.setColor(hintColor);
    labelColor.setColor(hintColor);
    labelSize.setColor(hintColor);

    // botones
    const btnFill = hc ? 0xffffff : 0x111827;
    const btnText = hc ? "#000000" : "#ffffff";
    const strokeA = hc ? 1 : 0.16;

    [toggleBtn, ...controls].forEach((b) => b.setStyle({ fill: btnFill, strokeAlpha: strokeA, textColor: btnText }));

    // colapso real
    const panelW = getWidth();
    const panelH = open ? (scene.scale.height - 32) : headerH;

    bg.setSize(panelW, panelH);
    shadow.setSize(panelW, panelH);
    sep.setSize(panelW - 2 * pad, 1);
    sep.setPosition(panelW / 2, 62);

    // header textos
    title.setVisible(open);
    hint.setVisible(open);
    sep.setVisible(open);
    labelColor.setVisible(open);
    labelSize.setVisible(open);

    // si está cerrado: ocultar controles y mover toggle centrado
    controls.forEach((b) => b.setVisible(open));
    toggleBtn.setPos(panelW - 64, 30);

    place();
  }

  place();
  refresh();

  scene.scale.on("resize", () => {
    place();
    refresh();
  });

  return {
    getWidth,
    refresh,
    destroy: () => {
      try {
        toggleBtn.destroy();
        controls.forEach((b) => b.destroy());
        bg.destroy();
        shadow.destroy();
        title.destroy();
        hint.destroy();
        sep.destroy();
        labelColor.destroy();
        labelSize.destroy();
        root.destroy(true);
      } catch {}
    },
  };
}
