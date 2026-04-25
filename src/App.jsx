import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/home/Home";
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/home/Dashboard";
import RoomPage from "./pages/room/RoomPage";
function App() {
  return (
    <>
      <Routes>
        {/* <Route path="*" element={<Home />} /> */}
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
      </Routes>
    </>
  );
}

export default App;
