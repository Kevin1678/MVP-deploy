import { createTextButton } from "../shared/ui/button";

export function makeButton(scene, label, onClick, depth = 10, opts = {}) {
  return createTextButton(scene, label, onClick, depth, {
    width: opts.width ?? 520,
    height: opts.height ?? 60,
    variant: opts.variant ?? "default",
    baseFont: opts.baseFont ?? 26,
    fontFamily:
      opts.fontFamily ??
      '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial',
    wrapMin: 120,
    textPadX: 24,
    hoverSpeak: (currentLabel) => currentLabel,
  });
}
