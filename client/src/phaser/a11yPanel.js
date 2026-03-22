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
