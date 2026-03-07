import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createCountPickGame } from "../phaser/countPick";

export default function GameCount() {
  const navigate = useNavigate();

  useEffect(() => {
    const destroy = createCountPickGame(
      "phaser-root",
      async ({ score, attempts, durationMs }) => {
        // opcional: guardar resultado en BD
        try {
          await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: "count-pick", score, attempts, durationMs }),
          });
        } catch (_) {}
        navigate("/games");
      },
      () => navigate("/games")
    );

    return () => destroy();
  }, [navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
      <div id="phaser-root" />
    </div>
  );
}