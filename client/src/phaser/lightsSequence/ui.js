import Phaser from "phaser";
import { speakIfEnabled } from "../a11yPanel";
import { getScales, fitFont, getButtonPalette } from "../shared/common";
import { TILE_DEFS } from "./constants";

function hexToNumber(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

function mixColors(colorA, colorB, amount = 0.25) {
  const ar = (colorA >> 16) & 0xff;
  const ag = (colorA >> 8) & 0xff;
  const ab = colorA & 0xff;

  const br = (colorB >> 16) & 0xff;
  const bg = (colorB >> 8) & 0xff;
  const bb = colorB & 0xff;

  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const b = Math.round(ab + (bb - ab) * amount);

  return (r << 16) | (g << 8) | b;
}

export function makeTopLeftButton(scene, label, onClick, depth = 10, opts = {}) {
  let w = opts.width ?? 160;
  let h = opts.height ?? 60;
  let x0 = 0;
  let y0 = 0;
  let enabled = true;
  let variant = opts.variant ?? "default";
  let baseFont = opts.baseFont ?? 28;

  const box = scene.add
    .rectangle(x0, y0, w, h, 0x111827, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.14)
    .setDepth(depth);

  const text = scene.add
    .text(x0 + w / 2, y0 + h / 2, label, {
      fontFamily: "Arial",
      fontSize: `${baseFont}px`,
      color: "#ffffff",
      align: "center",
      wordWrap: { width: Math.max(100, w - 20) },
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add.zone(x0, y0, w, h).setOrigin(0, 0).setDepth(depth + 2);
  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => {
    if (!enabled) return;
    speakIfEnabled(scene, `Botón ${label}`, {
      delayMs: 160,
      minGapMs: 380,
      rate: 0.96,
    });
  });

  hit.on("pointerdown", () => {
    if (!enabled) return;
    onClick?.();
  });

  function refreshTextPos() {
    text.setPosition(x0 + w / 2, y0 + h / 2);
    text.setWordWrapWidth(Math.max(100, w - 20));
  }

  function applyCurrentTheme() {
    const palette = getButtonPalette(scene, variant);
    const { ts } = getScales(scene);

    box.setFillStyle(palette.fill, 1);
    box.setStrokeStyle(2, palette.strokeColor, palette.strokeAlpha);
    text.setColor(palette.textColor);
    text.setFontSize(fitFont(baseFont, ts));
    text.setWordWrapWidth(Math.max(100, w - 20));
  }

  return {
    box,
    text,
    hit,

    setLabel(next) {
      label = next;
      text.setText(next);
      refreshTextPos();
    },

    setVariant(nextVariant) {
      variant = nextVariant;
      applyCurrentTheme();
    },

    setTL(nx, ny) {
      x0 = nx;
      y0 = ny;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      refreshTextPos();
    },

    setCenter(cx, cy) {
      x0 = cx - w / 2;
      y0 = cy - h / 2;
      box.setPosition(x0, y0);
      hit.setPosition(x0, y0);
      text.setPosition(cx, cy);
    },

    setSize(nw, nh) {
      w = nw;
      h = nh;

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
      text.setWordWrapWidth(Math.max(100, w - 20));
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
        hit.setInteractive({ useHandCursor: true });
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
}

function getTileName(r, c) {
  const rows = ["arriba", "centro", "abajo"];
  const cols = ["izquierda", "centro", "derecha"];

  if (r === 1 && c === 1) return "centro";
  if (r === 1) return `centro ${cols[c]}`;
  if (c === 1) return `${rows[r]} centro`;
  return `${rows[r]} ${cols[c]}`;
}

export function makeGridTile(scene, r, c) {
  const index = r * 3 + c;
  const def = TILE_DEFS[index];
  const positionName = getTileName(r, c);

  const baseColor = hexToNumber(def.hex);
  const activeColor = mixColors(baseColor, 0xffffff, 0.30);
  const pressColor = mixColors(baseColor, 0xffffff, 0.18);

  const bg = scene.add
    .rectangle(0, 0, 120, 110, baseColor, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(3, 0xffffff, 0.18);

  const shine = scene.add
    .rectangle(0, 0, 120, 34, 0xffffff, 0.10)
    .setOrigin(0, 0);

  const focus = scene.add
    .rectangle(0, 0, 132, 122, 0x000000, 0)
    .setOrigin(0.5)
    .setStrokeStyle(4, 0x22c55e, 0);

  const hit = scene.add.zone(0, 0, 120, 110).setOrigin(0, 0);
  hit.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, 120, 110),
    Phaser.Geom.Rectangle.Contains
  );
  hit.input.cursor = "pointer";

  return {
    r,
    c,
    index,
    positionName,
    colorName: def.colorName,
    voiceName: `${def.colorName}, ${positionName}`,
    baseColor,
    activeColor,
    pressColor,
    bg,
    shine,
    focus,
    hit,
    x0: 0,
    y0: 0,
    w: 120,
    h: 110,
    cx: 60,
    cy: 55,
  };
}
