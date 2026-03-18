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
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherParents from "./pages/TeacherParents";
import Parent from "./pages/Parent";
import ParentDashboard from "./pages/ParentDashboard";
import ParentChildren from "./pages/ParentChildren";

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

        <Route
          path="/teacher"
          element={
            <Protected role="TEACHER">
              <Teacher />
            </Protected>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="parents" element={<TeacherParents />} />
        </Route>

        <Route
          path="/parent"
          element={
            <Protected role="PARENT">
              <Parent />
            </Protected>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="children" element={<ParentChildren />} />
        </Route>

        <Route
          path="/games"
          element={
            <Protected role="STUDENT">
              <GamesMenu />
            </Protected>
          }
        />

        <Route
          path="/games/memorama"
          element={
            <Protected role="STUDENT">
              <Game />
            </Protected>
          }
        />

        <Route
          path="/games/contar"
          element={
            <Protected role="STUDENT">
              <GameCount />
            </Protected>
          }
        />

        <Route
          path="/games/lights"
          element={
            <Protected role="STUDENT">
              <GameLights />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
