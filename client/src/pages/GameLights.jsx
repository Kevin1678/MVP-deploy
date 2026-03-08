import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createLightsSequenceGame } from "../phaser/lightsSequence";

export default function GameLights() {
  const navigate = useNavigate();

  useEffect(() => {
    const destroy = createLightsSequenceGame(
      "phaser-root",
      async (result) => {
        try {
          await fetch("/api/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: "lights-sequence", ...result }),
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
