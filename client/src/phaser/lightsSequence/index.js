import { createResponsiveGame } from "../shared/gameFactory";
import { LightsMenuScene } from "./scenes/MenuScene";
import { LightsGameScene } from "./scenes/GameScene";

export function createLightsSequenceGame(parentId, onFinish, onExit) {
  return createResponsiveGame(
    parentId,
    [new LightsMenuScene(onExit), new LightsGameScene(onFinish, onExit)],
    "#0b1020"
  );
}
