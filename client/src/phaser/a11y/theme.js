import { hexToNumber, isTritanopiaMode } from "./colorPalettes";

export function getA11yTheme(a11y = {}) {
  const hc = !!a11y.highContrast;
  const isLight = a11y.themeMode === "light";
  const isTritanopia = isTritanopiaMode(a11y);

  /*
    El modo alto contraste debe tener prioridad.

    Si un alumno tiene tritanopia pero activa alto contraste,
    es mejor respetar alto contraste porque es una necesidad
    visual más fuerte que la paleta de colores.
  */
  if (hc) {
    return {
      panelBg: 0xffffff,
      panelStroke: 0x000000,
      panelShadow: false,

      sceneBg: 0xffffff,
      surface: 0xffffff,
      surfaceAlt: 0xf3f4f6,
      card: 0xffffff,

      primary: 0x000000,
      accent: 0x000000,

      text: "#000000",
      textMuted: "#000000",

      buttonFill: 0xffffff,
      buttonText: "#000000",
      buttonStrokeAlpha: 1,

      tileStroke: 0x000000,
      overlay: 0x000000,
    };
  }

  /*
    Tema global adaptado para tritanopia.

    Este cambio NO aplica un filtro encima de la cámara.
    Cambia los colores del tema para que el entorno visual
    del juego sea más consistente con la paleta adaptada.
  */
  if (isTritanopia) {
    return {
      panelBg: isLight ? 0xf3f6fb : 0x0b1020,
      panelStroke: hexToNumber("#60AEDF"),
      panelShadow: true,

      sceneBg: isLight ? 0xeaf1ff : 0x0b1020,
      surface: isLight ? 0xffffff : 0x111827,
      surfaceAlt: isLight ? 0xf8fafc : 0x1f2937,
      card: isLight ? 0xffffff : 0x111827,

      primary: hexToNumber("#60AEDF"),
      accent: hexToNumber("#E9E20E"),

      text: isLight ? "#111827" : "#ffffff",
      textMuted: isLight ? "#374151" : "#cbd5e1",

      buttonFill: isLight ? 0xe5e7eb : 0x111827,
      buttonText: isLight ? "#111827" : "#ffffff",
      buttonStrokeAlpha: 0.35,

      tileStroke: hexToNumber("#E9E20E"),
      overlay: 0x000000,
    };
  }

  if (isLight) {
    return {
      panelBg: 0xf3f6fb,
      panelStroke: 0x1f2937,
      panelShadow: true,

      sceneBg: 0xeaf1ff,
      surface: 0xffffff,
      surfaceAlt: 0xe5e7eb,
      card: 0xffffff,

      primary: 0x2563eb,
      accent: 0x1d4ed8,

      text: "#111827",
      textMuted: "#374151",

      buttonFill: 0xe5e7eb,
      buttonText: "#111827",
      buttonStrokeAlpha: 0.22,

      tileStroke: 0x1f2937,
      overlay: 0x000000,
    };
  }

  return {
    panelBg: 0x0a1222,
    panelStroke: 0xffffff,
    panelShadow: true,

    sceneBg: 0x0b1020,
    surface: 0x111827,
    surfaceAlt: 0xf8fafc,
    card: 0x111827,

    primary: 0x60a5fa,
    accent: 0x2563eb,

    text: "#ffffff",
    textMuted: "#cbd5e1",

    buttonFill: 0x111827,
    buttonText: "#ffffff",
    buttonStrokeAlpha: 0.16,

    tileStroke: 0xffffff,
    overlay: 0x000000,
  };
}

export function applyThemeToScene(scene) {
  if (!scene) return;

  const theme = getA11yTheme(scene.a11y || {});
  scene.__a11yTheme = theme;

  if (typeof scene.refreshA11yTheme === "function") {
    scene.refreshA11yTheme(theme);
  }
}
