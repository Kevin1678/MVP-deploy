import "./styles.css";
import "./styles/gamesMenu.css"; // está bien si tu carpeta styles está fuera de src

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Game from "./pages/Game";
import GamesMenu from "./pages/GamesMenu";
import Protected from "./components/Protected";

import Teacher from "./pages/Teacher";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/admin"
          element={
            <Protected role="ADMIN">
              <Admin />
            </Protected>
          }
        />

        /// RUTA PARA PROFESORES
        <Route
          path="/teacher"
          element={
            <Protected role="TEACHER">
              <Teacher />
            </Protected>
          }
        />

        {/* MENU */}
        <Route
          path="/games"
          element={
            <Protected>
              <GamesMenu />
            </Protected>
          }
        />

        {/* JUEGO ACTUAL */}
        <Route
          path="/games/memorama"
          element={
            <Protected>
              <Game />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
