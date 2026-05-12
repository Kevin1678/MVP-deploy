import { speakIfEnabled } from "../../a11yPanel";

export function createCountVisual(scene, count) {
  const key = `countpick-${count}`;

  if (!scene.textures.exists(key)) {
    console.error(`[CountPick] No existe la textura: ${key}`);
  }

  const image = scene.add.image(0, 0, key).setOrigin(0.5);

  image.setInteractive({ useHandCursor: true });

  const announce = () => {
    speakIfEnabled(scene, "Cuenta las piezas y elige el número correcto.");
  };

  image.on("pointerover", announce);
  image.on("pointerdown", announce);

  const container = scene.add.container(0, 0, [image]);

  return {
    container,
    image,

    setMaxSize(maxWidth, maxHeight) {
      if (!image.width || !image.height) return;

      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height
      );

      image.setScale(scale);
    },

    destroy() {
      container.destroy(true);
    },
  };
}
