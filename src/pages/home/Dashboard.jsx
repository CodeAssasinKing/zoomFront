import React, { useState, useEffect } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import AddStudents from "./AddStudents";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for Teacher (Create)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // States for Student (Join)
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Modal for adding students to exact Room;
  const [openModal, setOpenModal] = useState(false);
  const [selectedRoomCode, setSelectedRoomCode] = useState("");

  const openModalWithRoomCode = (code) => {
    if (!code) {
      return;
    }
    setOpenModal(true);
    setSelectedRoomCode(code);
  };

  const fetchData = async () => {
    try {
      // Sync with your new endpoint: /rooms/get-rooms
      const [userRes, roomsRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/rooms/get-rooms"),
      ]);
      setUser(userRes.data);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      // If 404, it just means no rooms found, so we keep rooms as []
      if (err.response?.status === 404) setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler for Teacher: Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post("/rooms/create-room", { room_name: newRoomName });
      setNewRoomName("");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create room");
    }
  };

  // Handler for Student: Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setIsJoining(true);
    try {
      // Endpoint should be @router.post("/join-room/{code}")
      await api.post(`/rooms/join-room/${joinCode}`);
      setJoinCode("");
      fetchData();
      alert("Successfully joined the room!");
    } catch (err) {
      alert(err.response?.data?.detail || "Invalid room code");
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteRoom = async (code) => {
    try {
      const response = await api.delete("/rooms/delete-room", {
        params: {
          room_code: code,
        },
      });

      fetchData();
    } catch (error) {
      console.log(error);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center font-medium text-slate-500">
        Loading your dashboard...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative">
      <Navbar user={user} />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Hello, {user?.username}! 👋
          </h2>
          <p className="text-slate-500 mt-1 capitalize">Role: {user?.role}</p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h3 className="text-xl font-bold text-slate-800">Your Classes</h3>

          {user?.role === "teacher" ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              + Create New Class
            </button>
          ) : (
            <form
              onSubmit={handleJoinRoom}
              className="flex gap-2 w-full md:w-auto"
            >
              <input
                type="text"
                placeholder="Enter 10-digit code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64 transition-all"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all active:scale-95"
              >
                {isJoining ? "Joining..." : "Join"}
              </button>
            </form>
          )}
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-widest">
                    {room.code}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {room.name}
                </h4>
                <p className="text-sm text-slate-500 mb-6">
                  {user?.role === "teacher"
                    ? "You are the teacher"
                    : "Enrolled student"}
                </p>
                <Link
                  to={`/room/${room.code}`}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Enter Classroom
                </Link>
                {user?.role == "teacher" ? (
                  <>
                    <button
                      className="w-full mt-5 bg-red-900 hover:bg-red-800 text-white py-3 rounded-xl font-medium transition-colors"
                      onClick={() => handleDeleteRoom(room.code)}
                    >
                      Delete Classroom
                    </button>
                    <button
                      className="w-full mt-5 bg-green-900 hover:bg-green-800 text-white py-3 rounded-xl font-medium transition-colors"
                      onClick={() => openModalWithRoomCode(room.code)}
                    >
                      Add students to classroom
                    </button>
                  </>
                ) : (
                  ""
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400">
                No active classes found.{" "}
                {user?.role === "student"
                  ? "Try joining one!"
                  : "Create your first one!"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* CREATE ROOM MODAL (Teacher Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Create a New Room
            </h3>
            <p className="text-slate-500 mb-6">
              Give your classroom a name. Students will join using a unique
              code.
            </p>

            <form onSubmit={handleCreateRoom}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Room Name
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Physics 101"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-100"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <AddStudents
        onClose={() => setOpenModal(false)}
        isOpen={openModal}
        room_code={selectedRoomCode}
      ></AddStudents>
    </div>
  );
};

export default Dashboard;
