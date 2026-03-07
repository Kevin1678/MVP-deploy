import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function GameTile({ game, locked, onClick }) {
  return (
    <button
      type="button"
      className={`tile ${locked ? "locked" : ""}`}
      onClick={onClick}
      disabled={locked}
    >
      <div className="tileTop">
        <div className="badge">{locked ? "🔒" : "🏆"}</div>
      </div>

      <div className="iconWrap">
        <div className="icon">{game.icon ?? "🎮"}</div>
      </div>

      <div className="tileTitle">{game.title}</div>
    </button>
  );
}

export default function GamesMenu() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Si todavía no tienes endpoint, esto sirve de fallback local (1 juego).
  const localFallback = useMemo(
    () => [
      {
        id: "memorama",
        title: "Juntar pares",
        route: "/games/memorama",
        icon: "🧠",
        mode: "Memorama",
        estimated: "3–5 min",
        enabled: true,
      },

      {
        id: "count-pick",
        title: "Contar y elegir",
        route: "/games/contar",
        icon: "🔢",
        enabled: true,
      },
    ],
    []
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // Si luego creas endpoint: GET /api/games
        // const res = await fetch("/api/games");
        // if (!res.ok) throw new Error("No se pudo cargar el catálogo");
        // const data = await res.json();

        const data = localFallback; // por ahora

        if (alive) setGames(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setGames(localFallback);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [localFallback]);

  if (loading) {
    return (
      <div className="menuPage">
        <h1 className="menuTitle">Minijuegos</h1>
        <p className="menuSubtitle">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="menuPage">
      <div className="menuHeader">
        <div>
          <h1 className="menuTitle">Minijuegos</h1>
          <p className="menuSubtitle">
            Elige un juego disponible para empezar.
          </p>
        </div>

        <div className="menuActions">
          <button className="secondaryBtn" onClick={() => navigate("/admin")}>
            Panel
          </button>
          <button className="secondaryBtn" onClick={() => navigate("/games")}>
            Regresar
          </button>
        </div>
      </div>

      <div className="grid">
{games.map((g) => {
  const locked = g.enabled === false;

  return (
    <GameTile
      key={g.id}
      game={g}
      locked={locked}
      onClick={() => {
        console.log("CLICK", g.route, g.enabled);
        if (!locked) navigate(g.route);
      }}
    />
  );
})}
        </div>
    </div>
  );

}
