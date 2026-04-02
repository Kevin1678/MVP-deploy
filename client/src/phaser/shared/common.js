import { getA11yTheme, PANEL_GAP } from "../a11yPanel";

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function contentLeft(scene) {
  const panelW = scene.a11yPanel?.getWidth?.() ?? 290;
  return 16 + panelW + (PANEL_GAP ?? 16);
}

export function getScales(scene) {
  return {
    ui: scene?.a11y?.uiScale || 1,
    ts: scene?.a11y?.textScale || 1,
  };
}

export function fitFont(base, ts, min = 12) {
  return Math.max(min, Math.round(base * ts));
}

export function colorToCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export function getButtonPalette(scene, variant = "default") {
  const theme = getA11yTheme(scene.a11y || {});
  const hc = !!scene.a11y?.highContrast;

  if (variant === "primary") {
    if (hc) {
      return {
        fill: 0x000000,
        strokeColor: 0x000000,
        strokeAlpha: 1,
        textColor: "#ffffff",
      };
    }
    return {
      fill: theme.primary,
      strokeColor: theme.tileStroke,
      strokeAlpha: 0.28,
      textColor: "#ffffff",
    };
  }

  if (variant === "danger") {
    if (hc) {
      return {
        fill: 0x222222,
        strokeColor: 0x000000,
        strokeAlpha: 1,
        textColor: "#ffffff",
      };
    }
    return {
      fill: 0xdc2626,
      strokeColor: theme.tileStroke,
      strokeAlpha: 0.28,
      textColor: "#ffffff",
    };
  }

  return {
    fill: theme.buttonFill,
    strokeColor: theme.tileStroke,
    strokeAlpha: hc ? 1 : theme.buttonStrokeAlpha,
    textColor: theme.buttonText,
  };
}

export function styleTextButton(textObj, scene, variant = "default", baseFont = 16) {
  const palette = getButtonPalette(scene, variant);
  const { ts } = getScales(scene);

  textObj.setStyle({
    color: palette.textColor,
    backgroundColor: colorToCss(palette.fill),
  });

  textObj.setFontSize(fitFont(baseFont, ts));
}
