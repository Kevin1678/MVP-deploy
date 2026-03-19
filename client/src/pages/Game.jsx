import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMemoramaGame } from "../phaser/memorama";
import { createCountPickGame } from "../phaser/countPick";
import { createLightsSequenceGame } from "../phaser/lightsSequence";

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const gameMap = {
      "/games/memorama": {
        factory: createMemoramaGame,
        fallbackGame: "memorama",
      },
      "/games/contar": {
        factory: createCountPickGame,
        fallbackGame: "countPick",
      },
      "/games/luces": {
        factory: createLightsSequenceGame,
        fallbackGame: "lights-sequence",
      },
    };

    const current = gameMap[location.pathname];

    if (!current) {
      navigate("/games", { replace: true });
      return;
    }

    const destroy = current.factory(
      "phaser-root",
      async ({
        score = 0,
        moves = 0,
        durationMs = 0,
        game,
        level,
        accuracy,
        attempts,
        metadata,
      }) => {
        if (doneRef.current) return;
        doneRef.current = true;

        try {
          const res = await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              game: game || current.fallbackGame,
              score,
              moves,
              durationMs,
              level,
              accuracy,
              attempts,
              metadata,
            }),
          });

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            console.error("Error guardando resultado:", data);
            alert(data?.message || "No se pudo guardar el resultado.");
            doneRef.current = false;
            return;
          }
        } catch (err) {
          console.error("Error de conexión al guardar el resultado:", err);
          alert("Error de conexión al guardar el resultado.");
          doneRef.current = false;
          return;
        }

        try {
          window.speechSynthesis?.cancel();
        } catch {}

        navigate("/games", { replace: true });
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
  }, [location.pathname, navigate]);

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <div id="phaser-root" style={{ width: "100%", height: "100%", position: "relative" }} />
    </div>
  );
}
