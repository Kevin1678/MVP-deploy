import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TeacherDashboard from "./TeacherDashboard";
import TeacherStudents from "./TeacherStudents";
import "../styles/teacher.css";

export default function Teacher() {
  const nav = useNavigate();
  const [view, setView] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // no bloquea la salida
    } finally {
      nav("/", { replace: true });
    }
  }

  function renderView() {
    if (view === "students") return <TeacherStudents />;
    return <TeacherDashboard />;
  }

  return (
    <div className="teacher-layout">
      <header className="teacher-topbar">
        <div>
          <h1 className="teacher-topbar__title">Panel Docente</h1>
          <p className="teacher-topbar__subtitle">
            Dashboard general y administración de alumnos.
          </p>
        </div>

        <div className="teacher-topbar__actions">
          <div className="teacher-menu">
            <button
              type="button"
              className="teacher-menu__button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              Menú ▾
            </button>

            {menuOpen && (
              <div className="teacher-menu__dropdown">
                <button
                  type="button"
                  className="teacher-menu__item"
                  onClick={() => {
                    setView("dashboard");
                    setMenuOpen(false);
                  }}
                >
                  Panel del Docente
                </button>

                <button
                  type="button"
                  className="teacher-menu__item"
                  onClick={() => {
                    setView("students");
                    setMenuOpen(false);
                  }}
                >
                  Agregar Alumno
                </button>
              </div>
            )}
          </div>

          <button type="button" className="teacher-logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="teacher-content">
        {renderView()}
      </main>
    </div>
  );
}
