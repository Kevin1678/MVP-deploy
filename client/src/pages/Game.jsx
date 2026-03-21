import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMemoramaGame } from "../phaser/memorama";
import { createCountPickGame } from "../phaser/countPick";
import { createLightsSequenceGame } from "../phaser/lightsSequence";

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const savingRef = useRef(false);

  useEffect(() => {
    const gameMap = {
      "/games/memorama": {
        factory: createMemoramaGame,
        fallbackGame: "memorama",
      },
      "/games/contar": {
        factory: createCountPickGame,
        fallbackGame: "countPick",
      },
      "/games/lights": {
        factory: createLightsSequenceGame,
        fallbackGame: "lights-sequence",
      },
    };

    const current = gameMap[location.pathname];

    if (!current) {
      navigate("/games", { replace: true });
      return;
    }

    const saveResult = async ({
      score = 0,
      moves = 0,
      durationMs = 0,
      game,
      level,
      accuracy,
      attempts,
      metadata,
    }) => {
      if (savingRef.current) return false;
      savingRef.current = true;

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
          return false;
        }

        return true;
      } catch (err) {
        console.error("Error de conexión al guardar el resultado:", err);
        alert("Error de conexión al guardar el resultado.");
        return false;
      } finally {
        savingRef.current = false;
      }
    };

    const exitToCatalog = () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}

      navigate("/games", { replace: true });
    };

    const destroy = current.factory(
      "phaser-root",
      saveResult,
      exitToCatalog
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
