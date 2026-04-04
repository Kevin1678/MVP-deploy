import { speakIfEnabled, getA11yTheme } from "../../a11yPanel";
import { randInt } from "../../shared/common";
import { getTile } from "./grid";
import { showOverlayIcon } from "./feedback";
import { updateStats, updateRepeatButtonState } from "../ui/topBar";

export function nextRound(scene, isFirst = false) {
  if (scene.gameEnded) return;

  scene.cancelPendingTimers();
  scene.sequenceRunId += 1;

  scene.state.round += 1;
  scene.state.attempts += 1;
  scene.state.locked = true;
  scene.state.inputIndex = 0;

  const sequence = [];
  let prev = null;

  for (let i = 0; i < scene.steps; i++) {
    let pick;
    do {
      pick = { r: randInt(0, 2), c: randInt(0, 2) };
    } while (prev && pick.r === prev.r && pick.c === prev.c);
    sequence.push(pick);
    prev = pick;
  }

  scene.state.sequence = sequence;

  updateStats(scene);
  updateRepeatButtonState(scene);

  speakIfEnabled(scene, `Ronda ${scene.state.round}. Observa la secuencia.`, {
    delayMs: 140,
    minGapMs: 420,
    rate: 0.96,
  });

  if (isFirst) {
    speakIfEnabled(
      scene,
      "Usa flechas y Enter si no quieres usar mouse. Presiona R para repetir la secuencia.",
      {
        delayMs: 380,
        minGapMs: 520,
        rate: 0.94,
      }
    );
  }

  playSequence(scene, scene.sequenceRunId);
}

export function repeatSequence(scene) {
  if (
    scene.gameEnded ||
    scene.state.locked ||
    !Array.isArray(scene.state.sequence) ||
    scene.state.sequence.length === 0
  ) {
    return;
  }

  scene.cancelPendingTimers();
  scene.sequenceRunId += 1;
  scene.state.locked = true;
  scene.state.inputIndex = 0;
  scene.state.repeatCount += 1;

  updateStats(scene);
  updateRepeatButtonState(scene);

  speakIfEnabled(scene, "Repitiendo la secuencia.", {
    delayMs: 120,
    minGapMs: 420,
    rate: 0.96,
  });

  playSequence(scene, scene.sequenceRunId);
}

export async function playSequence(scene, runId) {
  const hc = !!scene.a11y.highContrast;
  const theme = getA11yTheme(scene.a11y);
  const baseStrokeColor = hc ? 0x000000 : theme.tileStroke;
  const baseStrokeAlpha = hc ? 1 : 0.20;

  updateRepeatButtonState(scene);

  const okStart = await scene.wait(420, runId);
  if (!okStart || scene.gameEnded) return;

  for (let i = 0; i < scene.state.sequence.length; i++) {
    if (!scene.scene.isActive() || scene.gameEnded || runId !== scene.sequenceRunId) return;

    const { r, c } = scene.state.sequence[i];
    const tile = getTile(scene, r, c);
    if (!tile) continue;

    const voiceLeadMs = Math.max(320, tile.colorName.length * 55);
    const lightOnMs = Math.max(scene.speedMs, 380);
    const lightOffMs = Math.max(240, scene.speedMs * 0.35);

    speakIfEnabled(scene, tile.colorName, {
      delayMs: 40,
      minGapMs: 380,
      rate: 0.96,
    });

    const okVoice = await scene.wait(voiceLeadMs, runId);
    if (!okVoice || scene.gameEnded) return;

    tile.bg.setFillStyle(tile.activeColor, 1);
    tile.bg.setStrokeStyle(5, hc ? 0x000000 : 0xffffff, 1);

    scene.tweens.add({
      targets: [tile.bg, tile.shine, tile.focus],
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      yoyo: true,
      duration: Math.max(180, lightOnMs * 0.35),
    });

    const okOn = await scene.wait(lightOnMs, runId);
    if (!okOn || scene.gameEnded) return;

    tile.bg.setFillStyle(tile.baseColor, 1);
    tile.bg.setStrokeStyle(3, baseStrokeColor, baseStrokeAlpha);

    const okOff = await scene.wait(lightOffMs, runId);
    if (!okOff || scene.gameEnded) return;
  }

  if (!scene.scene.isActive() || scene.gameEnded || runId !== scene.sequenceRunId) return;

  scene.state.locked = false;
  updateRepeatButtonState(scene);

  speakIfEnabled(scene, "Tu turno. Repite la secuencia.", {
    delayMs: 120,
    minGapMs: 420,
    rate: 0.96,
  });
}

export function onTilePress(scene, r, c) {
  if (scene.state.locked || scene.gameEnded) return;

  const tile = getTile(scene, r, c);
  if (!tile) return;

  const hc = !!scene.a11y.highContrast;
  const theme = getA11yTheme(scene.a11y);
  const baseStrokeColor = hc ? 0x000000 : theme.tileStroke;
  const baseStrokeAlpha = hc ? 1 : 0.20;

  tile.bg.setFillStyle(tile.pressColor, 1);
  tile.bg.setStrokeStyle(5, hc ? 0x000000 : 0xffffff, 1);

  scene.tweens.add({
    targets: [tile.bg, tile.shine],
    scaleX: { from: 1, to: 1.03 },
    scaleY: { from: 1, to: 1.03 },
    yoyo: true,
    duration: 120,
  });

  scene.schedule(160, () => {
    if (!scene.scene.isActive()) return;
    tile.bg.setFillStyle(tile.baseColor, 1);
    tile.bg.setStrokeStyle(3, baseStrokeColor, baseStrokeAlpha);
  });

  speakIfEnabled(scene, tile.colorName, {
    delayMs: 60,
    minGapMs: 320,
    rate: 0.96,
  });

  const expected = scene.state.sequence[scene.state.inputIndex];
  const ok = expected && expected.r === r && expected.c === c;

  if (!ok) {
    failFeedback(scene);
    return;
  }

  scene.state.inputIndex += 1;

  if (scene.state.inputIndex >= scene.state.sequence.length) {
    successFeedback(scene);
  }
}

export function successFeedback(scene) {
  if (scene.gameEnded) return;

  scene.state.locked = true;
  scene.state.score += 1;
  updateStats(scene);
  updateRepeatButtonState(scene);

  speakIfEnabled(scene, "Correcto", {
    delayMs: 80,
    minGapMs: 360,
    rate: 0.96,
  });

  showOverlayIcon(scene, true);

  scene.schedule(900, () => {
    if (!scene.scene.isActive() || scene.gameEnded) return;

    if (scene.state.round >= scene.roundsTotal) {
      scene.finishGame();
    } else {
      nextRound(scene);
    }
  });
}

export function failFeedback(scene) {
  if (scene.gameEnded) return;

  scene.state.locked = true;
  scene.state.wrongRounds += 1;
  updateRepeatButtonState(scene);

  speakIfEnabled(scene, "Incorrecto", {
    delayMs: 80,
    minGapMs: 360,
    rate: 0.96,
  });

  showOverlayIcon(scene, false);

  scene.tweens.add({
    targets: [scene.title, scene.sub, scene.stats],
    x: "+=8",
    yoyo: true,
    repeat: 3,
    duration: 60,
  });

  scene.schedule(1000, () => {
    if (!scene.scene.isActive() || scene.gameEnded) return;
    scene.state.inputIndex = 0;

    speakIfEnabled(scene, "Mira otra vez.", {
      delayMs: 120,
      minGapMs: 420,
      rate: 0.96,
    });

    scene.sequenceRunId += 1;
    playSequence(scene, scene.sequenceRunId);
  });
}
