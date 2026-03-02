import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

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
        // 401 = credenciales
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
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Residencia MVP</h1>
            <p className="sub">
              Accede como administrador o alumno para jugar y registrar resultados.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="actions">
            <button disabled={loading}>
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </div>

          {err && <div className="error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
