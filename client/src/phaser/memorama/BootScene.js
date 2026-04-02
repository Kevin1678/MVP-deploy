import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {}

  create() {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        if (this.textures.exists("cardBack")) {
          this.textures.remove("cardBack");
        }

        this.textures.addImage("cardBack", img);
        this.scene.start("MenuScene");
      } catch (err) {
        console.error("Error registrando cardBack:", err);
        this.scene.start("MenuScene");
      }
    };

    img.onerror = (err) => {
      console.error("No se pudo cargar /assets/card-back.png", err);
      this.scene.start("MenuScene");
    };

    img.src = "/assets/card-back.png";
  }
}

