import Phaser from "phaser";
import { speakIfEnabled } from "../../a11yPanel";
import { getScales, contentLeft, fitFont, getButtonPalette } from "../../shared/common";
import { makeTopLeftButton, makeBall, recolorBall } from "../ui";
import { createRoundData } from "./state";
import { showCorrectFeedback, showWrongFeedback } from "./feedback";

export function clearRound(scene) {
  scene.ballParts.forEach((p) => p.container.destroy(true));
  scene.ballParts = [];

  scene.choiceButtons.forEach((b) => b.destroy());
  scene.choiceButtons = [];
}

export function setChoicesEnabled(scene, enabled) {
  scene.choiceButtons.forEach((b) => b.setEnabled(enabled));
}

export function setBallsEnabled(scene, enabled) {
  scene.ballParts.forEach((p) => {
    if (!p.ball) return;

    if (enabled) {
      if (!p.ball.input) {
        const r = p.ball.radius || p.r || 28;
        p.ball.setInteractive(
          new Phaser.Geom.Circle(r, r, r * 1.05),
          Phaser.Geom.Circle.Contains
        );
      }
    } else {
      p.ball.disableInteractive();
    }
  });
}

export function applyRoundTheme(scene) {
  const { ui, ts } = getScales(scene);
  const choiceFont = fitFont(28, ts);
  const palette = getButtonPalette(scene, "default");

  scene.choiceButtons.forEach((button) => {
    button.setTheme({
      fill: palette.fill,
      strokeColor: palette.strokeColor,
      strokeAlpha: palette.strokeAlpha,
      textColor: palette.textColor,
      fontSize: choiceFont,
    });
  });

  const r = Math.round(28 * ui);
  scene.ballParts.forEach((p) => recolorBall(p, scene, r, !!scene.a11y.highContrast));
}

export function layoutBalls(scene) {
  const left = contentLeft(scene);
  const W = scene.scale.width;
  const { ui } = getScales(scene);
  const r = Math.round(28 * ui);

  const topY = 180 * ui;
  const cols = 3;
  const gapX = 28 * ui;
  const gapY = 36 * ui;
  const cellW = 110 * ui;
  const cellH = 110 * ui;

  const contentW = cols * cellW + (cols - 1) * gapX;
  const startX = left + Math.max(0, (W - left - 16 - contentW) / 2);

  scene.ballParts.forEach((p, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = startX + col * (cellW + gapX) + cellW / 2;
    const y = topY + row * (cellH + gapY) + cellH / 2;

    recolorBall(p, scene, r, !!scene.a11y.highContrast);
    p.container.setPosition(x, y);
  });
}

export function layoutChoices(scene) {
  const left = contentLeft(scene);
  const W = scene.scale.width;
  const H = scene.scale.height;

  const { ui } = getScales(scene);
  const btnW = Math.round(150 * ui);
  const btnH = Math.round(62 * ui);
  const gap = Math.round(18 * ui);

  const totalW =
    scene.choiceButtons.length * btnW +
    (scene.choiceButtons.length - 1) * gap;
  const startX = left + Math.max(0, (W - left - 16 - totalW) / 2);
  const y = H - 120 * ui;

  scene.choiceButtons.forEach((button, i) => {
    button.setSize(btnW, btnH);
    button.setTL(startX + i * (btnW + gap), y);
  });
}

export function updateStats(scene) {
  scene.stats.setText(
    `Puntos: ${scene.state.score} • Intentos: ${scene.state.attempts} • Ronda: ${scene.state.round}/${scene.roundsTotal}`
  );
}

export function setupNextRound(scene) {
  if (scene.gameEnded) return;

  scene.cancelRoundTimer();
  clearRound(scene);

  scene.state.round += 1;
  scene.state.locked = false;

  const { target, choices } = createRoundData();
  scene.state.target = target;

  const { ui } = getScales(scene);
  const r = Math.round(28 * ui);

  for (let i = 0; i < scene.state.target; i++) {
    const parts = makeBall(scene, 0, 0, r, !!scene.a11y.highContrast, i);
    scene.ballParts.push(parts);
  }

  choices.forEach((n) => {
    const btn = makeTopLeftButton(
      scene,
      String(n),
      () => handleAnswerPick(scene, n),
      10,
      { width: 150, height: 62, baseFont: 28 }
    );
    scene.choiceButtons.push(btn);
  });

  updateStats(scene);
  layoutBalls(scene);
  layoutChoices(scene);
}

export function handleAnswerPick(scene, value) {
  if (scene.state.locked || scene.gameEnded) return;

  scene.state.locked = true;
  scene.state.attempts += 1;
  setChoicesEnabled(scene, false);

  const ok = value === scene.state.target;

  if (ok) {
    scene.state.score += 1;
    showCorrectFeedback(scene);
    speakIfEnabled(scene, "Correcto");
  } else {
    scene.state.wrongAnswers += 1;
    showWrongFeedback(scene);
    speakIfEnabled(scene, `Incorrecto. Eran ${scene.state.target}`);
  }

  updateStats(scene);

  scene.roundTimer = scene.time.delayedCall(1200, () => {
    scene.roundTimer = null;

    if (!scene.scene.isActive()) return;

    if (scene.state.round >= scene.roundsTotal) {
      scene.finishGame();
    } else {
      setupNextRound(scene);
      applyRoundTheme(scene);
    }
  });
}
