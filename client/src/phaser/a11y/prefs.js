import { LS_KEY } from "./constants";

export function defaultA11yPrefs() {
  return {
    ttsEnabled: false,
    highContrast: false,
    themeMode: "dark", // dark | light
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
