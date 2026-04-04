export const LS_KEY = "a11y_prefs_v1";

export const PANEL_OPEN_W = 290;
export const PANEL_CLOSED_W = 78;
export const PANEL_GAP = 16;

// Compat
export const A11Y_PANEL_WIDTH = PANEL_OPEN_W;
export const A11Y_PANEL_GAP = PANEL_GAP;

export const MIN_UI_SCALE = 0.9;
export const MAX_UI_SCALE = 1.3;
export const MIN_TEXT_SCALE = 1.0;
export const MAX_TEXT_SCALE = 1.5;

// Matrices 4x5 para ColorMatrix
export const CVD = {
  protanopia: [
    0.567, 0.433, 0.0, 0, 0,
    0.558, 0.442, 0.0, 0, 0,
    0.0, 0.242, 0.758, 0, 0,
    0, 0, 0, 1, 0,
  ],
  tritanopia: [
    0.95, 0.05, 0.0, 0, 0,
    0.0, 0.433, 0.567, 0, 0,
    0.0, 0.475, 0.525, 0, 0,
    0, 0, 0, 1, 0,
  ],
};
