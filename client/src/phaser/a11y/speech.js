import { MAX_TTS_VOLUME, MIN_TTS_VOLUME } from "./constants";

let speechTimer = null;
let speechToken = 0;
let lastSpeechAt = 0;

function safeClamp(value, min, max) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return max;
  }

  return Math.max(min, Math.min(max, numberValue));
}

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
      volume,
    } = options;

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

        // Este es el punto clave.
        // Si esta línea no existe, la barra nunca afectará el volumen real.
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
