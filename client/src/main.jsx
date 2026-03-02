import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Game from "./pages/Game";
import Protected from "./components/Protected";

const theme = localStorage.getItem("pref_theme") || "soft";
const text = localStorage.getItem("pref_text_size") || "normal";

document.body.classList.toggle("theme-high", theme === "high");
document.body.classList.toggle("text-large", text === "large");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Protected role="ADMIN"><Admin /></Protected>} />
        <Route path="/games" element={<Protected><Game /></Protected>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
