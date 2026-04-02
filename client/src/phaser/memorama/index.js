import { createResponsiveGame } from "../shared/gameFactory";
import { BootScene } from "./BootScene";
import { MenuScene } from "./MenuScene";
import { MemoryScene } from "./MemoryScene";

export function createMemoramaGame(parentId, onFinish, onExit) {
  return createResponsiveGame(
    parentId,
    [new BootScene(), new MenuScene(onExit), new MemoryScene(onFinish, onExit)],
    "#0b1020"
  );
}
