import { shuffle, contentLeft, getScales } from "../../shared/common";
import { SYMBOLS } from "../constants";

export function createDeck(scene) {
  const chosen = shuffle(SYMBOLS).slice(0, scene.pairs);
  const values = shuffle([...chosen, ...chosen]);
  scene.cards = values.map((item, idx) => createCard(scene, idx, item));
}

export function applyCardsTheme(scene, theme) {
  scene.cards?.forEach((card) => {
    card.faceDown.clearTint();

    if (scene.a11y.highContrast) {
      card.faceDown.setTint(0xffffff);
    }

    card.backBorder.setStrokeStyle(
      2,
      theme.tileStroke,
      scene.a11y.highContrast ? 1 : 0.16
    );

    card.faceUp.setFillStyle(theme.surfaceAlt, 1);
    card.faceUp.setStrokeStyle(
      2,
      theme.tileStroke,
      scene.a11y.highContrast ? 1 : 0.28
    );

    card.txt.setColor(theme.text);

    if (card.focusOutline) {
      card.focusOutline.setStrokeStyle(
        4,
        scene.a11y.highContrast ? 0x000000 : 0x22c55e,
        1
      );
    }
  });
}

export function layoutCards(scene) {
  const W = scene.scale.width;
  const H = scene.scale.height;

  const { ui, ts } = getScales(scene);

  const leftPad = contentLeft(scene);
  const rightPad = 24;

  const topPad = Math.round(105 * ui);
  const bottomPad = 24;

  const areaW = Math.max(220, W - leftPad - rightPad);
  const areaH = Math.max(220, H - topPad - bottomPad);

  const total = scene.pairs * 2;

  /*
    Mantén 4 columnas:
    4 pares  = 8 cartas  = 4 x 2
    6 pares  = 12 cartas = 4 x 3
    8 pares  = 16 cartas = 4 x 4
  */
  const cols = 4;
  const rows = Math.ceil(total / cols);
  scene.gridCols = cols;

  /*
    No dejes que el escalado de accesibilidad agrande demasiado
    las cartas. El UI puede crecer, pero el tablero no debe deformarse.
  */
  const cardUi = Math.min(ui, 1.08);

  const gapX = Math.round(18 * cardUi);
  const gapY = Math.round(18 * cardUi);

  const maxCellW = Math.floor((areaW - gapX * (cols - 1)) / cols);
  const maxCellH = Math.floor((areaH - gapY * (rows - 1)) / rows);

  /*
    Relación fija para que no se aplasten.
    Si quieres cartas más cuadradas, baja a 1.35.
    Si quieres cartas más anchas, sube a 1.50.
  */
  const CARD_RATIO = 1.42;

  /*
    Tamaños máximos por dificultad.
    Esto es lo que evita que 4 pares se vea gigante y raro.
  */
  const maxWByTotal =
    total <= 8
      ? Math.round(220 * cardUi)
      : total <= 12
      ? Math.round(205 * cardUi)
      : Math.round(185 * cardUi);

  let w = Math.min(maxCellW, maxWByTotal);
  let h = Math.floor(w / CARD_RATIO);

  if (h > maxCellH) {
    h = maxCellH;
    w = Math.floor(h * CARD_RATIO);
  }

  w = Math.max(w, 90);
  h = Math.max(h, 64);

  const boardW = cols * w + gapX * (cols - 1);
  const boardH = rows * h + gapY * (rows - 1);

  /*
    Centrado horizontal, pero no centrado vertical completo.
    Se coloca debajo del encabezado.
  */
  const startX = leftPad + areaW / 2 - boardW / 2 + w / 2;

  const startY =
    total <= 8
      ? topPad + Math.round(28 * cardUi) + h / 2
      : total <= 12
      ? topPad + Math.round(20 * cardUi) + h / 2
      : topPad + Math.round(14 * cardUi) + h / 2;

  scene.cards.forEach((card, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;

    const cx = startX + c * (w + gapX);
    const cy = startY + r * (h + gapY);

    const x0 = cx - w / 2;
    const y0 = cy - h / 2;

    card.x0 = x0;
    card.y0 = y0;
    card.cx = cx;
    card.cy = cy;
    card.w = w;
    card.h = h;

    card.faceDown.setPosition(x0, y0);
    card.faceDown.setDisplaySize(w, h);

    card.backBorder.setPosition(x0, y0).setSize(w, h);
    card.faceUp.setPosition(x0, y0).setSize(w, h);

    card.hit.setPosition(x0, y0);
    card.hit.setSize(w, h);

    if (card.hit.input?.hitArea?.setTo) {
      card.hit.input.hitArea.setTo(0, 0, w, h);
    }

    card.txt.setPosition(cx, cy);
    card.txt.setFontSize(
      Math.max(22, Math.floor(Math.min(w, h) * 0.42 * ts))
    );

    if (card.focusOutline) {
      card.focusOutline.setPosition(cx, cy);
      card.focusOutline.setSize(w + 14, h + 14);
    }
  });
}

export function setCardVisual(scene, card, isFlipped) {
  card.flipped = isFlipped;

  card.faceDown.setVisible(!isFlipped);
  card.backBorder.setVisible(!isFlipped);
  card.faceUp.setVisible(isFlipped);
  card.txt.setVisible(isFlipped);

  const alpha = card.matched ? 0.55 : 1;
  card.faceDown.setAlpha(alpha);
  card.backBorder.setAlpha(alpha);
  card.faceUp.setAlpha(alpha);
  card.txt.setAlpha(alpha);
  card.hit.setAlpha(1);
  card.focusOutline?.setAlpha(alpha);
}

function createCard(scene, idx, item) {
  const faceDown = scene.add.image(0, 0, "cardBack").setOrigin(0, 0);

  const backBorder = scene.add
    .rectangle(0, 0, 110, 130, 0x000000, 0)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0xffffff, 0.12);

  const faceUp = scene.add
    .rectangle(0, 0, 110, 130, 0xf8fafc, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0x111827, 0.25);

  const txt = scene.add
    .text(0, 0, item.symbol, {
      fontFamily: "Arial",
      fontSize: "52px",
      color: "#0b1020",
    })
    .setOrigin(0.5);

  const hit = scene.add.zone(0, 0, 110, 130).setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });
  hit.setDepth(10);

  const card = {
    idx,
    value: item.symbol,
    label: item.label,
    matchKey: item.label,
    faceDown,
    backBorder,
    faceUp,
    txt,
    hit,
    flipped: false,
    matched: false,
    focusOutline: null,
    x0: 0,
    y0: 0,
    cx: 0,
    cy: 0,
    w: 110,
    h: 130,
  };

  setCardVisual(scene, card, false);

  hit.on("pointerover", () => {
    if (card.matched || card.flipped || scene.gameEnded) return;

    const cols = scene.gridCols || 4;
    const row = Math.floor(idx / cols) + 1;
    const col = (idx % cols) + 1;

    scene.say(`Carta fila ${row}, columna ${col}`, false);
  });

  hit.on("pointerdown", () => {
    if (scene.state.locked || card.matched || card.flipped || scene.gameEnded) {
      return;
    }

    scene.focusIndex = idx;
    scene.applyFocus(idx, true);
    scene.onCardClick(card);
  });

  return card;
}
