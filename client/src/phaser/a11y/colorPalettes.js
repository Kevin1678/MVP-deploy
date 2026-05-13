export const TRITANOPIA_GAME_COLORS = [
  { hex: "#F50200", colorName: "rojo intenso" },
  { hex: "#EB7200", colorName: "naranja" },
  { hex: "#E9E20E", colorName: "amarillo" },
  { hex: "#15DE04", colorName: "verde brillante" },
  { hex: "#006E00", colorName: "verde oscuro" },
  { hex: "#60AEDF", colorName: "azul claro" },
  { hex: "#0302E6", colorName: "azul intenso" },
  { hex: "#D707D7", colorName: "magenta" },
  { hex: "#793E02", colorName: "café" },
];

export const PROTANOPIA_GAME_COLORS = [
  { hex: "#F70300", colorName: "rojo intenso" },
  { hex: "#F97701", colorName: "naranja" },
  { hex: "#FBF90A", colorName: "amarillo" },
  { hex: "#00FE06", colorName: "verde brillante" },
  { hex: "#0B7600", colorName: "verde oscuro" },
  { hex: "#60CAF8", colorName: "azul claro" },
  { hex: "#0100CB", colorName: "azul fuerte" },
  { hex: "#CC63FE", colorName: "violeta claro" },
  { hex: "#814405", colorName: "café" },
];

export function hexToNumber(hex) {
  return parseInt(String(hex).replace("#", ""), 16);
}

export function isTritanopiaMode(a11y = {}) {
  return a11y?.colorMode === "tritanopia";
}

export function isProtanopiaMode(a11y = {}) {
  return a11y?.colorMode === "protanopia";
}

export function isAdaptiveColorMode(a11y = {}) {
  return isTritanopiaMode(a11y) || isProtanopiaMode(a11y);
}

export function getGameColorsByColorMode(colorMode) {
  if (colorMode === "tritanopia") return TRITANOPIA_GAME_COLORS;
  if (colorMode === "protanopia") return PROTANOPIA_GAME_COLORS;

  return null;
}
