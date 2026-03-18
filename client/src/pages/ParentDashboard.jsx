import { useEffect, useMemo, useState } from "react";
import "../styles/parentDashboard.css";

function formatDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMetric(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "—";

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export default function ParentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/parent/dashboard");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudo cargar la información.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudo cargar la información.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Hijos vinculados",
        value: data.summary.totalChildren
      },
      {
        label: "Partidas registradas",
        value: data.summary.totalResults
      },
      {
        label: "Puntaje promedio",
        value: formatMetric(data.summary.avgScore)
      },
      {
        label: "Precisión promedio",
        value: formatMetric(data.summary.avgAccuracy, "%")
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="parent-dashboard">
        <div className="parent-dashboard__header">
          <div>
            <h2 className="parent-dashboard__title">Resultados generales</h2>
            <p className="parent-dashboard__subtitle">Cargando información…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-dashboard">
        <div className="parent-empty parent-empty--error">
          <h2>No se pudo cargar el panel</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="parent-dashboard">
      <div className="parent-dashboard__header">
        <div>
          <h2 className="parent-dashboard__title">Resultados generales</h2>
          <p className="parent-dashboard__subtitle">
            Aquí puede revisar el avance general de{" "}
            {data.summary.totalChildren === 1 ? "su hijo" : "sus hijos"}.
          </p>
        </div>

        <div className="parent-dashboard__badge">{data.parent.name}</div>
      </div>

      <section className="parent-dashboard__cards">
        {summaryCards.map((card) => (
          <article key={card.label} className="parent-card">
            <span className="parent-card__label">{card.label}</span>
            <strong className="parent-card__value">{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="parent-panel parent-panel--compact">
        <div className="parent-panel__header">
          <h2>Actividad reciente</h2>
          <span>Último registro: {formatDate(data.summary.lastPlayedAt)}</span>
        </div>

        {data.recentActivity.length ? (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Juego</th>
                  <th>Puntaje</th>
                  <th>Precisión</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.childName}</td>
                    <td>{item.gameLabel}</td>
                    <td>{item.score ?? "—"}</td>
                    <td>{formatMetric(item.accuracy, "%")}</td>
                    <td>{formatDate(item.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="parent-empty">
            <p>Todavía no hay partidas registradas.</p>
          </div>
        )}
      </section>

      <section className="parent-children">
        {data.children.length ? (
          data.children.map((child) => (
            <article key={child.id} className="parent-child-card">
              <div className="parent-child-card__header">
                <div>
                  <h3>{child.name}</h3>
                  <p>
                    Grupo: <strong>{child.group}</strong> · Relación:{" "}
                    <strong>{child.relationLabel}</strong>
                  </p>
                </div>
                <span className="parent-child-card__last">
                  Última actividad: {formatDate(child.summary.lastPlayedAt)}
                </span>
              </div>

              <div className="parent-child-stats">
                <div className="parent-child-stat">
                  <span>Partidas</span>
                  <strong>{child.summary.totalResults}</strong>
                </div>
                <div className="parent-child-stat">
                  <span>Juegos distintos</span>
                  <strong>{child.summary.gamesPlayed}</strong>
                </div>
                <div className="parent-child-stat">
                  <span>Promedio</span>
                  <strong>{formatMetric(child.summary.avgScore)}</strong>
                </div>
                <div className="parent-child-stat">
                  <span>Precisión</span>
                  <strong>{formatMetric(child.summary.avgAccuracy, "%")}</strong>
                </div>
                <div className="parent-child-stat">
                  <span>Tiempo acumulado</span>
                  <strong>{formatDuration(child.summary.totalDurationMs)}</strong>
                </div>
              </div>

              <div className="parent-child-sections">
                <section className="parent-panel">
                  <div className="parent-panel__header">
                    <h2>Resumen por juego</h2>
                    <span>{child.byGame.length} juegos con registros</span>
                  </div>

                  {child.byGame.length ? (
                    <div className="parent-table-wrap">
                      <table className="parent-table">
                        <thead>
                          <tr>
                            <th>Juego</th>
                            <th>Partidas</th>
                            <th>Promedio</th>
                            <th>Mejor puntaje</th>
                            <th>Precisión promedio</th>
                            <th>Última vez</th>
                          </tr>
                        </thead>
                        <tbody>
                          {child.byGame.map((game) => (
                            <tr key={game.gameType}>
                              <td>{game.gameLabel}</td>
                              <td>{game.plays}</td>
                              <td>{formatMetric(game.avgScore)}</td>
                              <td>{game.bestScore ?? "—"}</td>
                              <td>{formatMetric(game.avgAccuracy, "%")}</td>
                              <td>{formatDate(game.lastPlayedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="parent-empty">
                      <p>Este alumno aún no tiene resultados.</p>
                    </div>
                  )}
                </section>

                <section className="parent-panel">
                  <div className="parent-panel__header">
                    <h2>Partidas recientes</h2>
                    <span>Máximo 5 registros</span>
                  </div>

                  {child.recentResults.length ? (
                    <div className="parent-table-wrap">
                      <table className="parent-table">
                        <thead>
                          <tr>
                            <th>Juego</th>
                            <th>Nivel</th>
                            <th>Puntaje</th>
                            <th>Movimientos</th>
                            <th>Intentos</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {child.recentResults.map((result) => (
                            <tr key={result.id}>
                              <td>{result.gameLabel}</td>
                              <td>{result.level || "—"}</td>
                              <td>{result.score ?? "—"}</td>
                              <td>{result.moves ?? "—"}</td>
                              <td>{result.attempts ?? "—"}</td>
                              <td>{formatDate(result.playedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="parent-empty">
                      <p>Este alumno todavía no tiene actividad.</p>
                    </div>
                  )}
                </section>
              </div>
            </article>
          ))
        ) : (
          <div className="parent-empty">
            <h2>No hay hijos vinculados</h2>
            <p>
              La cuenta está creada, pero aún no tiene alumnos asociados desde
              el panel del docente.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}