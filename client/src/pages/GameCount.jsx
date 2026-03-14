import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createCountPickGame } from "../phaser/countPick";

export default function GameCount() {
  const navigate = useNavigate();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const destroy = createCountPickGame(
      "phaser-root",
      async ({ score = 0, moves = 0, durationMs = 0, game = "countPick" }) => {

        const gameName = game || (location.pathname === "/games/countPick" ? "contar y elegir" : "countPick");
        if (doneRef.current) return;
        doneRef.current = true;

        try {
          await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: gameName, score, moves, durationMs }),
            }),
          });
        } catch {
          alert("Error de conexión al guardar el resultado.");
        } finally {
          try {
            window.speechSynthesis?.cancel();
          } catch {}
          navigate("/games", { replace: true });
        }
      },
      () => {
        if (doneRef.current) return;
        doneRef.current = true;

        try {
          window.speechSynthesis?.cancel();
        } catch {}

        navigate("/games", { replace: true });
      }
    );

    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}

      try {
        destroy?.();
      } catch {}
    };
  }, [navigate]);

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <div id="phaser-root" style={{ width: "100%", height: "100%", position: "relative" }} />
    </div>
  );
}
