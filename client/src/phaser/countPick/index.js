import { createResponsiveGame } from "../shared/gameFactory";
import { CountPickMenuScene } from "./MenuScene";
import { CountPickGameScene } from "./GameScene";

export function createCountPickGame(parentId, onFinish, onExit) {
  return createResponsiveGame(
    parentId,
    [new CountPickMenuScene(onExit), new CountPickGameScene(onFinish, onExit)],
    "#0b1020"
  );
}
