import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMemoramaGame } from "../phaser/memorama";
import { createCountPickGame } from "../phaser/countPick";

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const factory =
      location.pathname === "/games/memorama"
        ? createMemoramaGame
        : location.pathname === "/games/contar"
        ? createCountPickGame
        : null;

    if (!factory) {
      navigate("/games", { replace: true });
      return;
    }

    const destroy = factory(
      "phaser-root",
      async ({ score, moves, durationMs, game, level, metadata, accuracy, attempts }) => {
        const gameName =
          game || (location.pathname === "/games/memorama" ? "memorama" : "countPick");

        if (doneRef.current) return;
        doneRef.current = true;

        try {
          const res = await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              game: gameName,
              score,
              moves,
              durationMs,
              level,
              metadata,
              accuracy,
              attempts,
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("Error al guardar resultado:", res.status, text);
            alert(`No se pudo guardar el resultado. Error ${res.status}`);
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
