import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMemoramaGame } from "../phaser/memorama";
import { createCountPickGame } from "../phaser/countPick"; // <-- asegúrate que existe

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    // ✅ Selecciona qué juego montar según la URL
    const factory =
      location.pathname === "/games/memorama"
        ? createMemoramaGame
        : location.pathname === "/games/contar"
        ? createCountPickGame
        : null;

    if (!factory) {
      // ruta no soportada
      navigate("/games", { replace: true });
      return;
    }

    const destroy = factory(
      "phaser-root",
      async ({ score, moves, durationMs, game }) => {
        // game puede venir del juego (countPick), si no, usa el de la ruta
        const gameName = game || (location.pathname === "/games/memorama" ? "memorama" : "countPick");

        if (doneRef.current) return;
        doneRef.current = true;

        try {
          await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: gameName, score, moves, durationMs }),
          });
        } catch {
          alert("Error de conexión al guardar el resultado.");
        } finally {
          // Limpia voz y vuelve al menú
          try { window.speechSynthesis?.cancel(); } catch {}
          navigate("/games", { replace: true });
        }
      },
      () => {
        // onExit
        if (doneRef.current) return;
        doneRef.current = true;
        try { window.speechSynthesis?.cancel(); } catch {}
        navigate("/games", { replace: true });
      }
    );

    // ✅ cleanup correcto
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      try { destroy?.(); } catch {}
    };
  }, [location.pathname, navigate]);

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <div id="phaser-root" style={{ width: "100%", height: "100%", position: "relative" }} />
    </div>
  );
}
