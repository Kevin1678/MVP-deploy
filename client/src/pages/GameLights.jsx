import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createLightsSequenceGame } from "../phaser/lightsSequence";

export default function GameLights() {
  const navigate = useNavigate();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const destroy = createLightsSequenceGame(
      "phaser-root",
      async ({ score = 0, moves = 0, durationMs = 0, game = "lights-sequence" }) => {
        if (doneRef.current) return;
        doneRef.current = true;

        try {
          const res = await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              game,
              score,
              moves,
              durationMs,
            }),
          });

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            console.error("Error guardando resultado:", data);
            alert(data?.message || "No se pudo guardar el resultado.");
          }
        } catch (err) {
          console.error("Error de conexión:", err);
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
