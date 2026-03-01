import { useEffect } from "react";
import { createMemoramaGame } from "../phaser/memorama";

export default function Game() {
  useEffect(() => {
    const destroy = createMemoramaGame("phaser-root", async ({ score, moves, durationMs }) => {
      await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "memorama", score, moves, durationMs })
      });

      alert("¡Juego terminado! Resultado guardado.");
      window.location.href = "/games";
    });

    return () => destroy();
  }, []);

  return (
    <div style={{ display:"flex", justifyContent:"center", padding:20 }}>
      <div id="phaser-root" />
    </div>
  );
}