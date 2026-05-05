import {
  DEFAULT_CAPTION_EXTRA_PER_CHAR_MS,
  DEFAULT_CAPTION_MAX_MS,
  DEFAULT_CAPTION_MIN_MS,
  MAX_TTS_VOLUME,
  MIN_TTS_VOLUME,
} from "./constants";

let speechTimer = null;
let speechToken = 0;
let lastSpeechAt = 0;
let captionTimer = null;

function safeClamp(value, min, max) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return max;
  }

  return Math.max(min, Math.min(max, numberValue));
}

export function createCaptionsOverlay(scene) {
  if (!scene || scene.__captionsOverlay) return scene.__captionsOverlay;

  const overlay = {};

  overlay.bg = scene.add
    .rectangle(0, 0, 100, 60, 0x000000, 0.72)
    .setOrigin(0.5)
    .setDepth(10000)
    .setVisible(false);

  overlay.text = scene.add
    .text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 700, useAdvancedWrap: true },
      lineSpacing: 6,
    })
    .setOrigin(0.5)
    .setDepth(10001)
    .setVisible(false);

  function layout() {
    if (!scene.__captionsOverlay) return;

    const W = scene.scale.width;
    const H = scene.scale.height;
    const ts = scene.a11y?.textScale || 1;
    const hc = !!scene.a11y?.highContrast;

    const maxTextW = Math.min(820, Math.max(220, W - 60));
    const fontSize = Math.max(18, Math.round(24 * ts));

    overlay.text.setFontSize(fontSize);
    overlay.text.setWordWrapWidth(maxTextW);

    const bounds = overlay.text.getBounds();
    const padX = 20;
    const padY = 14;

    const boxW = Math.max(180, bounds.width + padX * 2);
    const boxH = Math.max(54, bounds.height + padY * 2);

    const cx = W / 2;
    const cy = H - boxH / 2 - 18;

    overlay.bg
      .setPosition(cx, cy)
      .setSize(boxW, boxH)
      .setFillStyle(hc ? 0xffffff : 0x000000, hc ? 1 : 0.72)
      .setStrokeStyle(2, hc ? 0x000000 : 0xffffff, hc ? 1 : 0.18);

    overlay.text
      .setPosition(cx, cy)
      .setColor(hc ? "#000000" : "#ffffff");
  }

  overlay.layout = layout;

  scene.__captionsOverlay = overlay;

  scene.scale.on("resize", layout);

  scene.events?.once("shutdown", () => {
    try {
      scene.scale.off("resize", layout);
    } catch {}

    try {
      overlay.bg.destroy();
      overlay.text.destroy();
    } catch {}

    scene.__captionsOverlay = null;
  });

  return overlay;
}

export function showCaption(scene, text, options = {}) {
  try {
    if (!scene?.a11y?.captionsEnabled) return;
    if (!text || !String(text).trim()) return;

    const overlay = createCaptionsOverlay(scene);

    const {
      minMs = DEFAULT_CAPTION_MIN_MS,
      extraPerCharMs = DEFAULT_CAPTION_EXTRA_PER_CHAR_MS,
      maxMs = DEFAULT_CAPTION_MAX_MS,
    } = options;

    const message = String(text).trim();

    overlay.text.setText(message);
    overlay.bg.setVisible(true);
    overlay.text.setVisible(true);
    overlay.layout?.();

    const duration = Math.max(
      minMs,
      Math.min(maxMs, minMs + message.length * extraPerCharMs)
    );

    if (captionTimer) {
      clearTimeout(captionTimer);
      captionTimer = null;
    }

    captionTimer = setTimeout(() => {
      hideCaption(scene);
    }, duration);
  } catch {}
}

export function hideCaption(scene) {
  try {
    if (captionTimer) {
      clearTimeout(captionTimer);
      captionTimer = null;
    }

    const overlay = scene?.__captionsOverlay;
    if (!overlay) return;

    overlay.bg.setVisible(false);
    overlay.text.setVisible(false);
    overlay.text.setText("");
  } catch {}
}

export function stopSpeech(scene) {
  try {
    speechToken += 1;

    if (speechTimer) {
      clearTimeout(speechTimer);
      speechTimer = null;
    }

    if (captionTimer) {
      clearTimeout(captionTimer);
      captionTimer = null;
    }

    if (scene?.__captionsOverlay) {
      scene.__captionsOverlay.bg.setVisible(false);
      scene.__captionsOverlay.text.setVisible(false);
      scene.__captionsOverlay.text.setText("");
    }

    window.speechSynthesis?.cancel();
  } catch {}
}

export function speakIfEnabled(scene, text, options = {}) {
  try {
    if (!text || !String(text).trim()) return;

    const {
      delayMs = 120,
      minGapMs = 320,
      rate = 1,
      pitch = 1,
      lang = "es-MX",
      volume,
      showCaptions = true,
      captionMinMs = DEFAULT_CAPTION_MIN_MS,
      captionExtraPerCharMs = DEFAULT_CAPTION_EXTRA_PER_CHAR_MS,
      captionMaxMs = DEFAULT_CAPTION_MAX_MS,
    } = options;

    if (showCaptions && scene?.a11y?.captionsEnabled) {
      showCaption(scene, text, {
        minMs: captionMinMs,
        extraPerCharMs: captionExtraPerCharMs,
        maxMs: captionMaxMs,
      });
    }

    if (!scene?.a11y?.ttsEnabled) return;

    const ttsVolume = safeClamp(
      volume ?? scene?.a11y?.ttsVolume ?? 1,
      MIN_TTS_VOLUME,
      MAX_TTS_VOLUME
    );

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
        const utterance = new SpeechSynthesisUtterance(String(text));

        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = ttsVolume;

        utterance.onstart = () => {
          lastSpeechAt = Date.now();
        };

        utterance.onend = () => {
          lastSpeechAt = Date.now();
        };

        utterance.onerror = () => {
          lastSpeechAt = Date.now();
        };

        window.speechSynthesis?.speak(utterance);
      } catch {}
    }, waitMs);
  } catch {}
}
