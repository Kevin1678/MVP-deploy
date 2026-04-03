import { buildFinalResult } from "./state";
import { setCardVisual } from "./cards";

export function handleCardClick(scene, card) {
  if (scene.state.locked || card.matched || card.flipped || scene.gameEnded)
    return;

  scene.state.flips += 1;
  setCardVisual(scene, card, true);
  scene.say(`Figura ${card.label}`);

  if (!scene.state.first) {
    scene.state.first = card;
    return;
  }

  scene.state.locked = true;
  scene.state.attempts += 1;
  scene.attemptsText.setText(`Intentos: ${scene.state.attempts}`);

  const a = scene.state.first;
  const b = card;

  const revealDelay = 1400;
  const hideDelay = 900;

  if (a.matchKey === b.matchKey) {
    scene.schedule(revealDelay, () => {
      if (!scene.scene.isActive()) return;

      a.matched = true;
      b.matched = true;
      setCardVisual(scene, a, true);
      setCardVisual(scene, b, true);

      scene.say(`Correcto. Pareja de ${b.label}`);

      scene.state.matchedPairs += 1;
      scene.state.first = null;
      scene.state.locked = false;

      if (scene.state.matchedPairs === scene.pairs) {
        handleWin(scene);
      }
    });
    return;
  }

  scene.schedule(revealDelay, () => {
    if (!scene.scene.isActive()) return;
    scene.say(`Incorrecto. Era ${a.label} y ${b.label}`);

    scene.schedule(hideDelay, () => {
      if (!scene.scene.isActive()) return;
      setCardVisual(scene, a, false);
      setCardVisual(scene, b, false);
      scene.state.first = null;
      scene.state.locked = false;
      scene.applyFocus(scene.focusIndex, true);
    });
  });
}

export async function handleWin(scene) {
  if (scene.gameEnded) return;

  scene.gameEnded = true;
  scene.state.locked = true;
  scene.cards.forEach((c) => c.hit.disableInteractive());
  scene.menuBtn.disableInteractive();
  scene.exitBtn.disableInteractive();

  scene.finalResult = buildFinalResult(scene);

  try {
    await scene._onFinish?.(scene.finalResult);
  } catch (err) {
    console.error("Error guardando resultado:", err);
  }

  scene.showEndModal(scene.finalResult);
  scene.say("Ganaste. Selecciona jugar otra vez o salir.");
}
