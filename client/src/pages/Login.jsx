import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const LS_THEME = "pref_theme";
const LS_TEXT = "pref_text_size";

export default function Login() {
  const nav = useNavigate();

  const initialTheme = useMemo(
    () => localStorage.getItem(LS_THEME) || "soft",
    []
  );
  const initialText = useMemo(
    () => localStorage.getItem(LS_TEXT) || "normal",
    []
  );

  const [theme, setTheme] = useState(initialTheme);
  const [textSize, setTextSize] = useState(initialText);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("theme-high", theme === "high");
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("text-large", textSize === "large");
    localStorage.setItem(LS_TEXT, textSize);
  }, [textSize]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setErr(
          res.status === 401
            ? "Credenciales incorrectas."
            : `Error (${res.status}). Intenta de nuevo.`
        );
        return;
      }

      const me = await res.json();

      if (me.role === "ADMIN") {
        nav("/admin", { replace: true });
      } else if (me.role === "TEACHER") {
        nav("/teacher", { replace: true });
      } else if (me.role === "PARENT") {
        nav("/parent", { replace: true });
      } else if (me.role === "STUDENT") {
        nav("/games", { replace: true });
      } else {
        setErr("Rol no reconocido.");
      }
    } catch {
      setErr("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-shell__glow login-shell__glow--1" aria-hidden="true" />
      <div className="login-shell__glow login-shell__glow--2" aria-hidden="true" />

      <section className="login-card" aria-label="Inicio de sesión">
        <header className="login-card__header">
          <div className="login-brand">
            <div className="login-brand__logo" aria-hidden="true">
              <span />
            </div>

            <div className="login-brand__copy">
              <span className="login-brand__eyebrow">Plataforma educativa</span>
              <h1>Residencia MVP</h1>
              <p>
                Ingresa para continuar con la plataforma, registrar avances y
                acceder a los minijuegos educativos.
              </p>
            </div>
          </div>

          <div className="login-badge" aria-hidden="true">
            <span className="login-badge__dot" />
            <span>Acceso seguro</span>
          </div>
        </header>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>

            <div className="login-inputRow">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="login-iconBtn"
                onClick={() => setShowPass((v) => !v)}
                aria-pressed={showPass}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {err && (
            <div className="login-error" role="alert">
              {err}
            </div>
          )}

          <div className="login-actions">
            <button className="login-primary" disabled={loading}>
              <span className={loading ? "login-primary__spinner" : ""} aria-hidden="true" />
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </div>
        </form>

        <footer className="login-card__footer">
          <div className="login-prefs">
            <span className="login-prefs__label">Accesibilidad rápida</span>

            <div className="login-prefs__actions">
              <button
                type="button"
                className="login-chip"
                onClick={() =>
                  setTextSize((v) => (v === "large" ? "normal" : "large"))
                }
                aria-pressed={textSize === "large"}
                title="Cambiar tamaño de texto"
              >
                {textSize === "large" ? "Texto normal" : "Texto grande"}
              </button>

              <button
                type="button"
                className="login-chip"
                onClick={() => setTheme((v) => (v === "high" ? "soft" : "high"))}
                aria-pressed={theme === "high"}
                title="Cambiar contraste"
              >
                {theme === "high" ? "Contraste suave" : "Alto contraste"}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
