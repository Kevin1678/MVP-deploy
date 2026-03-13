import { useMemo } from "react";
import "../styles/teacherDashboard.css";

export default function TeacherDashboard() {
  const summary = useMemo(
    () => ({
      totalStudents: 18,
      totalGroups: 3,
      totalGames: 52,
      avgScore: 79
    }),
    []
  );

  const groupStats = useMemo(
    () => [
      { name: "1A", avg: 74, games: 16, students: 6 },
      { name: "1B", avg: 82, games: 21, students: 5 },
      { name: "1C", avg: 78, games: 15, students: 7 }
    ],
    []
  );

  const studentResults = useMemo(
    () => [
      {
        id: 1,
        student: "Mateo Molina Hernández",
        group: "1A",
        avgScore: 82,
        games: 6,
        lastActivity: "2026-03-10"
      },
      {
        id: 2,
        student: "Fernando Angulo Berrelleza",
        group: "1B",
        avgScore: 75,
        games: 5,
        lastActivity: "2026-03-09"
      },
      {
        id: 3,
        student: "Ana Torres López",
        group: "1C",
        avgScore: 90,
        games: 7,
        lastActivity: "2026-03-08"
      },
      {
        id: 4,
        student: "Luis García Núñez",
        group: "1A",
        avgScore: 68,
        games: 4,
        lastActivity: "2026-03-07"
      },
      {
        id: 5,
        student: "Valeria Sánchez Ruiz",
        group: "1C",
        avgScore: 88,
        games: 8,
        lastActivity: "2026-03-10"
      }
    ],
    []
  );

  const maxAvg = Math.max(...groupStats.map((g) => g.avg), 100);

  return (
    <div className="teacher-dashboard">
      <div className="teacher-dashboard__header">
        <div>
          <h2 className="teacher-dashboard__title">Resumen general</h2>
          <p className="teacher-dashboard__subtitle">
            Resultados simbólicos de alumnos y grupos.
          </p>
        </div>

        <div className="teacher-dashboard__badge">
          
        </div>
      </div>

      <section className="teacher-dashboard__cards">
        <article className="teacher-card">
          <span className="teacher-card__label">Alumnos inscritos</span>
          <strong className="teacher-card__value">{summary.totalStudents}</strong>
        </article>

        <article className="teacher-card">
          <span className="teacher-card__label">Grupos activos</span>
          <strong className="teacher-card__value">{summary.totalGroups}</strong>
        </article>

        <article className="teacher-card">
          <span className="teacher-card__label">Partidas registradas</span>
          <strong className="teacher-card__value">{summary.totalGames}</strong>
        </article>

        <article className="teacher-card">
          <span className="teacher-card__label">Promedio general</span>
          <strong className="teacher-card__value">{summary.avgScore}</strong>
        </article>
      </section>

      <section className="teacher-dashboard__grid">
        <article className="teacher-panel">
          <div className="teacher-panel__header">
            <h2>Promedio por grupo</h2>
            <span>Vista general</span>
          </div>

          <div className="teacher-bars">
            {groupStats.map((item) => (
              <div key={item.name} className="teacher-bars__row">
                <div className="teacher-bars__top">
                  <span>{item.name}</span>
                  <span>{item.avg}%</span>
                </div>

                <div className="teacher-bars__track">
                  <div
                    className="teacher-bars__fill"
                    style={{ width: `${(item.avg / maxAvg) * 100}%` }}
                  />
                </div>

                <div className="teacher-bars__meta">
                  <small>
                    {item.games} partidas · {item.students} alumnos
                  </small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="teacher-panel">
          <div className="teacher-panel__header">
            <h2>Resumen por grupo</h2>
            <span>Datos simbólicos</span>
          </div>

          <div className="teacher-subject-list">
            {groupStats.map((item) => (
              <div key={item.name} className="teacher-subject-item">
                <div>
                  <strong>Grupo {item.name}</strong>
                  <p>{item.students} alumnos · {item.games} partidas</p>
                </div>
                <div className="teacher-subject-item__score">{item.avg}%</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="teacher-panel teacher-panel--table">
        <div className="teacher-panel__header">
          <h2>Resultados generales de alumnos</h2>
          <span>Total mostrados: {studentResults.length}</span>
        </div>

        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Alumno</th>
                <th>Grupo</th>
                <th>Promedio</th>
                <th>Partidas</th>
                <th>Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {studentResults.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.student}</td>
                  <td>{row.group}</td>
                  <td>{row.avgScore}%</td>
                  <td>{row.games}</td>
                  <td>{row.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

