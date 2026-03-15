import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/teacher.css";

const MIN_SCALE = 1;
const MAX_SCALE = 1.3;
const STEP = 0.1;

export default function Teacher() {
  const nav = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("teacher-theme") || "dark"
  );
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(localStorage.getItem("teacher-font-scale"));
    return Number.isFinite(saved) && saved >= MIN_SCALE && saved <= MAX_SCALE
      ? saved
      : 1;
  });

  useEffect(() => {
    localStorage.setItem("teacher-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("teacher-font-scale", String(fontScale));
  }, [fontScale]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // No bloquea la salida
    } finally {
      nav("/", { replace: true });
    }
  }

  function increaseFont() {
    setFontScale((prev) => Math.min(MAX_SCALE, +(prev + STEP).toFixed(2)));
  }

  function decreaseFont() {
    setFontScale((prev) => Math.max(MIN_SCALE, +(prev - STEP).toFixed(2)));
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div
      className={`teacher-shell teacher-shell--${theme}`}
      style={{ "--teacher-scale": fontScale }}
    >
      <aside className={`teacher-sidebar ${sidebarOpen ? "" : "teacher-sidebar--collapsed"}`}>
        <div className="teacher-sidebar__top">
          <div>
            <p className="teacher-sidebar__eyebrow">Panel docente</p>
            <h1 className="teacher-sidebar__title">
              {sidebarOpen ? "Menú de navegación" : "Menú"}
            </h1>
          </div>

          <button
            type="button"
            className="teacher-sidebar__collapse"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="teacher-sidebar__nav">
          <NavLink to="/teacher" end className="teacher-nav__item">
            <span className="teacher-nav__icon">🏠</span>
            {sidebarOpen && <span>Panel general</span>}
          </NavLink>

          <NavLink to="/teacher/students" className="teacher-nav__item">
            <span className="teacher-nav__icon">🧒</span>
            {sidebarOpen && <span>Agregar alumno</span>}
          </NavLink>

          <NavLink to="/teacher/parents" className="teacher-nav__item">
            <span className="teacher-nav__icon">👨‍👩‍👧</span>
            {sidebarOpen && <span>Agregar / vincular padres</span>}
          </NavLink>
        </nav>

        <div className="teacher-sidebar__tools">
          <button
            type="button"
            className="teacher-tool-btn"
            onClick={toggleTheme}
          >
            <span className="teacher-nav__icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            {sidebarOpen && (
              <span>
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </span>
            )}
          </button>

          <div className="teacher-font-box">
            <button
              type="button"
              className="teacher-font-btn"
              onClick={decreaseFont}
              aria-label="Disminuir tamaño de letra"
            >
              A-
            </button>

            {sidebarOpen && (
              <span className="teacher-font-label">
                {Math.round(fontScale * 100)}%
              </span>
            )}

            <button
              type="button"
              className="teacher-font-btn"
              onClick={increaseFont}
              aria-label="Aumentar tamaño de letra"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="teacher-tool-btn teacher-tool-btn--danger"
            onClick={logout}
          >
            <span className="teacher-nav__icon">⏻</span>
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="teacher-main">
        <header className="teacher-mobilebar">
          <button
            type="button"
            className="teacher-mobilebar__menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>

          <div>
            <h2 className="teacher-mobilebar__title">Panel Docente</h2>
            <p className="teacher-mobilebar__subtitle">
              Gestión general, alumnos y padres.
            </p>
          </div>
        </header>

        <main className="teacher-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
