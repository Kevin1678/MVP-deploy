import { createResponsiveGame } from "../shared/gameFactory";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { MemoryScene } from "./scenes/GameScene";

export function createMemoramaGame(parentId, onFinish, onExit) {
  return createResponsiveGame(
    parentId,
    [new BootScene(), new MenuScene(onExit), new MemoryScene(onFinish, onExit)],
    "#0b1020"
  );
}
