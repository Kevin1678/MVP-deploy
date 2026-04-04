import Phaser from "phaser";
import { createTextButton } from "../../shared/ui/button";
import { TILE_DEFS } from "../constants";

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
  return createTextButton(scene, label, onClick, depth, {
    width: opts.width ?? 160,
    height: opts.height ?? 60,
    variant: opts.variant ?? "default",
    baseFont: opts.baseFont ?? 28,
    fontFamily: opts.fontFamily ?? "Arial",
    wrapMin: 100,
    textPadX: 20,
    hoverSpeak: (currentLabel) => `Botón ${currentLabel}`,
    hoverSpeakOptions: {
      delayMs: 160,
      minGapMs: 380,
      rate: 0.96,
    },
  });
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
