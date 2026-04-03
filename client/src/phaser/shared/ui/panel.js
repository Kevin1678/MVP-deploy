import { getA11yTheme } from "../../a11yPanel";

function resolvePanelPalette(scene, opts = {}) {
  const theme = getA11yTheme(scene.a11y || {});
  const hc = !!scene.a11y?.highContrast;

  if (opts.variant === "panel") {
    return {
      fill: opts.fill ?? theme.panelBg,
      fillAlpha: opts.fillAlpha ?? 1,
      strokeColor: opts.strokeColor ?? theme.panelStroke,
      strokeAlpha: opts.strokeAlpha ?? (hc ? 1 : 0.18),
      lineWidth: opts.lineWidth ?? 2,
    };
  }

  return {
    fill: opts.fill ?? theme.surface,
    fillAlpha: opts.fillAlpha ?? 1,
    strokeColor: opts.strokeColor ?? theme.tileStroke,
    strokeAlpha: opts.strokeAlpha ?? (hc ? 1 : 0.18),
    lineWidth: opts.lineWidth ?? 2,
  };
}

export function createPanel(scene, opts = {}, depth = 0) {
  let w = opts.width ?? 160;
  let h = opts.height ?? 80;
  let x = opts.x ?? 0;
  let y = opts.y ?? 0;
  const originX = opts.originX ?? 0.5;
  const originY = opts.originY ?? 0.5;

  const rect = scene.add
    .rectangle(x, y, w, h, 0x111827, 1)
    .setOrigin(originX, originY)
    .setDepth(depth);

  function applyCurrentTheme(extra = {}) {
    const palette = resolvePanelPalette(scene, { ...opts, ...extra });
    rect.setFillStyle(palette.fill, palette.fillAlpha);
    rect.setStrokeStyle(palette.lineWidth, palette.strokeColor, palette.strokeAlpha);
  }

  const api = {
    rect,
    widthHint: opts.width ?? 160,
    heightHint: opts.height ?? 80,

    setPosition(nx, ny) {
      x = nx;
      y = ny;
      rect.setPosition(nx, ny);
    },

    setCenter(cx, cy) {
      x = cx;
      y = cy;
      rect.setOrigin(0.5, 0.5);
      rect.setPosition(cx, cy);
    },

    setTL(nx, ny) {
      x = nx;
      y = ny;
      rect.setOrigin(0, 0);
      rect.setPosition(nx, ny);
    },

    setSize(newW, newH) {
      w = newW;
      h = newH;
      rect.setSize(newW, newH);
    },

    setVisible(v) {
      rect.setVisible(v);
    },

    setDepth(nextDepth) {
      rect.setDepth(nextDepth);
    },

    setAlpha(alpha) {
      rect.setAlpha(alpha);
    },

    setInteractive(shape, containsCallback) {
      if (shape || containsCallback) {
        rect.setInteractive(shape, containsCallback);
      } else {
        rect.setInteractive();
      }
      return api;
    },

    disableInteractive() {
      rect.disableInteractive();
      return api;
    },

    on(eventName, handler) {
      rect.on(eventName, handler);
      return api;
    },

    applyTheme(extra = {}) {
      applyCurrentTheme(extra);
    },

    destroy() {
      rect.destroy();
    },
  };

  applyCurrentTheme();
  return api;
}
