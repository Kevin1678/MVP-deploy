import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Protected({ children, role }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => (r.ok ? r.json() : null))
      .then(data => setMe(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!me) return <Navigate to="/" replace />;
  if (role && me.role !== role) return <Navigate to="/" replace />;
  return children;
}