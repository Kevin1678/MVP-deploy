import { speakIfEnabled } from "../../a11yPanel";
import { fitFont, getButtonPalette, getScales } from "../common";

export function createTextButton(scene, label, onClick, depth = 10, opts = {}) {
  let w = opts.width ?? 160;
  let h = opts.height ?? 60;
  let x0 = 0;
  let y0 = 0;
  let enabled = true;
  let variant = opts.variant ?? "default";
  let currentLabel = label;
  const baseFont = opts.baseFont ?? 28;
  const fontFamily = opts.fontFamily ?? "Arial";
  const align = opts.align ?? "center";
  const wrapMin = opts.wrapMin ?? 100;
  const textPadX = opts.textPadX ?? 20;
  const hoverSpeak = opts.hoverSpeak ?? null;
  const hoverSpeakOptions = opts.hoverSpeakOptions ?? undefined;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14)
    .setDepth(depth);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, currentLabel, {
      fontFamily,
      fontSize: `${baseFont}px`,
      color: "#ffffff",
      align,
      wordWrap: { width: Math.max(wrapMin, w - textPadX) },
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  function resolveHoverSpeech() {
    if (!hoverSpeak) return null;
    if (typeof hoverSpeak === "function") return hoverSpeak(currentLabel);
    if (typeof hoverSpeak === "string") return hoverSpeak;
    return currentLabel;
  }

  hit.on("pointerover", () => {
    if (!enabled) return;
    const textToSpeak = resolveHoverSpeech();
    if (!textToSpeak) return;
    speakIfEnabled(scene, textToSpeak, hoverSpeakOptions);
  });

  hit.on("pointerdown", () => {
    if (!enabled) return;
    onClick?.();
  });

  function refreshTextPos() {
    text.setPosition(x0 + w / 2, y0 + h / 2);
    text.setWordWrapWidth(Math.max(wrapMin, w - textPadX));
  }

  function applyCurrentTheme() {
    const palette = getButtonPalette(scene, variant);
    const { ts } = getScales(scene);

    box.setFillStyle(palette.fill, 1);
    box.setStrokeStyle(2, palette.strokeColor, palette.strokeAlpha);
    text.setColor(palette.textColor);
    text.setFontSize(fitFont(baseFont, ts));
    text.setWordWrapWidth(Math.max(wrapMin, w - textPadX));
  }

  const api = {
    box,
    text,
    hit,
    widthHint: opts.width ?? 160,
    heightHint: opts.height ?? 60,
    baseFont,

    setLabel(next) {
      currentLabel = next;
      text.setText(next);
      refreshTextPos();
    },

    setVariant(nextVariant) {
      variant = nextVariant;
      applyCurrentTheme();
    },

    setCenter(cx, cy) {
      x0 = cx - w / 2;
      y0 = cy - h / 2;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(cx, cy);
      text.setWordWrapWidth(Math.max(wrapMin, w - textPadX));
    },

    setTL(nx, ny) {
      x0 = nx;
      y0 = ny;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      refreshTextPos();
    },

    setSize(newW, newH) {
      w = newW;
      h = newH;
      box.setSize(w, h);
      hit.setSize(w, h);
      if (hit.input?.hitArea?.setTo) {
        hit.input.hitArea.setTo(0, 0, w, h);
      }
      refreshTextPos();
      applyCurrentTheme();
    },

    setTheme({ fill, strokeAlpha, textColor, fontSize, strokeColor = 0xffffff }) {
      box.setFillStyle(fill, 1);
      box.setStrokeStyle(2, strokeColor, strokeAlpha);
      text.setColor(textColor);
      if (fontSize) text.setFontSize(fontSize);
      text.setWordWrapWidth(Math.max(wrapMin, w - textPadX));
    },

    applyTheme() {
      applyCurrentTheme();
    },

    setVisible(v) {
      box.setVisible(v);
      text.setVisible(v);
      hit.setVisible(v);
    },

    setDepth(nextDepth) {
      box.setDepth(nextDepth);
      text.setDepth(nextDepth + 1);
      hit.setDepth(nextDepth + 2);
    },

    setEnabled(v) {
      enabled = !!v;
      if (enabled) {
        if (!hit.input) hit.setInteractive({ useHandCursor: true });
        if (hit.input) hit.input.cursor = "pointer";
      } else {
        hit.disableInteractive();
      }
      box.setAlpha(enabled ? 1 : 0.55);
      text.setAlpha(enabled ? 1 : 0.55);
    },

    destroy() {
      box.destroy();
      text.destroy();
      hit.destroy();
    },
  };

  applyCurrentTheme();
  return api;
}
