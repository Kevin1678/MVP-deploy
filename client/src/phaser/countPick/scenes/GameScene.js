import Phaser from "phaser";

export class CountPickGameScene extends Phaser.Scene {
  constructor() {
    super("CountPickGameScene");
  }

  preload() {
    console.log("[TEST] preload iniciado");

    this.load.on("filecomplete-image", (key) => {
      console.log("[TEST] imagen cargada:", key);
    });

    this.load.on("loaderror", (file) => {
      console.error("[TEST] error cargando:", file.key, file.src);
    });

    this.load.on("complete", () => {
      console.log("[TEST] preload complete");
      console.log(
        "[TEST] existe test-count:",
        this.textures.exists("test-count")
      );
    });

    this.load.image("test-count", "/assets/countPick/count_3.png");
  }

  create() {
    console.log("[TEST] create ejecutado");
    console.log(
      "[TEST] existe test-count en create:",
      this.textures.exists("test-count")
    );

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
      .setOrigin(0);

    this.add.text(24, 24, "Prueba de imagen", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
    });

    if (!this.textures.exists("test-count")) {
      this.add.text(24, 80, "La textura NO cargó.", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ff6b6b",
      });
      return;
    }

    const img = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      "test-count"
    );

    const maxWidth = 500;
    const maxHeight = 350;
    const scale = Math.min(
      maxWidth / img.width,
      maxHeight / img.height
    );

    img.setScale(scale);

    this.add.text(24, 80, "La textura SÍ cargó.", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#4ade80",
    });
  }
}
