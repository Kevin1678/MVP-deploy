import {
  MAX_TEXT_SCALE,
  MAX_TTS_VOLUME,
  MAX_UI_SCALE,
  MIN_TEXT_SCALE,
  MIN_TTS_VOLUME,
  MIN_UI_SCALE,
  PANEL_CLOSED_W,
  PANEL_OPEN_W,
} from "./constants";
import { applyA11yToScene, destroyA11yFx } from "./effects";
import { createA11yPanelButton } from "./panelButton";
import { defaultA11yPrefs, loadA11yPrefs, saveA11yPrefs } from "./prefs";
import { hideCaption, speakIfEnabled, stopSpeech } from "./speech";
import { applyThemeToScene, getA11yTheme } from "./theme";
import { clamp } from "./utils";

export function createA11yPanel(scene, { anchor = "left", onChange } = {}) {
  const loaded = loadA11yPrefs();

  const basePrefs = {
    ...defaultA11yPrefs(),
    ...(loaded || {}),
    ...(scene.a11y || {}),
  };

  scene.a11y = {
    ...basePrefs,
    ttsVolume: clamp(
      basePrefs.ttsVolume ?? 1,
      MIN_TTS_VOLUME,
      MAX_TTS_VOLUME
    ),
  };

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
    scene.a11y.uiScale = clamp(
      scene.a11y.uiScale ?? 1,
      MIN_UI_SCALE,
      MAX_UI_SCALE
    );

    scene.a11y.textScale = clamp(
      scene.a11y.textScale ?? 1,
      MIN_TEXT_SCALE,
      MAX_TEXT_SCALE
    );

    scene.a11y.ttsVolume = clamp(
      scene.a11y.ttsVolume ?? 1,
      MIN_TTS_VOLUME,
      MAX_TTS_VOLUME
    );

    saveA11yPrefs({ ...scene.a11y });
    applyA11yToScene(scene, scene.a11y);
    applyThemeToScene(scene);

    if (scene.__captionsOverlay) {
      scene.__captionsOverlay.layout?.();
    }

    if (typeof onChange === "function") onChange(scene.a11y);
  }

  const toggle = createA11yPanelButton(
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

  const btnTTS = createA11yPanelButton(
    scene,
    pad,
    102,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.ttsEnabled ? "Voz: Encendido" : "Voz: Apagado",
    () => {
      scene.a11y.ttsEnabled = !scene.a11y.ttsEnabled;

      if (!scene.a11y.ttsEnabled) {
        stopSpeech(scene);
      }

      commit();
      refresh();
    }
  );

  const btnCaptions = createA11yPanelButton(
    scene,
    pad,
    158,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.captionsEnabled
      ? "Subtítulos: Encendidos"
      : "Subtítulos: Apagados",
    () => {
      scene.a11y.captionsEnabled = !scene.a11y.captionsEnabled;

      if (!scene.a11y.captionsEnabled) {
        hideCaption(scene);
      }

      commit();
      refresh();
    }
  );

  const btnHC = createA11yPanelButton(
    scene,
    pad,
    214,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal",
    () => {
      scene.a11y.highContrast = !scene.a11y.highContrast;
      commit();
      refresh();
    }
  );

  const btnTheme = createA11yPanelButton(
    scene,
    pad,
    270,
    PANEL_OPEN_W - 2 * pad,
    46,
    scene.a11y.themeMode === "light" ? "Modo: Claro" : "Modo: Oscuro",
    () => {
      scene.a11y.themeMode =
        scene.a11y.themeMode === "light" ? "dark" : "light";

      commit();
      refresh();
    }
  );

  const labelSize = scene.add.text(pad, 332, "Tamaño", {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#cbd5e1",
  });

  const btnAminus = createA11yPanelButton(
    scene,
    pad,
    356,
    124,
    42,
    "T-",
    () => {
      scene.a11y.textScale = clamp(
        (scene.a11y.textScale ?? 1) - 0.1,
        MIN_TEXT_SCALE,
        MAX_TEXT_SCALE
      );

      commit();
      refresh();
    }
  );

  const btnAplus = createA11yPanelButton(
    scene,
    pad + 138,
    356,
    124,
    42,
    "T+",
    () => {
      scene.a11y.textScale = clamp(
        (scene.a11y.textScale ?? 1) + 0.1,
        MIN_TEXT_SCALE,
        MAX_TEXT_SCALE
      );

      commit();
      refresh();
    }
  );

  const btnUIminus = createA11yPanelButton(
    scene,
    pad,
    406,
    124,
    42,
    "UI-",
    () => {
      scene.a11y.uiScale = clamp(
        (scene.a11y.uiScale ?? 1) - 0.1,
        MIN_UI_SCALE,
        MAX_UI_SCALE
      );

      commit();
      refresh();
    }
  );

  const btnUIplus = createA11yPanelButton(
    scene,
    pad + 138,
    406,
    124,
    42,
    "UI+",
    () => {
      scene.a11y.uiScale = clamp(
        (scene.a11y.uiScale ?? 1) + 0.1,
        MIN_UI_SCALE,
        MAX_UI_SCALE
      );

      commit();
      refresh();
    }
  );

  const volumeLabelY = 466;
  const volumeBarY = 514;
  const volumeBarX = pad;
  const volumeBarW = PANEL_OPEN_W - 2 * pad;
  const volumeBarH = 10;
  const volumeKnobSize = 22;

  const labelVolume = scene.add.text(pad, volumeLabelY, "Volumen narrador", {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#cbd5e1",
  });

  const volumeValue = scene.add
    .text(PANEL_OPEN_W - pad, volumeLabelY, "100%", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#cbd5e1",
    })
    .setOrigin(1, 0);

  const volumeTrackBg = scene.add
    .rectangle(volumeBarX, volumeBarY, volumeBarW, volumeBarH, 0x334155, 1)
    .setOrigin(0, 0.5);

  const volumeTrackFill = scene.add
    .rectangle(volumeBarX, volumeBarY, volumeBarW, volumeBarH, 0x38bdf8, 1)
    .setOrigin(0, 0.5);

  const volumeKnob = scene.add
    .circle(
      volumeBarX + volumeBarW,
      volumeBarY,
      volumeKnobSize / 2,
      0xffffff,
      1
    )
    .setStrokeStyle(2, 0x0f172a, 1);

  const volumeHit = scene.add
    .zone(volumeBarX, volumeBarY - 18, volumeBarW, 36)
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: true });

  let draggingVolume = false;

  function setVolumeFromPointer(pointer) {
    if (!scene.a11y.panelOpen) return;

    const localX = pointer.worldX - root.x;
    const rawValue = (localX - volumeBarX) / volumeBarW;

    scene.a11y.ttsVolume = clamp(rawValue, MIN_TTS_VOLUME, MAX_TTS_VOLUME);

    commit();
    refreshVolume();
  }

  function startVolumeDrag(pointer) {
    draggingVolume = true;
    setVolumeFromPointer(pointer);
  }

  function moveVolumeDrag(pointer) {
    if (!draggingVolume) return;
    setVolumeFromPointer(pointer);
  }

  function stopVolumeDrag() {
    if (!draggingVolume) return;

    draggingVolume = false;

    const percent = Math.round((scene.a11y.ttsVolume ?? 1) * 100);

    stopSpeech(scene);

    speakIfEnabled(scene, `Volumen del narrador ${percent} por ciento`, {
      delayMs: 80,
      minGapMs: 0,
    });
  }

  volumeHit.on("pointerdown", startVolumeDrag);
  volumeHit.on("pointermove", moveVolumeDrag);
  volumeHit.on("pointerup", stopVolumeDrag);
  volumeHit.on("pointerout", stopVolumeDrag);

  scene.input.on("pointerup", stopVolumeDrag);

  function refreshVolume() {
    const volume = clamp(
      scene.a11y.ttsVolume ?? 1,
      MIN_TTS_VOLUME,
      MAX_TTS_VOLUME
    );

    const percent = Math.round(volume * 100);
    const fillW = Math.max(1, volumeBarW * volume);
    const knobX = volumeBarX + volumeBarW * volume;

    volumeValue.setText(`${percent}%`);
    volumeTrackFill.setSize(fillW, volumeBarH);
    volumeKnob.setPosition(knobX, volumeBarY);
  }

  const btnReset = createA11yPanelButton(
    scene,
    pad,
    556,
    PANEL_OPEN_W - 2 * pad,
    46,
    "Restablecer",
    () => {
      const panelOpen = scene.a11y.panelOpen;

      scene.a11y = {
        ...defaultA11yPrefs(),
        panelOpen,
      };

      stopSpeech(scene);
      commit();
      refresh();
    }
  );

  root.add([
    toggle.box,
    toggle.text,
    toggle.hit,

    btnTTS.box,
    btnTTS.text,
    btnTTS.hit,

    btnCaptions.box,
    btnCaptions.text,
    btnCaptions.hit,

    btnHC.box,
    btnHC.text,
    btnHC.hit,

    btnTheme.box,
    btnTheme.text,
    btnTheme.hit,

    labelSize,

    btnAminus.box,
    btnAminus.text,
    btnAminus.hit,

    btnAplus.box,
    btnAplus.text,
    btnAplus.hit,

    btnUIminus.box,
    btnUIminus.text,
    btnUIminus.hit,

    btnUIplus.box,
    btnUIplus.text,
    btnUIplus.hit,

    labelVolume,
    volumeValue,
    volumeTrackBg,
    volumeTrackFill,
    volumeKnob,
    volumeHit,

    btnReset.box,
    btnReset.text,
    btnReset.hit,
  ]);

  function getWidth() {
    return scene.a11y.panelOpen ? PANEL_OPEN_W : PANEL_CLOSED_W;
  }

  function place() {
    const w = scene.scale.width;
    const x = anchor === "left" ? 16 : w - getWidth() - 16;

    root.setPosition(x, 16);
  }

  function refresh() {
    const open = !!scene.a11y.panelOpen;

    toggle.setLabel(open ? "Ocultar" : "Mostrar");

    btnTTS.setLabel(
      scene.a11y.ttsEnabled ? "Voz: Encendido" : "Voz: Apagado"
    );

    btnCaptions.setLabel(
      scene.a11y.captionsEnabled
        ? "Subtítulos: Encendidos"
        : "Subtítulos: Apagados"
    );

    btnHC.setLabel(
      scene.a11y.highContrast ? "Contraste: ALTO" : "Contraste: normal"
    );

    btnTheme.setLabel(
      scene.a11y.themeMode === "light" ? "Modo: Claro" : "Modo: Oscuro"
    );

    const theme = getA11yTheme(scene.a11y);
    const panelW = getWidth();
    const panelH = open ? scene.scale.height - 32 : headerH;

    bg.setSize(panelW, panelH);
    shadow.setSize(panelW, panelH);

    bg.setFillStyle(theme.panelBg, scene.a11y.highContrast ? 1 : 0.96);

    bg.setStrokeStyle(
      2,
      theme.panelStroke,
      scene.a11y.highContrast ? 1 : theme.buttonStrokeAlpha
    );

    shadow.setVisible(theme.panelShadow);

    title.setColor(theme.text);
    hint.setColor(theme.textMuted);
    labelSize.setColor(theme.textMuted);
    labelVolume.setColor(theme.textMuted);
    volumeValue.setColor(theme.textMuted);

    volumeTrackBg.setFillStyle(theme.buttonFill, 0.65);
    volumeTrackFill.setFillStyle(theme.buttonText, 1);
    volumeKnob.setFillStyle(theme.text, 1);
    volumeKnob.setStrokeStyle(2, theme.panelStroke, 1);

    [
      toggle,
      btnTTS,
      btnCaptions,
      btnHC,
      btnTheme,
      btnAminus,
      btnAplus,
      btnUIminus,
      btnUIplus,
      btnReset,
    ].forEach((button) => {
      button.setStyle(
        theme.buttonFill,
        theme.buttonText,
        theme.buttonStrokeAlpha
      );
    });

    title.setVisible(open);
    hint.setVisible(open);
    labelSize.setVisible(open);
    labelVolume.setVisible(open);
    volumeValue.setVisible(open);
    volumeTrackBg.setVisible(open);
    volumeTrackFill.setVisible(open);
    volumeKnob.setVisible(open);
    volumeHit.setVisible(open);

    [
      btnTTS,
      btnCaptions,
      btnHC,
      btnTheme,
      btnAminus,
      btnAplus,
      btnUIminus,
      btnUIplus,
      btnReset,
    ].forEach((button) => {
      button.setVisible(open);
    });

    toggle.setPos(panelW - 112, 14);

    refreshVolume();
    place();

    if (scene.__captionsOverlay) {
      scene.__captionsOverlay.layout?.();
    }
  }

  place();
  refresh();
  commit();

  const resizeHandler = () => {
    place();
    refresh();

    if (scene.__captionsOverlay) {
      scene.__captionsOverlay.layout?.();
    }
  };

  scene.scale.on("resize", resizeHandler);

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;

    cleaned = true;

    try {
      scene.scale.off("resize", resizeHandler);
    } catch {}

    try {
      scene.input.off("pointerup", stopVolumeDrag);
    } catch {}

    hideCaption(scene);
    stopSpeech(scene);
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
