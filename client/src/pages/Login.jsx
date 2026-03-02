import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [softTheme, setSoftTheme] = useState(false);

  const nav = useNavigate();

  // Aplica tema al body (alto contraste por defecto)
  useEffect(() => {
    document.body.classList.toggle("theme-soft", softTheme);
  }, [softTheme]);

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

          <button
            type="button"
            className="chip"
            onClick={() => setSoftTheme(v => !v)}
            aria-pressed={softTheme}
            title="Cambiar contraste"
          >
            {softTheme ? "Alto contraste" : "Contraste suave"}
          </button>
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
