import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      setErr("Login incorrecto");
      return;
    }

    const me = await res.json();
    if (me.role === "ADMIN") nav("/admin");
    else nav("/games");
  }

  return (
    <div style={{ maxWidth: 360, margin: "60px auto", fontFamily: "system-ui" }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={onSubmit}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{ width:"100%", padding:10, marginBottom:10 }}/>
        <input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ width:"100%", padding:10, marginBottom:10 }}/>
        <button style={{ width:"100%", padding:10 }}>Entrar</button>
      </form>
      {err && <p style={{ color:"crimson" }}>{err}</p>}
    </div>
  );
}