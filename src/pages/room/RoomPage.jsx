import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

const RoomPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  // Video & WebRTC Refs
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStream = useRef(null);

  // UI State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    const setupRoom = async () => {
      try {
        // 1. Get User Info
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);

        // 2. Get Media with error handling
        try {
          localStream.current = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream.current;
          }
        } catch (mediaErr) {
          console.warn("Camera access denied or busy:", mediaErr);
          setCameraError(true);
        }

        // 3. Initialize WebSocket
        const wsUrl = `ws://127.0.0.1:8000/ws/${roomCode}/${userRes.data.id}`;
        socket.current = new WebSocket(wsUrl);

        socket.current.onopen = () => {
          console.log("WebSocket Connected ✅");
          setLoading(false);
        };

        socket.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          handleSignalingData(data, userRes.data);
        };

        socket.current.onerror = (err) =>
          console.error("WebSocket Error:", err);
      } catch (err) {
        console.error("Setup failed:", err);
        navigate("/dashboard");
      }
    };

    setupRoom();

    return () => {
      socket.current?.close();
      if (peerConnection.current) peerConnection.current.close();
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomCode, navigate]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks if they exist
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({ type: "candidate", candidate: event.candidate }),
        );
      }
    };

    return pc;
  };

  const handleSignalingData = async (data, currentUser) => {
    switch (data.type) {
      case "system":
        if (
          data.content.includes("joined") &&
          currentUser?.role === "teacher"
        ) {
          initiateCall();
        }
        break;

      case "offer":
        if (peerConnection.current) peerConnection.current.close();
        peerConnection.current = createPeerConnection();
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer),
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current.send(JSON.stringify({ type: "answer", answer }));
        break;

      case "answer":
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
        }
        break;

      case "candidate":
        if (peerConnection.current) {
          try {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(data.candidate),
            );
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
        break;

      case "chat":
        setMessages((prev) => [...prev, data]);
        break;

      default:
        break;
    }
  };

  const initiateCall = async () => {
    peerConnection.current = createPeerConnection();
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.current.send(JSON.stringify({ type: "offer", offer }));
  };

  const sendChatMessage = () => {
    if (
      !input.trim() ||
      !socket.current ||
      socket.current.readyState !== WebSocket.OPEN
    )
      return;

    const msg = {
      type: "chat",
      content: input,
      sender: user?.username || "Unknown",
    };
    socket.current.send(JSON.stringify(msg));
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  if (loading)
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-bold">
        Connecting to classroom...
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      <div className="flex-grow p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
            Room: <span className="text-blue-400">{roomCode}</span>
          </h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-xl font-bold"
          >
            Leave
          </button>
        </div>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Video */}
          <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-500">
            {cameraError ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-center p-4">
                Camera busy or unavailable.
                <br />
                Webcam can't be shared across two tabs.
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs uppercase font-bold">
              You ({user?.role})
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!remoteVideoRef.current?.srcObject && (
              <p className="text-slate-500 animate-pulse">
                Waiting for participant...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="w-96 bg-slate-800 flex flex-col shadow-2xl border-l border-slate-700">
        <div className="p-4 border-b border-slate-700 font-bold">
          Class Chat
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === user?.username ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-slate-400 uppercase font-bold mb-1 px-2">
                {m.sender}
              </span>
              <div
                className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.sender === user?.username ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-200"}`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-900 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            placeholder="Type a message..."
            className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500"
          />
          <button
            onClick={sendChatMessage}
            className="bg-blue-600 p-2 rounded-xl hover:bg-blue-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
