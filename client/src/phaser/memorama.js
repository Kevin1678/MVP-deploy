import Phaser from "phaser";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMemoramaGame(parentId, onFinish) {
  const symbols = ["A","B","C","D","E","F","G","H"]; // 8 pares = 16 cartas
  const deck = shuffle([...symbols, ...symbols]);

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentId,
    backgroundColor: "#f2f2f2",
    scene: {
      create() {
        const startAt = Date.now();
        let first = null;
        let lock = false;
        let matched = 0;
        let moves = 0;

        const cols = 4;
        const cardW = 140, cardH = 110;
        const gap = 15;
        const offsetX = 80, offsetY = 70;

        const cards = deck.map((sym, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = offsetX + col * (cardW + gap);
          const y = offsetY + row * (cardH + gap);

          const container = this.add.container(x, y);

          const bg = this.add.rectangle(0, 0, cardW, cardH, 0x444444).setOrigin(0);
          const label = this.add.text(cardW/2, cardH/2, "", { fontSize: "48px", color: "#000" }).setOrigin(0.5);

          container.add([bg, label]);
          container.setSize(cardW, cardH);
          container.setInteractive();

          const card = { sym, revealed: false, matched: false, container, bg, label };

          function reveal() {
            card.revealed = true;
            card.bg.setFillStyle(0xffffff);
            card.label.setText(card.sym);
          }
          function hide() {
            card.revealed = false;
            card.bg.setFillStyle(0x444444);
            card.label.setText("");
          }

          hide();

          container.on("pointerdown", async () => {
            if (lock || card.matched || card.revealed) return;

            reveal();

            if (!first) {
              first = card;
              return;
            }

            moves++;
            if (first.sym === card.sym) {
              // match
              first.matched = true;
              card.matched = true;
              matched++;

              first = null;

              if (matched === symbols.length) {
                const durationMs = Date.now() - startAt;
                onFinish({ score: matched, moves, durationMs });
              }
              return;
            }

            // no match
            lock = true;
            const prev = first;
            first = null;

            this.time.delayedCall(650, () => {
              hide();
              prev.bg.setFillStyle(0x444444);
              prev.label.setText("");
              prev.revealed = false;
              lock = false;
            });
          });

          return card;
        });

        this.add.text(20, 20, "Memorama: encuentra todos los pares", { fontSize: "22px", color: "#111" });
      }
    }
  };

  const game = new Phaser.Game(config);
  return () => game.destroy(true);
}