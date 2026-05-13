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

export function hexToNumber(hex) {
  return parseInt(String(hex).replace("#", ""), 16);
}

export function getTritanopiaColor(index = 0) {
  return TRITANOPIA_GAME_COLORS[
    Math.abs(index) % TRITANOPIA_GAME_COLORS.length
  ];
}

export function isTritanopiaMode(a11y = {}) {
  return a11y?.colorMode === "tritanopia";
}