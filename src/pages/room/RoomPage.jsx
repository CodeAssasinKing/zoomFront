import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
import api from "../../api/api";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  X,
  Send,
  Presentation,
  Users,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import Whiteboard from "./Whiteboard";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const APP_ID = "f761c240f7164bf293c1cb58eb3c5e8d";
const TOKEN_URL = "/rooms/agora-token/";

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const fetchAgoraToken = async (channel, uid = 0) => {
  const { data } = await api.get(TOKEN_URL, { params: { channel, uid } });
  if (!data?.token) throw new Error("Backend returned no Agora token");
  return { token: data.token, uid: data.uid ?? uid };
};

const ssGet = (key) => {
  try {
    return sessionStorage.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const getLocalUsername = () => ssGet("username") ?? "You";
const getLocalRole = () => ssGet("role") ?? "student";

const fetchUsernameForUid = async (uid) => {
  try {
    const res = await fetch(`/chat/get_username_by_uid/?uid=${uid}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.username || String(uid);
  } catch {
    return String(uid);
  }
};

/**
 * Reliably play an Agora track into a DOM element by id.
 *
 * Problem: after a tab switch the element exists in the DOM but Agora’s
 * internal player may have detached. We must call .play() again.
 * requestAnimationFrame alone isn’t enough — React may not have committed
 * the DOM yet (especially on initial mount right after setLoading(false)).
 *
 * Solution: poll for the element with exponential back-off, then play.
 * Stops after ~3 seconds to avoid leaking on unmount.
 */
const playTrackInElement = (track, elementId, maxAttempts = 20) => {
  if (!track) return;
  let attempts = 0;

  const tryPlay = () => {
    attempts++;
    const el = document.getElementById(elementId);
    if (el) {
      // Element exists — tell Agora to render into it
      try {
        track.play(elementId);
      } catch {}
      return;
    }
    if (attempts < maxAttempts) {
      // Back-off: 50ms → 100ms → 150ms …
      setTimeout(tryPlay, Math.min(50 * attempts, 300));
    }
  };

  // First attempt after one paint
  requestAnimationFrame(tryPlay);
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK — useAgoraRoom
// ══════════════════════════════════════════════════════════════════════════════

function useAgoraRoom(roomCode) {
  const clientRef = useRef(null);
  const localTracksRef = useRef([]);
  const screenTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const hasJoinedRef = useRef(false);
  const hasLeftRef = useRef(false);
  const socketRef = useRef(null); // still useful for whiteboard
  const [wsInstance, setWsInstance] = useState(null); // triggers re-render

  const [me, setMe] = useState(null);
  const [remoteVideos, setRemoteVideos] = useState([]);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connState, setConnState] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Helper: get a local track by Agora media type ────────────────────────
  const getLocalTrack = (type) =>
    localTracksRef.current.find((t) => t?.trackMediaType === type) ?? null;

  // ── Re‑play all active video tracks into their containers ────────────────
  const replayAllTracks = useCallback(() => {
    const screenTrack = screenTrackRef.current;
    if (screenTrack) {
      playTrackInElement(screenTrack, "local-video");
    } else {
      const cam = getLocalTrack("video");
      if (cam) playTrackInElement(cam, "local-video");
    }
    for (const [uid, agoraUser] of Object.entries(remoteUsersRef.current)) {
      if (agoraUser?.videoTrack) {
        playTrackInElement(agoraUser.videoTrack, `remote-video-${uid}`);
      }
    }
  }, []);

  // ── Agora event handlers ─────────────────────────────────────────────────
  const handleUserPublished = useCallback(async (agoraUser, mediaType) => {
    const client = clientRef.current;
    if (!client) return;
    remoteUsersRef.current[agoraUser.uid] = agoraUser;
    await client.subscribe(agoraUser, mediaType);

    if (mediaType === "video") {
      const username = await fetchUsernameForUid(agoraUser.uid);
      setRemoteVideos((prev) => {
        const rest = prev.filter((u) => u.uid !== agoraUser.uid);
        return [...rest, { uid: agoraUser.uid, username }];
      });
      playTrackInElement(agoraUser.videoTrack, `remote-video-${agoraUser.uid}`);
    }
    if (mediaType === "audio") {
      agoraUser.audioTrack?.play();
    }
  }, []);

  const handleUserUnpublished = useCallback((agoraUser, mediaType) => {
    if (mediaType === "video") {
      setRemoteVideos((prev) => prev.filter((u) => u.uid !== agoraUser.uid));
    }
  }, []);

  const handleUserLeft = useCallback((agoraUser) => {
    delete remoteUsersRef.current[agoraUser.uid];
    setRemoteVideos((prev) => prev.filter((u) => u.uid !== agoraUser.uid));
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    for (const t of localTracksRef.current) {
      try {
        t.stop();
        t.close();
      } catch {}
    }
    localTracksRef.current = [];
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
      } catch {}
      screenTrackRef.current = null;
    }
    const client = clientRef.current;
    if (client) {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
      try {
        await client.leave();
      } catch {}
    }
    socketRef.current?.close();
    setWsInstance(null);
  }, [handleUserPublished, handleUserUnpublished, handleUserLeft]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const boot = async () => {
      try {
        // 1. Resolve user
        let currentUser = {
          id: ssGet("UID") ?? ssGet("user_id"),
          username: getLocalUsername(),
          role: getLocalRole(),
        };
        try {
          const { data } = await api.get("/auth/me");
          currentUser = {
            id: data.id ?? currentUser.id,
            username: data.username ?? currentUser.username,
            email: data.email ?? null,
            role: (data.role ?? currentUser.role).toLowerCase(),
          };
        } catch {}
        setMe(currentUser);

        // 2. WebSocket – create and store both ref and state
        const wsBase = (import.meta.env.VITE_API_WS_URL ?? "").replace(
          /^https?:\/\//,
          "",
        );
        if (wsBase && currentUser.id) {
          const ws = new WebSocket(
            `wss://${wsBase}/ws/${roomCode}/${currentUser.id}`,
          );
          socketRef.current = ws;
          setWsInstance(ws); // triggers chat useEffect
        }

        // 3. Agora handlers BEFORE joining
        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);
        client.on("user-left", handleUserLeft);

        // 4. Token + join
        const { token, uid: resolvedUid } = await fetchAgoraToken(roomCode, 0);
        await client.join(APP_ID, roomCode, token, resolvedUid || null);

        // 5. Create tracks – fail individually so one denial can’t block the other
        let micTrack = null;
        let camTrack = null;
        try {
          [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { AEC: true, AGC: true, ANS: true },
            { encoderConfig: "720p_1", facingMode: "user" },
          );
        } catch {
          try {
            micTrack = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              AGC: true,
              ANS: true,
            });
          } catch {}
          try {
            camTrack = await AgoraRTC.createCameraVideoTrack({
              encoderConfig: "720p_1",
            });
          } catch {}
        }

        localTracksRef.current = [micTrack, camTrack].filter(Boolean);

        // 6. Publish first, THEN play
        const toPublish = localTracksRef.current;
        if (toPublish.length) await client.publish(toPublish);

        setConnState("live");
        setLoading(false);
        if (camTrack) {
          playTrackInElement(camTrack, "local-video");
        }
      } catch (err) {
        console.error("[RoomPage] Boot error:", err);
        setErrorMsg(err?.message ?? "Unknown error joining room");
        setConnState("error");
        setLoading(false);
      }
    };

    boot();
    return () => {
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle audio ──────────────────────────────────────────────────────────
  const toggleAudio = useCallback(async () => {
    const mic = getLocalTrack("audio");
    if (!mic) return;
    const next = !audioMuted;
    await mic.setMuted(next);
    setAudioMuted(next);
  }, [audioMuted]);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleVideo = useCallback(async () => {
    if (screenSharing) return;
    const cam = getLocalTrack("video");
    if (!cam) return;
    const next = !videoOff;
    await cam.setMuted(next);
    if (!next) playTrackInElement(cam, "local-video");
    setVideoOff(next);
  }, [videoOff, screenSharing]);

  // ── Toggle screen share ───────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const cam = getLocalTrack("video");

    if (!screenSharing) {
      try {
        if (cam) {
          await cam.setMuted(true);
          await client.unpublish([cam]).catch(() => {});
        }
        const sTrack = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: "1080p_1" },
          "disable",
        );
        screenTrackRef.current = sTrack;
        await client.publish([sTrack]);
        playTrackInElement(sTrack, "local-video");
        sTrack.on("track-ended", () => toggleScreenShare());
        setScreenSharing(true);
        setVideoOff(false);
      } catch (err) {
        console.error("[RoomPage] Screen share start error:", err);
        if (cam) {
          await cam.setMuted(false).catch(() => {});
          await client.publish([cam]).catch(() => {});
          playTrackInElement(cam, "local-video");
        }
      }
    } else {
      const sTrack = screenTrackRef.current;
      if (sTrack) {
        sTrack.off("track-ended");
        await client.unpublish([sTrack]).catch(() => {});
        sTrack.stop();
        sTrack.close();
        screenTrackRef.current = null;
      }
      if (cam) {
        await cam.setMuted(false).catch(() => {});
        await client.publish([cam]).catch(() => {});
        playTrackInElement(cam, "local-video");
      }
      setScreenSharing(false);
      setVideoOff(false);
    }
  }, [screenSharing]);

  return {
    socket: socketRef, // ref used for Whiteboard props
    wsInstance, // state used for chat listener
    me,
    remoteVideos,
    audioMuted,
    videoOff,
    screenSharing,
    connState,
    errorMsg,
    loading,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    replayAllTracks,
    cleanup,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const RoomPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const {
    socket, // ref
    wsInstance, // state – triggers chat effect
    me,
    remoteVideos,
    audioMuted,
    videoOff,
    screenSharing,
    connState,
    errorMsg,
    loading,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    replayAllTracks,
    cleanup,
  } = useAgoraRoom(roomCode);

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("video");

  // ── Chat listener – now depends on wsInstance state ────────────────────────
  useEffect(() => {
    if (!wsInstance) return;

    const onMessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type === "chat") {
        setMessages((prev) => [...prev, data]);
        setUnreadCount((n) => n + 1);
      } else if (data.type === "system") {
        setMessages((prev) => [
          ...prev,
          { type: "system", content: data.content },
        ]);
      }
    };

    wsInstance.addEventListener("message", onMessage);
    return () => wsInstance.removeEventListener("message", onMessage);
  }, [wsInstance]); // ✅ runs when WebSocket is ready

  // ── Auto‑scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, chatOpen]);

  // ── Re‑play video tracks when switching back to video tab ─────────────────
  const prevTabRef = useRef("video");
  useEffect(() => {
    const wasBoard = prevTabRef.current === "board";
    prevTabRef.current = activeTab;
    if (activeTab === "video" && wasBoard) {
      setTimeout(replayAllTracks, 80);
    }
  }, [activeTab, replayAllTracks]);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    await cleanup();
    navigate("/dashboard");
  }, [cleanup, navigate]);

  // ── Send chat ─────────────────────────────────────────────────────────────
  const sendChat = useCallback(() => {
    const content = chatInput.trim();
    if (!content || socket.current?.readyState !== WebSocket.OPEN) return;
    const sender = me?.username ?? getLocalUsername();
    const msg = { type: "chat", content, sender };
    socket.current.send(JSON.stringify(msg));
    setMessages((prev) => [...prev, { ...msg, isSelf: true }]);
    setChatInput("");
  }, [chatInput, me, socket]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const totalVideos = 1 + remoteVideos.length;
  const gridCols =
    totalVideos <= 1
      ? "grid-cols-1"
      : totalVideos === 2
        ? "grid-cols-2"
        : totalVideos <= 4
          ? "grid-cols-2"
          : "grid-cols-3";

  const displayName = me?.username ?? getLocalUsername();
  const displayRole = me?.role ?? getLocalRole();
  const isTeacher = displayRole === "teacher";

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="h-screen bg-[#050508] flex flex-col items-center justify-center text-white gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-indigo-500/40 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border border-indigo-500/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-slate-400">
            Joining Room
          </p>
          <p className="text-[10px] font-mono text-slate-600">{roomCode}</p>
          <p className="text-[10px] text-slate-700 mt-2">
            Authenticating with Agora…
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR
  // ══════════════════════════════════════════════════════════════════════════
  if (connState === "error") {
    return (
      <div className="h-screen bg-[#050508] flex flex-col items-center justify-center text-white gap-6 px-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <WifiOff size={28} className="text-rose-500" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <p className="text-sm font-bold text-slate-200">
            Failed to join room
          </p>
          {errorMsg && (
            <p className="text-xs text-rose-400/90 font-mono bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
              {errorMsg}
            </p>
          )}
          <p className="text-xs text-slate-600">
            Verify your Agora App Certificate is configured and the backend is
            reachable.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN UI
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="h-screen bg-[#050508] text-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/3 w-[600px] h-[600px] bg-indigo-900/20 blur-[160px] rounded-full" />
        <div className="absolute -bottom-64 right-1/3 w-[500px] h-[500px] bg-violet-900/15 blur-[160px] rounded-full" />
      </div>

      {/* ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="relative z-30 shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/[0.05] bg-[#050508]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-[11px] select-none shadow-lg shadow-indigo-500/30">
              C
            </div>
            <span className="text-sm font-black tracking-tight hidden lg:block text-white/90">
              ClassRoom
            </span>
          </div>

          <div className="w-px h-4 bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="hidden sm:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Room
            </span>
            <span className="text-[11px] font-black font-mono text-slate-300">
              {roomCode}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
              connState === "live"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : connState === "error"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {connState === "live" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi size={11} />
                LIVE
              </>
            )}
            {connState === "error" && (
              <>
                <WifiOff size={11} />
                Error
              </>
            )}
            {connState === "connecting" && (
              <>
                <Loader2 size={11} className="animate-spin" />
                Connecting
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <Users size={12} />
            <span>{totalVideos}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-white/[0.04] border border-white/[0.07] p-0.5 rounded-xl gap-0.5">
            <TabBtn
              active={activeTab === "video"}
              onClick={() => setActiveTab("video")}
              icon={<Video size={12} />}
              label="Video"
            />
            <TabBtn
              active={activeTab === "board"}
              onClick={() => setActiveTab("board")}
              icon={<Presentation size={12} />}
              label="Board"
            />
          </div>

          <button
            onClick={() => {
              setChatOpen((o) => !o);
              setUnreadCount(0);
            }}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
              chatOpen
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <MessageSquare size={15} />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-black flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={leaveRoom}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all group"
          >
            <PhoneOff
              size={13}
              className="group-hover:rotate-12 transition-transform"
            />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ━━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative z-10 flex flex-1 overflow-hidden p-3 gap-3">
        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Video panel – always mounted, hidden when board is active */}
          <div
            className={`flex-1 flex flex-col gap-3 min-h-0 ${activeTab === "board" ? "hidden" : ""}`}
          >
            <div
              className={`flex-1 grid grid-cols-1 lg:${gridCols} md:${gridCols} gap-3 min-h-0`}
            >
              {/* Local tile */}
              <VideoTile
                id="local-video"
                name={displayName}
                role={displayRole}
                isLocal
                videoOff={videoOff && !screenSharing}
                audioMuted={audioMuted}
                screenSharing={screenSharing}
              />

              {/* Remote tiles */}
              {remoteVideos.map(({ uid, username }) => (
                <VideoTile
                  key={uid}
                  id={`remote-video-${uid}`}
                  name={username}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="shrink-0 flex items-center justify-center gap-2 py-1">
              <CtrlBtn
                active={audioMuted}
                danger={audioMuted}
                onClick={toggleAudio}
                title={audioMuted ? "Unmute" : "Mute"}
                icon={audioMuted ? <MicOff size={17} /> : <Mic size={17} />}
              />
              <CtrlBtn
                active={videoOff}
                danger={videoOff}
                disabled={screenSharing}
                onClick={toggleVideo}
                title={videoOff ? "Camera on" : "Camera off"}
                icon={videoOff ? <VideoOff size={17} /> : <Video size={17} />}
              />
              <CtrlBtn
                active={screenSharing}
                onClick={toggleScreenShare}
                title={screenSharing ? "Stop sharing" : "Share screen"}
                icon={
                  screenSharing ? (
                    <MonitorOff size={17} />
                  ) : (
                    <Monitor size={17} />
                  )
                }
              />
              <div className="w-px h-8 bg-white/[0.07] mx-1" />
              <CtrlBtn
                danger
                onClick={leaveRoom}
                title="Leave room"
                icon={<PhoneOff size={17} />}
                className="!bg-rose-600 !border-rose-500 hover:!bg-rose-500"
              />
            </div>
          </div>

          {/* Board panel – always mounted, hidden when video is active */}
          <div
            className={`flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/[0.06] ${activeTab === "video" ? "hidden" : ""}`}
          >
            <Whiteboard
              socket={socket}
              isTeacher={isTeacher}
              roomCode={roomCode}
            />
          </div>
        </div>

        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <div
          className={`
					fixed inset-0 z-50 pointer-events-none
					md:relative md:inset-auto md:z-auto md:pointer-events-auto
					md:w-72 md:shrink-0 md:flex md:flex-col
				`}
        >
          {chatOpen && (
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto md:hidden"
              onClick={() => setChatOpen(false)}
            />
          )}

          <div
            className={`
						pointer-events-auto
						absolute right-0 top-0 bottom-0 w-[85vw] max-w-xs
						md:relative md:w-full md:max-w-none md:h-full
						flex flex-col
						bg-[#0c0c14]/98 backdrop-blur-xl
						border-l border-white/[0.06]
						md:rounded-2xl md:border md:border-white/[0.06]
						shadow-2xl overflow-hidden
						transition-transform duration-300 ease-out will-change-transform
						${chatOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
					`}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">
                Class Chat
              </span>
              <span className="ml-auto text-[10px] text-slate-600 font-semibold">
                {messages.filter((m) => m.type === "chat").length} msgs
              </span>
              <button
                onClick={() => setChatOpen(false)}
                className="md:hidden w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center ml-1 transition-all"
              >
                <X size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                  <MessageSquare size={28} className="text-slate-700" />
                  <p className="text-xs text-slate-600 text-center">
                    No messages yet.
                    <br />
                    Say hello to the class!
                  </p>
                </div>
              )}
              {messages.map((m, i) => {
                if (m.type === "system") {
                  return (
                    <div key={i} className="flex justify-center">
                      <span className="text-[10px] text-slate-600 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full">
                        {m.content}
                      </span>
                    </div>
                  );
                }
                const isSelf =
                  m.isSelf || m.sender === (me?.username ?? getLocalUsername());
                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wide px-1">
                      {isSelf ? "You" : m.sender}
                    </span>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl max-w-[88%] text-[13px] leading-relaxed ${
                        isSelf
                          ? "bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20"
                          : "bg-white/[0.06] text-slate-200 rounded-tl-sm border border-white/[0.06]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06] flex gap-2 shrink-0">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                placeholder="Message class…"
                maxLength={500}
                className="flex-1 bg-white/[0.05] border border-white/[0.07] focus:border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-600 font-medium text-slate-200"
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim()}
                className="w-10 h-10 shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-indigo-500/30"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const VideoTile = ({
  id,
  name,
  role,
  isLocal = false,
  videoOff = false,
  audioMuted = false,
  screenSharing = false,
}) => (
  <div className="relative bg-[#0d0d18] rounded-2xl border border-white/[0.05] overflow-hidden flex items-center justify-center min-h-[140px] group">
    <div
      id={id}
      className="absolute inset-0 w-full h-full"
      style={{ display: videoOff ? "none" : "block" }}
    />

    {videoOff && (
      <div className="flex flex-col items-center gap-2 z-10 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-xl font-black text-slate-300">
          {name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <p className="text-[10px] text-slate-500 font-semibold">Camera off</p>
      </div>
    )}

    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-10" />
    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
      <span className="text-[11px] font-bold text-white/90 truncate max-w-[110px] drop-shadow">
        {name}
      </span>
      {role && (
        <span className="text-[9px] text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded-full capitalize font-bold">
          {role}
        </span>
      )}
    </div>

    {audioMuted && (
      <div className="absolute top-3 right-3 bg-rose-600/90 backdrop-blur rounded-full p-1.5 z-20">
        <MicOff size={10} />
      </div>
    )}

    {screenSharing && (
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-600/90 backdrop-blur px-2.5 py-1 rounded-full z-20">
        <Monitor size={10} />
        <span className="text-[9px] font-bold">Sharing</span>
      </div>
    )}

    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/0 group-hover:ring-white/10 transition-all pointer-events-none z-20" />
  </div>
);

const CtrlBtn = ({
  icon,
  title,
  onClick,
  active,
  danger,
  disabled,
  className = "",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
			w-11 h-11 rounded-full flex items-center justify-center border
			transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
			${
        danger && active
          ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30"
          : active
            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30"
            : "bg-white/[0.06] border-white/[0.08] text-slate-300 hover:bg-white/[0.12] hover:text-white"
      }
			${className}
		`}
  >
    {icon}
  </button>
);

const TabBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
        : "text-slate-500 hover:text-white"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default RoomPage;
