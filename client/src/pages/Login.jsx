import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const LS_THEME = "pref_theme";     // "soft" | "high"
const LS_TEXT = "pref_text_size";  // "normal" | "large"

export default function Login() {
  const nav = useNavigate();

  // Cargar preferencias (defaults: soft + normal)
  const initialTheme = useMemo(() => localStorage.getItem(LS_THEME) || "soft", []);
  const initialText = useMemo(() => localStorage.getItem(LS_TEXT) || "normal", []);

  const [theme, setTheme] = useState(initialTheme); // "soft" | "high"
  const [textSize, setTextSize] = useState(initialText); // "normal" | "large"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Aplicar clases al body + persistir
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
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        setErr(res.status === 401 ? "Credenciales incorrectas." : `Error (${res.status}). Intenta de nuevo.`);
        return;
      }

      const me = await res.json();
      nav(me.role === "ADMIN" ? "/admin" : "/games");
    } catch {
      setErr("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="topbar">
          <div className="brand" style={{ margin: 0 }}>
            <div className="logo" aria-hidden="true" />
            <div>
              <h1>Residencia MVP</h1>
              <p className="sub" style={{ margin: "6px 0 0" }}>
                Acceso seguro para registrar resultados del memorama.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="chip"
              onClick={() => setTextSize(v => (v === "large" ? "normal" : "large"))}
              aria-pressed={textSize === "large"}
              title="Cambiar tamaño de texto"
            >
              {textSize === "large" ? "Texto normal" : "Texto grande"}
            </button>

            <button
              type="button"
              className="chip"
              onClick={() => setTheme(v => (v === "high" ? "soft" : "high"))}
              aria-pressed={theme === "high"}
              title="Cambiar contraste"
            >
              {theme === "high" ? "Contraste suave" : "Alto contraste"}
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="inputRow">
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
                className="iconBtn"
                onClick={() => setShowPass(v => !v)}
                aria-pressed={showPass}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="actions">
            <button className="primary" disabled={loading}>
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </div>

          {err && <div className="error" role="alert">{err}</div>}
        </form>
      </div>
    </div>
  );
}
