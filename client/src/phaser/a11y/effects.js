import { CVD } from "./constants";

export function destroyA11yFx(scene) {
  const cam = scene?.cameras?.main;
  const fx = scene?.__a11yFx;

  try {
    if (fx && cam?.postFX?.remove) {
      cam.postFX.remove(fx);
    }
  } catch {}

  try {
    fx?.setActive?.(false);
  } catch {}

  try {
    fx?.reset?.();
  } catch {}

  try {
    fx?.destroy?.();
  } catch {}

  try {
    cam?.clearFX?.();
  } catch {}

  try {
    cam?.resetPostPipeline?.(true);
  } catch {}

  scene.__a11yFx = null;
  scene.__a11yFxMode = "normal";
}

export function applyA11yToScene(scene, prefs) {
  if (!scene) return;

  scene.a11y = { ...(scene.a11y || {}), ...(prefs || {}) };

  const cam = scene.cameras?.main;
  const mode = scene.a11y?.colorMode || "normal";
  const needsFx =
    mode === "grayscale" || mode === "protanopia" || mode === "tritanopia";

  if (!cam?.postFX?.addColorMatrix) {
    destroyA11yFx(scene);
    return;
  }

  if (!needsFx) {
    destroyA11yFx(scene);
    return;
  }

  const mustRebuild = !scene.__a11yFx || scene.__a11yFxMode !== mode;

  if (mustRebuild) {
    destroyA11yFx(scene);

    try {
      scene.__a11yFx = cam.postFX.addColorMatrix();
      scene.__a11yFxMode = mode;
    } catch {
      scene.__a11yFx = null;
      scene.__a11yFxMode = "normal";
      return;
    }
  }

  const fx = scene.__a11yFx;
  if (!fx) return;

  try {
    fx.reset();
  } catch {}

  switch (mode) {
    case "grayscale":
      try {
        fx.grayscale();
      } catch {}
      break;

    case "protanopia":
      try {
        fx.set(CVD.protanopia);
      } catch {}
      break;

    case "tritanopia":
      try {
        fx.set(CVD.tritanopia);
      } catch {}
      break;

    default:
      destroyA11yFx(scene);
      break;
  }
}
