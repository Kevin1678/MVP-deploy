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

export default function ParentChildren() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");

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

        if (!active) return;

        setData(json);

        if (json.children?.length) {
          setSelectedChildId(String(json.children[0].id));
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

  const selectedChild = useMemo(() => {
    if (!data?.children?.length) return null;

    return (
      data.children.find((child) => String(child.id) === String(selectedChildId)) ||
      data.children[0]
    );
  }, [data, selectedChildId]);

  const summaryCards = useMemo(() => {
    if (!selectedChild) return [];

    return [
      {
        label: "Partidas registradas",
        value: selectedChild.summary.totalResults
      },
      {
        label: "Juegos distintos",
        value: selectedChild.summary.gamesPlayed
      },
      {
        label: "Puntaje promedio",
        value: formatMetric(selectedChild.summary.avgScore)
      },
      {
        label: "Precisión promedio",
        value: formatMetric(selectedChild.summary.avgAccuracy, "%")
      },
      {
        label: "Tiempo acumulado",
        value: formatDuration(selectedChild.summary.totalDurationMs)
      }
    ];
  }, [selectedChild]);

  if (loading) {
    return (
      <div className="parent-dashboard">
        <div className="parent-dashboard__header">
          <div>
            <h2 className="parent-dashboard__title">Datos por hijo</h2>
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

  if (!data) return null;

  if (!data.children.length) {
    return (
      <div className="parent-dashboard">
        <div className="parent-dashboard__header">
          <div>
            <h2 className="parent-dashboard__title">Datos por hijo</h2>
            <p className="parent-dashboard__subtitle">
              Aquí podrá revisar el detalle individual de cada alumno.
            </p>
          </div>
        </div>

        <div className="parent-empty">
          <h2>No hay hijos vinculados</h2>
          <p>
            La cuenta existe, pero todavía no tiene alumnos asociados desde el
            panel del docente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard">
      <div className="parent-dashboard__header">
        <div>
          <h2 className="parent-dashboard__title">Datos por hijo</h2>
          <p className="parent-dashboard__subtitle">
            Aquí puede revisar la información específica de cada alumno.
          </p>
        </div>

        <div className="parent-dashboard__badge">{data.parent.name}</div>
      </div>

      <section className="parent-panel parent-filter-panel">
        <div className="parent-panel__header">
          <h2>Seleccionar alumno</h2>
          <span>
            {data.children.length > 1
              ? "Use el filtro para cambiar entre sus hijos"
              : "Solo hay un alumno vinculado a esta cuenta"}
          </span>
        </div>

        {data.children.length > 1 ? (
          <div className="parent-filter-grid">
            <label className="parent-select-box">
              <span>Alumno</span>
              <select
                className="parent-select"
                value={selectedChild ? String(selectedChild.id) : ""}
                onChange={(e) => setSelectedChildId(e.target.value)}
              >
                {data.children.map((child) => (
                  <option key={child.id} value={String(child.id)}>
                    {child.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="parent-static-child">
            <strong>{selectedChild?.name}</strong>
          </div>
        )}
      </section>

      {selectedChild && (
        <>
          <section className="parent-child-focus">
            <div className="parent-child-focus__header">
              <div>
                <h3>{selectedChild.name}</h3>
                <p>
                  Grupo: <strong>{selectedChild.group}</strong> · Relación:{" "}
                  <strong>{selectedChild.relationLabel}</strong>
                </p>
              </div>

              <span className="parent-child-card__last">
                Última actividad: {formatDate(selectedChild.summary.lastPlayedAt)}
              </span>
            </div>

            <div className="parent-dashboard__cards parent-dashboard__cards--five">
              {summaryCards.map((card) => (
                <article key={card.label} className="parent-card">
                  <span className="parent-card__label">{card.label}</span>
                  <strong className="parent-card__value">{card.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <div className="parent-child-sections">
            <section className="parent-panel">
              <div className="parent-panel__header">
                <h2>Resumen por juego</h2>
                <span>{selectedChild.byGame.length} juegos con registros</span>
              </div>

              {selectedChild.byGame.length ? (
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
                      {selectedChild.byGame.map((game) => (
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

              {selectedChild.recentResults.length ? (
                <div className="parent-table-wrap">
                  <table className="parent-table">
                    <thead>
                      <tr>
                        <th>Juego</th>
                        <th>Nivel</th>
                        <th>Puntaje</th>
                        <th>Movimientos</th>
                        <th>Intentos</th>
                        <th>Precisión</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChild.recentResults.map((result) => (
                        <tr key={result.id}>
                          <td>{result.gameLabel}</td>
                          <td>{result.level || "—"}</td>
                          <td>{result.score ?? "—"}</td>
                          <td>{result.moves ?? "—"}</td>
                          <td>{result.attempts ?? "—"}</td>
                          <td>{formatMetric(result.accuracy, "%")}</td>
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
        </>
      )}
    </div>
  );
}