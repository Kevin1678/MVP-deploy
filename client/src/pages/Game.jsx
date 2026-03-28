import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createMemoramaGame } from "../phaser/memorama";
import { createCountPickGame } from "../phaser/countPick";
import { createLightsSequenceGame } from "../phaser/lightsSequence";
import {
  defaultA11yPrefs,
  loadA11yPrefs,
  saveA11yPrefs,
} from "../phaser/a11yPanel";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function mapStudentProfileToA11y(studentProfile) {
  const saved = loadA11yPrefs() || defaultA11yPrefs();
  const fontScale = Number(studentProfile?.fontScale) || 100;
  const visualCondition = studentProfile?.visualCondition || "NONE";
  const isLowVision = visualCondition === "LOW_VISION";

  let colorMode = "normal";
  if (visualCondition === "PROTANOPIA") colorMode = "protanopia";
  if (visualCondition === "TRITANOPIA") colorMode = "tritanopia";

  return {
    ...saved,
    ttsEnabled: Boolean(studentProfile?.textToSpeechEnabled) || isLowVision,
    highContrast: Boolean(studentProfile?.highContrast) || isLowVision,
    colorMode,
    textScale: clamp(fontScale / 100, 1, 1.5),
  };
}

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const savingRef = useRef(false);
  const [loadingA11y, setLoadingA11y] = useState(true);

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

    let cancelled = false;
    let destroy;

    async function bootstrapGame() {
      setLoadingA11y(true);

      try {
        const res = await fetch("/api/auth/me");
        const me = res.ok ? await res.json() : null;

        if (me?.role === "STUDENT" && me?.studentProfile) {
          const prefs = mapStudentProfileToA11y(me.studentProfile);
          saveA11yPrefs(prefs);
        }
      } catch (error) {
        console.warn(
          "No se pudo cargar el perfil de accesibilidad del alumno.",
          error
        );
      } finally {
        if (cancelled) return;

        destroy = current.factory(
          "phaser-root",
          saveResult,
          exitToCatalog
        );

        setLoadingA11y(false);
      }
    }

    bootstrapGame();

    return () => {
      cancelled = true;

      try {
        window.speechSynthesis?.cancel();
      } catch {}

      try {
        destroy?.();
      } catch {}
    };
  }, [location.pathname, navigate]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {loadingA11y && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "#0b1020",
            color: "#ffffff",
            zIndex: 2,
            fontFamily: "Arial",
            fontSize: "20px",
          }}
        >
          Cargando configuración de accesibilidad...
        </div>
      )}

      <div
        id="phaser-root"
        style={{ width: "100%", height: "100%", position: "relative" }}
      />
    </div>
  );
}
