import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AgoraRTC from 'agora-rtc-sdk-ng'
import api from '../../api/api'
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
	Video as VideoIcon,
	Presentation,
	Users,
	Wifi,
	WifiOff,
	Loader2,
} from 'lucide-react'
import Whiteboard from './Whiteboard'

// ─────────────────────────────────────────────────────────────────────────────
// Your FastAPI router is:  prefix="/rooms"  →  GET /rooms/agora-token/
// ─────────────────────────────────────────────────────────────────────────────
const APP_ID = 'f761c240f7164bf293c1cb58eb3c5e8d'
const TOKEN_URL = '/rooms/agora-token/'

// Fetch a fresh RTC token from your FastAPI backend before every join.
// This is what fixes CAN_NOT_GET_GATEWAY_SERVER — we never use a stale
// or null token when the project has App Certificate enabled.
const fetchAgoraToken = async (channel, uid = 0) => {
	const qs = new URLSearchParams({ channel, uid: String(uid) })
	// CORRECT — axios auto-parses JSON, data is already the object
	const { data } = await api.get(TOKEN_URL, { params: { channel, uid } })
	if (!data?.token) throw new Error('Backend returned no token')
	return { token: data.token, uid: data.uid ?? uid }
}

// sessionStorage helpers — same keys your original chat.js used
const ssGet = key => sessionStorage.getItem(key) ?? null
const getName = () => ssGet('username') ?? 'Unknown'

// ─────────────────────────────────────────────────────────────────────────────
const RoomPage = () => {
	const { roomCode } = useParams()
	const navigate = useNavigate()

	// Agora refs — created inside the effect, never at module level
	// (module-level singletons break React StrictMode double-mount)
	const clientRef = useRef(null)
	const localTracksRef = useRef([]) // [micTrack, camTrack]
	const screenTrackRef = useRef(null)
	const remoteUsersRef = useRef({}) // uid → AgoraRTCRemoteUser
	const myUidRef = useRef(null) // numeric UID assigned by Agora

	// WebSocket ref (chat + whiteboard draw signals)
	const socket = useRef(null)
	const messagesEndRef = useRef(null)

	// Prevent double-join in React StrictMode
	const hasJoined = useRef(false)
	const hasLeft = useRef(false)

	// ── UI state ──────────────────────────────────────────────────────────────
	const [remoteVideos, setRemoteVideos] = useState([]) // [{ uid, username }]
	const [messages, setMessages] = useState([])
	const [input, setInput] = useState('')
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [errorMsg, setErrorMsg] = useState('')
	const [audioMuted, setAudioMuted] = useState(false)
	const [videoOff, setVideoOff] = useState(false)
	const [screenSharing, setScreenSharing] = useState(false)
	const [chatOpen, setChatOpen] = useState(false)
	const [unreadCount, setUnreadCount] = useState(0)
	const [activeTab, setActiveTab] = useState('video')
	const [connState, setConnState] = useState('connecting')

	// ── Auto-scroll chat ───────────────────────────────────────────────────────
	useEffect(() => {
		if (chatOpen) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
			setUnreadCount(0)
		}
	}, [messages, chatOpen])

	// ── Resolve display name for a remote Agora UID ───────────────────────────
	const fetchUsername = async uid => {
		try {
			const res = await fetch(`/chat/get_username_by_uid/?uid=${uid}`)
			const data = await res.json()
			return data.username || String(uid)
		} catch {
			return String(uid)
		}
	}

	// ── Remote user published a track ─────────────────────────────────────────
	const handleUserJoin = useCallback(async (agoraUser, mediaType) => {
		const client = clientRef.current
		if (!client) return

		remoteUsersRef.current[agoraUser.uid] = agoraUser
		await client.subscribe(agoraUser, mediaType)

		if (mediaType === 'video') {
			const username = await fetchUsername(agoraUser.uid)
			setRemoteVideos(prev => {
				const rest = prev.filter(u => u.uid !== agoraUser.uid)
				return [...rest, { uid: agoraUser.uid, username }]
			})
			// Give React one frame to render the container div, then play into it
			requestAnimationFrame(() => {
				agoraUser.videoTrack?.play(`remote-video-${agoraUser.uid}`)
			})
		}
		if (mediaType === 'audio') {
			agoraUser.audioTrack?.play()
		}
	}, [])

	// ── Remote user left ──────────────────────────────────────────────────────
	const handleUserLeft = useCallback(async agoraUser => {
		delete remoteUsersRef.current[agoraUser.uid]
		setRemoteVideos(prev => prev.filter(u => u.uid !== agoraUser.uid))
	}, [])

	// ── Idempotent cleanup ────────────────────────────────────────────────────
	const cleanup = useCallback(async () => {
		if (hasLeft.current) return
		hasLeft.current = true

		const client = clientRef.current

		localTracksRef.current.forEach(t => {
			try {
				t.stop()
				t.close()
			} catch {}
		})
		localTracksRef.current = []

		if (screenTrackRef.current) {
			try {
				screenTrackRef.current.stop()
				screenTrackRef.current.close()
			} catch {}
			screenTrackRef.current = null
		}

		if (client) {
			client.off('user-published', handleUserJoin)
			client.off('user-left', handleUserLeft)
			try {
				await client.leave()
			} catch {}
		}

		socket.current?.close()
	}, [handleUserJoin, handleUserLeft])

	// ── Leave room ────────────────────────────────────────────────────────────
	const leaveRoom = useCallback(async () => {
		await cleanup()
		navigate('/dashboard')
	}, [cleanup, navigate])

	// ── Bootstrap — runs exactly once per mount ────────────────────────────────
	useEffect(() => {
		// StrictMode calls effects twice in dev; guard with a ref
		if (hasJoined.current) return
		hasJoined.current = true

		// Fresh Agora client for this component instance
		const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
		clientRef.current = client

		const boot = async () => {
			try {
				// ── Step 1: Resolve current user ──────────────────────────────────
				let me = {
					id: ssGet('UID'),
					username: getName(),
					role: ssGet('role') ?? 'student',
				}
				try {
					const { default: api } = await import('../../api/api')
					const res = await api.get('/auth/me')
					me = res.data
				} catch {
					// No API available — fall back to sessionStorage values
				}
				setUser(me)

				// ── Step 2: WebSocket for chat + whiteboard ───────────────────────
				const rawWsBase = (import.meta.env.VITE_API_WS_URL ?? '').replace(
					/^https?:\/\//,
					'',
				)
				if (rawWsBase && me?.id) {
					const ws = new WebSocket(`wss://${rawWsBase}/ws/${roomCode}/${me.id}`)
					socket.current = ws
					ws.onmessage = event => {
						try {
							const data = JSON.parse(event.data)
							if (data.type === 'chat') {
								setMessages(prev => [...prev, data])
								setUnreadCount(n => n + 1)
							} else if (data.type === 'system') {
								setMessages(prev => [
									...prev,
									{ type: 'system', content: data.content },
								])
							}
							// draw_stroke / draw_shape / clear_board are
							// consumed directly by <Whiteboard> via the socket ref
						} catch {}
					}
				}

				// ── Step 3: Attach Agora event handlers ───────────────────────────
				client.on('user-published', handleUserJoin)
				client.on('user-left', handleUserLeft)

				// ── Step 4: Fetch fresh RTC token from your FastAPI backend ────────
				//
				// This is the critical fix.
				// Your endpoint: GET /rooms/agora-token/?channel=<name>&uid=0
				// Returns:       { token: "007eJx...", uid: 0, channel: "..." }
				//
				// We always fetch a fresh token — never use a cached/sessionStorage
				// one, because Agora tokens expire and using a stale token causes
				// CAN_NOT_GET_GATEWAY_SERVER.
				//
				// uid=0 tells Agora to auto-assign a numeric UID, which is returned
				// in the join() promise. We store it in myUidRef so screen share
				// and other per-user logic can reference it.
				const channel = roomCode
				const { token, uid: resolvedUid } = await fetchAgoraToken(channel, 0)

				const assignedUid = await client.join(
					APP_ID,
					channel,
					token,
					resolvedUid || null,
				)
				myUidRef.current = assignedUid

				// ── Step 5: Create microphone + camera tracks ──────────────────────
				const [micTrack, camTrack] =
					await AgoraRTC.createMicrophoneAndCameraTracks(
						{
							// Audio processing — same as your original chat.js
							AEC: true, // Acoustic Echo Cancellation
							AGC: true, // Automatic Gain Control
							ANS: true, // Automatic Noise Suppression
						},
						{
							encoderConfig: '720p_1',
							facingMode: 'user',
						},
					)

				localTracksRef.current = [micTrack, camTrack]

				// Play local video into its container div
				requestAnimationFrame(() => camTrack.play('local-video'))

				// ── Step 6: Publish to channel ──────────────────────────────────
				await client.publish([micTrack, camTrack])

				setConnState('live')
				setLoading(false)
			} catch (err) {
				console.error('[RoomPage] Boot error:', err)
				setErrorMsg(err?.message ?? 'Unknown error')
				setConnState('error')
				setLoading(false)
			}
		}

		boot()
		return () => {
			cleanup()
		}
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	// ── Toggle microphone ──────────────────────────────────────────────────────
	const toggleAudio = async () => {
		const mic = localTracksRef.current[0]
		if (!mic) return
		const next = !audioMuted
		await mic.setMuted(next)
		setAudioMuted(next)
	}

	// ── Toggle camera ──────────────────────────────────────────────────────────
	const toggleVideo = async () => {
		const cam = localTracksRef.current[1]
		if (!cam || screenSharing) return
		const next = !videoOff
		await cam.setMuted(next)
		setVideoOff(next)
	}

	// ── Screen share — mirrors your original toggleScreenShare logic ───────────
	const toggleScreenShare = async () => {
		const client = clientRef.current
		if (!client) return

		if (!screenSharing) {
			try {
				const cam = localTracksRef.current[1]
				await cam.setMuted(true)
				await client.unpublish([cam])

				const sTrack = await AgoraRTC.createScreenVideoTrack(
					{ encoderConfig: '1080p_1' },
					'disable',
				)
				screenTrackRef.current = sTrack
				await client.publish([sTrack])

				requestAnimationFrame(() => sTrack.play('local-video'))

				// Handle user clicking browser's native "Stop sharing" button
				sTrack.on('track-ended', () => toggleScreenShare())

				setScreenSharing(true)
				setVideoOff(false)
			} catch (err) {
				console.error('[RoomPage] Screen share error:', err)
				// Restore camera if screen share was denied / failed
				const cam = localTracksRef.current[1]
				if (cam) {
					await cam.setMuted(false).catch(() => {})
					await client.publish([cam]).catch(() => {})
					requestAnimationFrame(() => cam.play('local-video'))
				}
			}
		} else {
			const sTrack = screenTrackRef.current
			const cam = localTracksRef.current[1]

			if (sTrack) {
				sTrack.off('track-ended')
				await client.unpublish([sTrack]).catch(() => {})
				sTrack.stop()
				sTrack.close()
				screenTrackRef.current = null
			}

			if (cam) {
				await cam.setMuted(false).catch(() => {})
				await client.publish([cam]).catch(() => {})
				requestAnimationFrame(() => cam.play('local-video'))
			}

			setScreenSharing(false)
			setVideoOff(false)
		}
	}

	// ── Send chat message ──────────────────────────────────────────────────────
	const sendChat = () => {
		const content = input.trim()
		if (!content || socket.current?.readyState !== WebSocket.OPEN) return
		const sender = user?.username ?? getName()
		const msg = { type: 'chat', content, sender }
		socket.current.send(JSON.stringify(msg))
		setMessages(prev => [...prev, { ...msg, isSelf: true }])
		setInput('')
	}

	// ── Video grid column layout ───────────────────────────────────────────────
	const totalVideos = 1 + remoteVideos.length
	const gridCols =
		totalVideos === 1
			? 'grid-cols-1'
			: totalVideos === 2
				? 'grid-cols-1 md:grid-cols-2'
				: totalVideos <= 4
					? 'grid-cols-2'
					: 'grid-cols-2 lg:grid-cols-3'

	// ── Loading screen ─────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-5'>
				<div className='relative w-16 h-16'>
					<div className='absolute inset-0 rounded-full border-4 border-slate-800' />
					<div className='absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin' />
				</div>
				<div className='text-center space-y-1'>
					<p className='text-sm font-bold tracking-widest uppercase text-slate-300'>
						Joining Room
					</p>
					<p className='text-xs text-slate-600 font-mono'>{roomCode}</p>
					<p className='text-[10px] text-slate-700'>Fetching Agora token…</p>
				</div>
			</div>
		)
	}

	// ── Error screen ───────────────────────────────────────────────────────────
	if (connState === 'error') {
		return (
			<div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-5 px-6'>
				<WifiOff size={40} className='text-rose-500' />
				<div className='text-center space-y-2'>
					<p className='text-sm font-bold text-slate-200'>
						Failed to join room
					</p>
					{errorMsg && (
						<p className='text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl max-w-md'>
							{errorMsg}
						</p>
					)}
					<p className='text-xs text-slate-500'>
						Make sure your Agora App Certificate is enabled and the backend is
						reachable.
					</p>
				</div>
				<button
					onClick={() => navigate('/dashboard')}
					className='px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition-all'
				>
					Back to Dashboard
				</button>
			</div>
		)
	}

	// ── Main UI ────────────────────────────────────────────────────────────────
	return (
		<div className='h-screen bg-slate-950 text-white flex flex-col overflow-hidden'>
			{/* Ambient glows */}
			<div className='pointer-events-none fixed inset-0 overflow-hidden'>
				<div className='absolute -top-48 left-1/4 w-[700px] h-[700px] bg-blue-700/[0.07] blur-[180px] rounded-full' />
				<div className='absolute -bottom-48 right-1/4 w-[500px] h-[500px] bg-indigo-700/[0.07] blur-[150px] rounded-full' />
			</div>

			{/* ── Header ─────────────────────────────────────────────────────────── */}
			<header className='relative z-20 shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-xl'>
				<div className='flex items-center gap-3 sm:gap-4 min-w-0'>
					{/* Brand */}
					<div className='flex items-center gap-2 shrink-0'>
						<div className='w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs select-none'>
							C
						</div>
						<span className='text-sm font-black tracking-tight hidden lg:block'>
							ClassRoom
						</span>
					</div>

					<div className='w-px h-4 bg-white/10 hidden sm:block' />

					{/* Room code */}
					<div className='hidden sm:block'>
						<p className='text-[9px] text-slate-600 font-semibold uppercase tracking-widest'>
							Room
						</p>
						<p className='text-xs font-black font-mono'>{roomCode}</p>
					</div>

					<div className='w-px h-4 bg-white/10 hidden sm:block' />

					{/* Connection status */}
					<div
						className={`flex items-center gap-1.5 text-xs font-semibold ${
							connState === 'live'
								? 'text-emerald-400'
								: connState === 'error'
									? 'text-rose-400'
									: 'text-amber-400'
						}`}
					>
						{connState === 'live' && (
							<>
								<Wifi size={13} /> Live
							</>
						)}
						{connState === 'error' && (
							<>
								<WifiOff size={13} /> Error
							</>
						)}
						{connState === 'connecting' && (
							<>
								<Loader2 size={13} className='animate-spin' /> Connecting
							</>
						)}
					</div>

					{/* Participant count */}
					<div className='flex items-center gap-1.5 text-xs text-slate-500 font-semibold'>
						<Users size={13} />
						<span>{totalVideos}</span>
					</div>
				</div>

				<div className='flex items-center gap-2'>
					{/* Tab switcher */}
					<div className='flex bg-slate-900/80 p-1 rounded-xl border border-white/[0.07] gap-1'>
						<button
							onClick={() => setActiveTab('video')}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
								${activeTab === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
						>
							<VideoIcon size={13} />
							<span className='hidden sm:inline'>Video</span>
						</button>
						<button
							onClick={() => setActiveTab('board')}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
								${activeTab === 'board' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
						>
							<Presentation size={13} />
							<span className='hidden sm:inline'>Board</span>
						</button>
					</div>

					{/* Chat toggle */}
					<button
						onClick={() => {
							setChatOpen(o => !o)
							setUnreadCount(0)
						}}
						className='relative w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/[0.07] flex items-center justify-center transition-all'
					>
						<MessageSquare size={16} className='text-slate-300' />
						{unreadCount > 0 && !chatOpen && (
							<span className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-[9px] font-black flex items-center justify-center'>
								{unreadCount > 9 ? '9+' : unreadCount}
							</span>
						)}
					</button>

					{/* Leave */}
					<button
						onClick={leaveRoom}
						className='flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all'
					>
						<PhoneOff size={13} />
						<span className='hidden sm:inline'>Leave</span>
					</button>
				</div>
			</header>

			{/* ── Body ───────────────────────────────────────────────────────────── */}
			<div className='relative z-10 flex flex-grow overflow-hidden p-3 sm:p-4 gap-4'>
				{/* Main content area */}
				<div className='flex-grow flex flex-col gap-3 min-w-0 overflow-hidden'>
					{activeTab === 'video' ? (
						<>
							{/* ── Video grid ── */}
							<div className={`flex-grow grid ${gridCols} gap-3 min-h-0`}>
								{/* Local video */}
								<div className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center min-h-[140px]'>
									{/* Agora plays into this div */}
									<div
										id='local-video'
										className={`w-full h-full ${videoOff && !screenSharing ? 'hidden' : ''}`}
									/>

									{/* Avatar when camera off */}
									{videoOff && !screenSharing && (
										<div className='flex flex-col items-center gap-2'>
											<div className='w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-black text-slate-400'>
												{(user?.username ?? getName())[0]?.toUpperCase()}
											</div>
											<p className='text-[10px] text-slate-500'>Camera off</p>
										</div>
									)}

									{/* Name badge */}
									<div className='absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full'>
										<span className='text-[10px] font-bold truncate max-w-[120px]'>
											{user?.username ?? getName()}
										</span>
										<span className='text-[9px] text-blue-400 capitalize shrink-0'>
											({user?.role ?? 'you'})
										</span>
									</div>

									{/* Muted indicator */}
									{audioMuted && (
										<div className='absolute top-3 right-3 bg-rose-600/90 backdrop-blur rounded-full p-1.5'>
											<MicOff size={11} />
										</div>
									)}

									{/* Screen share indicator */}
									{screenSharing && (
										<div className='absolute top-3 left-3 flex items-center gap-1 bg-blue-600/90 px-2 py-1 rounded-full'>
											<Monitor size={10} />
											<span className='text-[9px] font-bold'>Sharing</span>
										</div>
									)}
								</div>

								{/* Remote videos — one div per participant */}
								{remoteVideos.map(({ uid, username }) => (
									<div
										key={uid}
										className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center min-h-[140px]'
									>
										{/* Agora plays the remote track into this div by id */}
										<div id={`remote-video-${uid}`} className='w-full h-full' />
										<div className='absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full'>
											<span className='text-[10px] font-bold truncate max-w-[120px] block'>
												{username}
											</span>
										</div>
									</div>
								))}
							</div>

							{/* ── Media controls ── */}
							<div className='shrink-0 flex items-center justify-center gap-3 py-1'>
								{/* Mic */}
								<button
									onClick={toggleAudio}
									title={audioMuted ? 'Unmute' : 'Mute'}
									className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95
										${
											audioMuted
												? 'bg-rose-600 border-rose-500 text-white'
												: 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
										}`}
								>
									{audioMuted ? <MicOff size={18} /> : <Mic size={18} />}
								</button>

								{/* Camera */}
								<button
									onClick={toggleVideo}
									disabled={screenSharing}
									title={videoOff ? 'Camera on' : 'Camera off'}
									className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
										${
											videoOff
												? 'bg-rose-600 border-rose-500 text-white'
												: 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
										}`}
								>
									{videoOff ? <VideoOff size={18} /> : <Video size={18} />}
								</button>

								{/* Screen share */}
								<button
									onClick={toggleScreenShare}
									title={screenSharing ? 'Stop sharing' : 'Share screen'}
									className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95
										${
											screenSharing
												? 'bg-blue-600 border-blue-500 text-white'
												: 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
										}`}
								>
									{screenSharing ? (
										<MonitorOff size={18} />
									) : (
										<Monitor size={18} />
									)}
								</button>

								{/* Leave shortcut */}
								<button
									onClick={leaveRoom}
									title='Leave room'
									className='w-11 h-11 rounded-full flex items-center justify-center border bg-rose-600 border-rose-500 text-white hover:bg-rose-500 transition-all active:scale-95 ml-2'
								>
									<PhoneOff size={18} />
								</button>
							</div>
						</>
					) : (
						/* ── Whiteboard tab ── */
						<div className='flex-grow min-h-0'>
							<Whiteboard
								socket={socket}
								isTeacher={user?.role === 'teacher'}
								roomCode={roomCode}
							/>
						</div>
					)}
				</div>

				{/* ── Chat panel ─────────────────────────────────────────────────────
				     Mobile: fixed overlay sliding in from the right
				     Desktop (md+): static sidebar
				───────────────────────────────────────────────────────────────────── */}
				<div
					className={`
					fixed inset-0 z-50 pointer-events-none
					md:relative md:inset-auto md:z-auto md:pointer-events-auto
					md:w-80 md:shrink-0
				`}
				>
					{/* Mobile backdrop */}
					{chatOpen && (
						<div
							className='absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto md:hidden'
							onClick={() => setChatOpen(false)}
						/>
					)}

					{/* Panel */}
					<div
						className={`
							pointer-events-auto
							absolute right-0 top-0 h-full w-[85vw] max-w-sm
							md:relative md:w-full md:max-w-none
							flex flex-col
							bg-slate-900/95 backdrop-blur-xl
							border-l border-white/[0.06]
							md:rounded-2xl md:border md:border-white/[0.06]
							overflow-hidden shadow-2xl
							transition-transform duration-300 ease-out
							${chatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
						`}
						style={{ height: '100%' }}
					>
						{/* Chat header */}
						<div className='px-5 py-4 border-b border-white/[0.06] flex items-center gap-2 shrink-0'>
							<MessageSquare size={14} className='text-blue-400' />
							<span className='text-xs font-black uppercase tracking-widest text-blue-400'>
								Class Chat
							</span>
							<span className='ml-auto w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black flex items-center justify-center'>
								{messages.filter(m => m.type === 'chat').length}
							</span>
							<button
								onClick={() => setChatOpen(false)}
								className='md:hidden w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center ml-1 transition-all'
							>
								<X size={14} className='text-slate-400' />
							</button>
						</div>

						{/* Messages list */}
						<div className='flex-grow overflow-y-auto p-4 space-y-4'>
							{messages.length === 0 && (
								<p className='text-center text-xs text-slate-600 mt-10'>
									No messages yet
								</p>
							)}
							{messages.map((m, i) => {
								if (m.type === 'system') {
									return (
										<div key={i} className='flex justify-center'>
											<span className='text-[10px] text-slate-600 bg-slate-800/80 px-3 py-1 rounded-full'>
												{m.content}
											</span>
										</div>
									)
								}
								const isSelf =
									m.isSelf || m.sender === (user?.username ?? getName())
								return (
									<div
										key={i}
										className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
									>
										<span className='text-[9px] text-slate-500 font-bold uppercase tracking-wide mb-1 px-1'>
											{m.sender}
										</span>
										<div
											className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed
											${
												isSelf
													? 'bg-blue-600 text-white rounded-tr-sm'
													: 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/[0.05]'
											}`}
										>
											{m.content}
										</div>
									</div>
								)
							})}
							<div ref={messagesEndRef} />
						</div>

						{/* Message input */}
						<div className='p-3 border-t border-white/[0.06] flex gap-2 shrink-0'>
							<input
								value={input}
								onChange={e => setInput(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
								placeholder='Message class…'
								maxLength={500}
								className='flex-grow bg-slate-800 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600 font-medium'
							/>
							<button
								onClick={sendChat}
								disabled={!input.trim()}
								className='w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all active:scale-90'
							>
								<Send size={16} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default RoomPage
