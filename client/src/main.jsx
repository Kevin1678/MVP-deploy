import "./styles.css";
import "./styles/gamesMenu.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Game from "./pages/Game";
import GamesMenu from "./pages/GamesMenu";
import Protected from "./components/Protected";
import GameCount from "./pages/GameCount";
import GameLights from "./pages/GameLights";
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

        {/* RUTA PARA PROFESORES */}
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

        {/* MEMORAMA */}
        <Route
          path="/games/memorama"
          element={
            <Protected>
              <Game />
            </Protected>
          }
        />

        {/* CONTAR */}
        <Route
          path="/games/contar"
          element={
            <Protected>
              <GameCount />
            </Protected>
          }
        />

        {/* LUCES */}
        <Route
          path="/games/lights"
          element={
            <Protected>
              <GameLights />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
