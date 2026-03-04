import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createMemoramaGame } from "../phaser/memorama";

export default function Game() {
  const navigate = useNavigate();

  useEffect(() => {
    const destroy = createMemoramaGame(
      "phaser-root",
      async ({ score, moves, durationMs }) => {
        try {
          const res = await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: "memorama", score, moves, durationMs }),
          });

          if (!res.ok) {
            alert("No se pudo guardar el resultado.");
          } else {
            alert("¡Juego terminado! Resultado guardado.");
          }
        } catch (e) {
          alert("Error de conexión al guardar el resultado.");
        } finally {
          navigate("/games");
        }
      },
      () => {
        // ✅ Botón de salida desde Phaser
        navigate("/games");
      }
    );

    return () => destroy();
  }, [navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
      <div id="phaser-root" />
    </div>
  );
}
