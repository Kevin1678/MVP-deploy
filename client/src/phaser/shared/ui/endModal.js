import { getA11yTheme } from "../../a11yPanel";
import { fitFont, getScales } from "../common";
import { createTextButton } from "./button";

function normalizeBodyText(config) {
  if (typeof config.bodyText === "string") return config.bodyText;
  if (Array.isArray(config.bodyLines)) return config.bodyLines.join("\n");
  return "";
}

function createModalButton(scene, opts, depth) {
  return createTextButton(scene, opts.label ?? "Botón", opts.onClick, depth, {
    width: opts.width ?? 210,
    height: opts.height ?? 52,
    variant: opts.variant ?? "default",
    baseFont: opts.baseFont ?? 18,
    fontFamily: opts.fontFamily ?? "Arial",
    wrapMin: 100,
    textPadX: 20,
    hoverSpeak: false,
  });
}

export function createEndModal(scene, config) {
  const theme = getA11yTheme(scene.a11y || {});
  const depth = config.depth ?? 4000;
  const W = scene.scale.width;
  const H = scene.scale.height;
  const bodyText = normalizeBodyText(config);

  const overlay = scene.add
    .rectangle(0, 0, W, H, theme.overlay, config.overlayAlpha ?? 0.55)
    .setOrigin(0)
    .setDepth(depth)
    .setInteractive();

  overlay.on("pointerdown", (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
  });

  const box = scene.add
    .rectangle(W / 2, H / 2, 100, 100, theme.surface, 1)
    .setDepth(depth + 1)
    .setInteractive();

  box.on("pointerdown", (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
  });

  const title = scene.add
    .text(W / 2, H / 2, config.title ?? "¡Terminaste!", {
      fontFamily: "Arial",
      fontSize: "38px",
      color: theme.text,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const body = scene.add
    .text(W / 2, H / 2, bodyText, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: theme.textMuted,
      align: config.bodyAlign ?? "center",
      lineSpacing: config.bodyLineSpacing ?? 0,
    })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const primaryButton = createModalButton(scene, config.primaryButton ?? {}, depth + 3);
  const secondaryButton = createModalButton(scene, config.secondaryButton ?? {}, depth + 3);

  const modal = {
    overlay,
    box,
    title,
    body,
    primaryButton,
    secondaryButton,
    config: {
      overlayAlpha: 0.55,
      minBoxWidth: 340,
      maxBoxWidthPct: 0.92,
      preferredBoxWidth: 560,
      minBoxHeight: 250,
      bodyWrapMin: 180,
      titleBaseFont: 38,
      bodyBaseFont: 20,
      padX: 34,
      padTop: 28,
      padBottom: 28,
      gapX: 40,
      gapY: 22,
      buttonHeight: 52,
      bodyAlign: "center",
      bodyLineSpacing: 0,
      ...config,
      bodyText,
    },
  };

  applyEndModalTheme(scene, modal);
  layoutEndModal(scene, modal);
  return modal;
}

export function applyEndModalTheme(scene, modal) {
  if (!modal) return;

  const theme = getA11yTheme(scene.a11y || {});
  const { ts } = getScales(scene);
  const cfg = modal.config;

  modal.overlay.setFillStyle(theme.overlay, cfg.overlayAlpha ?? 0.55);
  modal.box.setFillStyle(theme.surface, 1);
  modal.box.setStrokeStyle(
    2,
    theme.tileStroke,
    scene.a11y?.highContrast ? 1 : 0.18
  );

  modal.title.setStyle({
    fontFamily: "Arial",
    fontSize: `${fitFont(cfg.titleBaseFont ?? 38, ts)}px`,
    color: theme.text,
    align: "center",
  });

  modal.body.setStyle({
    fontFamily: "Arial",
    fontSize: `${fitFont(cfg.bodyBaseFont ?? 20, ts)}px`,
    color: theme.textMuted,
    align: cfg.bodyAlign ?? "center",
    lineSpacing: cfg.bodyLineSpacing ?? 0,
  });

  modal.primaryButton.applyTheme();
  modal.secondaryButton.applyTheme();
}

export function layoutEndModal(scene, modal) {
  if (!modal) return;

  const W = scene.scale.width;
  const H = scene.scale.height;
  const { ui } = getScales(scene);
  const cfg = modal.config;

  const gapX = Math.round((cfg.gapX ?? 40) * ui);
  const gapY = Math.round((cfg.gapY ?? 22) * ui);
  const padX = Math.round((cfg.padX ?? 34) * ui);
  const padTop = Math.round((cfg.padTop ?? 28) * ui);
  const padBottom = Math.round((cfg.padBottom ?? 28) * ui);
  const btnH = Math.round((cfg.buttonHeight ?? 52) * ui);
  const primaryDefaultW = Math.round((modal.primaryButton.widthHint ?? 210) * ui);
  const secondaryDefaultW = Math.round((modal.secondaryButton.widthHint ?? 170) * ui);
  const preferredBoxW = Math.round((cfg.preferredBoxWidth ?? 560) * ui);

  modal.overlay.setSize(W, H);

  const maxBoxW = Math.max(cfg.minBoxWidth ?? 340, Math.round(W * (cfg.maxBoxWidthPct ?? 0.92)));
  const desiredRowW = primaryDefaultW + gapX + secondaryDefaultW + padX * 2;
  const desiredTextW = Math.max(
    Math.ceil(modal.title.width) + padX * 2,
    Math.ceil(modal.body.width) + padX * 2,
    preferredBoxW
  );

  let boxW = Math.min(maxBoxW, Math.max(desiredRowW, desiredTextW));
  let stackButtons = desiredRowW > maxBoxW;

  if (stackButtons) {
    boxW = maxBoxW;
  }

  modal.body.setWordWrapWidth(Math.max(cfg.bodyWrapMin ?? 180, boxW - padX * 2));

  let primaryW = primaryDefaultW;
  let secondaryW = secondaryDefaultW;
  let buttonsBlockH = btnH;

  if (stackButtons) {
    primaryW = Math.max(
      180,
      Math.min(
        boxW - padX * 2,
        Math.round(Math.max(modal.primaryButton.widthHint, modal.secondaryButton.widthHint) * ui)
      )
    );
    secondaryW = primaryW;
    buttonsBlockH = btnH * 2 + gapY;
  }

  modal.primaryButton.setSize(primaryW, btnH);
  modal.secondaryButton.setSize(secondaryW, btnH);

  const titleH = Math.ceil(modal.title.height);
  const bodyH = Math.ceil(modal.body.height);
  const minBoxH = Math.round((cfg.minBoxHeight ?? 250) * ui);
  const boxH = Math.max(
    minBoxH,
    padTop + titleH + gapY + bodyH + gapY + buttonsBlockH + padBottom
  );

  const boxTop = H / 2 - boxH / 2;
  const titleY = boxTop + padTop + titleH / 2;
  const bodyY = titleY + titleH / 2 + gapY + bodyH / 2;
  const buttonsTop = bodyY + bodyH / 2 + gapY;

  modal.box.setSize(boxW, boxH);
  modal.box.setPosition(W / 2, H / 2);
  modal.title.setPosition(W / 2, titleY);
  modal.body.setPosition(W / 2, bodyY);

  if (stackButtons) {
    const left = W / 2 - primaryW / 2;
    modal.primaryButton.setTL(left, buttonsTop);
    modal.secondaryButton.setTL(left, buttonsTop + btnH + gapY);
    return;
  }

  const rowW = primaryW + gapX + secondaryW;
  const startX = W / 2 - rowW / 2;
  modal.primaryButton.setTL(startX, buttonsTop);
  modal.secondaryButton.setTL(startX + primaryW + gapX, buttonsTop);
}

export function destroyEndModal(modal) {
  if (!modal) return null;

  try {
    modal.overlay.destroy();
    modal.box.destroy();
    modal.title.destroy();
    modal.body.destroy();
    modal.primaryButton.destroy();
    modal.secondaryButton.destroy();
  } catch {}

  return null;
}
