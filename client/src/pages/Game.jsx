import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createMemoramaGame } from "../phaser/memorama";

export default function Game() {
  const navigate = useNavigate();
  const doneRef = useRef(false);

  useEffect(() => {
    const destroy = createMemoramaGame(
      "phaser-root",
      async ({ score, moves, durationMs }) => {
        if (doneRef.current) return;
        doneRef.current = true;

        try {
          const res = await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: "memorama", score, moves, durationMs }),
          });

        } catch {
          alert("Error de conexión al guardar el resultado.");
        } finally {
          navigate("/games", { replace: true });
        }
      },
      () => {
        if (doneRef.current) return; // si ya terminó, no salgas por otra vía
        doneRef.current = true;
        navigate("/games", { replace: true });
      }
    );

    return () => destroy();
  }, [navigate]);

return (
  <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
    <div id="phaser-root" style={{ width: "100%", height: "100%", position: "relative" }} />
  </div>
);

    return () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    destroy();
  };
}
