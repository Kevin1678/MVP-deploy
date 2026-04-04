import Phaser from "phaser";
import { speakIfEnabled } from "../../a11yPanel";
import { contentLeft, getScales } from "../../shared/common";
import { makeGridTile } from "../ui/buttons";
import { layoutRepeatButton } from "../ui/topBar";

export function buildGrid(scene) {
  scene.tiles = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const tile = makeGridTile(scene, r, c);

      tile.hit.on("pointerover", () => {
        if (scene.gameEnded) return;
        applyFocus(scene, r * 3 + c, true);
        speakIfEnabled(scene, tile.voiceName, {
          delayMs: 180,
          minGapMs: 420,
          rate: 0.96,
        });
      });

      tile.hit.on("pointerdown", () => {
        if (scene.gameEnded) return;
        applyFocus(scene, r * 3 + c, true);
        scene.onTilePress(r, c);
      });

      scene.tiles.push(tile);
    }
  }
}

export function applyGridTheme(scene, theme) {
  const hc = !!scene.a11y.highContrast;

  scene.tiles.forEach((tile) => {
    tile.bg.setFillStyle(tile.baseColor, 1);
    tile.bg.setStrokeStyle(3, hc ? 0x000000 : theme.tileStroke, hc ? 1 : 0.20);
    tile.shine.setFillStyle(0xffffff, hc ? 0.18 : 0.10);
    tile.focus.setStrokeStyle(4, hc ? 0x000000 : 0x22c55e, 0);
  });
}

export function layoutGrid(scene) {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const left = contentLeft(scene);

  const ui = scene.a11y.uiScale || 1;

  const baseTileW = 120 * ui;
  const baseTileH = 110 * ui;
  const baseGap = 18 * ui;
  const baseButtonH = Math.round(56 * ui);
  const baseButtonGap = Math.round(24 * ui);

  const headerBottom = scene.stats.y + scene.stats.height + 24 * ui;
  const availableWidth = Math.max(220, W - left - 16);
  const footerReserved = baseButtonH + baseButtonGap + 28 * ui;
  const availableHeight = Math.max(180, H - headerBottom - footerReserved);

  const totalBaseW = baseTileW * 3 + baseGap * 2;
  const totalBaseH = baseTileH * 3 + baseGap * 2;

  const fit = Math.min(1, availableWidth / totalBaseW, availableHeight / totalBaseH);

  const tileW = Math.max(74, Math.round(baseTileW * fit));
  const tileH = Math.max(68, Math.round(baseTileH * fit));
  const gap = Math.max(10, Math.round(baseGap * fit));

  const totalW = tileW * 3 + gap * 2;
  const totalH = tileH * 3 + gap * 2;

  const centerX = left + availableWidth / 2;
  const startX = centerX - totalW / 2;
  const startY = headerBottom + Math.max(0, (availableHeight - totalH) / 2);

  scene.tiles.forEach((tile) => {
    const x0 = startX + tile.c * (tileW + gap);
    const y0 = startY + tile.r * (tileH + gap);
    const cx = x0 + tileW / 2;
    const cy = y0 + tileH / 2;

    tile.x0 = x0;
    tile.y0 = y0;
    tile.w = tileW;
    tile.h = tileH;
    tile.cx = cx;
    tile.cy = cy;

    tile.bg.setPosition(x0, y0).setSize(tileW, tileH);
    tile.shine.setPosition(x0, y0).setSize(tileW, Math.max(20, Math.round(tileH * 0.28)));
    tile.focus.setPosition(cx, cy).setSize(tileW + 12, tileH + 12);

    tile.hit.setPosition(x0, y0);
    tile.hit.setSize(tileW, tileH);

    if (tile.hit.input?.hitArea?.setTo) {
      tile.hit.input.hitArea.setTo(0, 0, tileW, tileH);
    }
  });

  layoutRepeatButton(scene, {
    centerX,
    startY,
    totalH,
    totalW,
    availableWidth,
    baseButtonGap,
    baseButtonH,
  });
}

export function applyFocus(scene, index, silent = false) {
  const hc = !!scene.a11y.highContrast;
  const focusColor = hc ? 0x000000 : 0x22c55e;

  const prev = scene.tiles[scene.state.focusIndex];
  if (prev?.focus) {
    prev.focus.setPosition(prev.cx, prev.cy);
    prev.focus.setStrokeStyle(4, focusColor, 0);
  }

  scene.state.focusIndex = index;

  const tile = scene.tiles[index];
  if (!tile) return;

  tile.focus.setPosition(tile.cx, tile.cy);
  tile.focus.setStrokeStyle(4, focusColor, 1);

  if (!silent) {
    speakIfEnabled(scene, tile.voiceName, {
      delayMs: 180,
      minGapMs: 420,
      rate: 0.96,
    });
  }
}

export function setTilesEnabled(scene, enabled) {
  scene.tiles.forEach((tile) => {
    if (enabled) {
      if (!tile.hit.input?.enabled) {
        tile.hit.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, tile.w, tile.h),
          Phaser.Geom.Rectangle.Contains
        );
        tile.hit.input.cursor = "pointer";
      }
    } else {
      tile.hit.disableInteractive();
    }
  });
}

export function getTile(scene, r, c) {
  return scene.tiles.find((t) => t.r === r && t.c === c);
}
