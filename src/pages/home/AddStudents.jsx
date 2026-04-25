import React, { useEffect, useState } from "react";
import api from "../../api/api";

function AddStudents({ room_code, onClose, isOpen }) {
  const [listOfStudents, setListOfStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      const response = await api.get("/users/students");
      setListOfStudents(response.data);
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      setSelectedIds([]); // Сбрасываем выбор при открытии
    }
  }, [isOpen]);

  const toggleStudent = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((sIroom_coded) => sId !== id)
        : [...prev, id],
    );
  };

  const handleAddStudents = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await api.post(`/rooms/add-students/${room_code}`, selectedIds);
      alert("Students added successfully!");
      onClose();
    } catch (err) {
      alert("Error adding students");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-2xl font-bold text-slate-900">Add Students</h3>
          <p className="text-slate-500 text-sm mt-1">
            Room Code:{" "}
            <span className="font-mono font-bold text-blue-600">
              {room_code}
            </span>
          </p>
        </div>

        {/* Student List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {listOfStudents.length > 0 ? (
            listOfStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedIds.includes(student.id)
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">
                    {student.username}
                  </span>
                  <span className="text-xs text-slate-500">
                    {student.email}
                  </span>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(student.id)
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedIds.includes(student.id) && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 py-10">
              No students found.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddStudents}
            disabled={selectedIds.length === 0 || loading}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            {loading ? "Adding..." : `Add ${selectedIds.length} Students`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddStudents;
