import { speakIfEnabled } from "../../a11yPanel";

export function createCountVisual(scene, count) {
  const key = `countpick-${count}`;

  console.log("Buscando textura:", key, scene.textures.exists(key));

  const image = scene.add.image(0, 0, key).setOrigin(0.5);
  image.setDepth(50);
  image.setInteractive({ useHandCursor: true });

  const announce = () => {
    speakIfEnabled(scene, "Cuenta las piezas y elige el número correcto.");
  };

  image.on("pointerover", announce);
  image.on("pointerdown", announce);

  const container = scene.add.container(0, 0, [image]);
  container.setDepth(50);

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
