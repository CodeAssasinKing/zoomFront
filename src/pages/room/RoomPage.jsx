import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
	Mic,
	MicOff,
	Video,
	VideoOff,
	PhoneOff,
	MessageSquare,
	X,
	Send,
	Video as VideoIcon,
	PresentationIcon,
	Wifi,
	WifiOff,
	Loader2,
	Users,
} from 'lucide-react'
import api from '../../api/api'
import Whiteboard from './Whiteboard'

const rawWsUrl = import.meta.env.VITE_API_WS_URL.replace(/^https?:\/\//, '')

// ── ICE / TURN config ─────────────────────────────────────────────────────────
// Uses Metered's free STUN/TURN endpoints as reliable fallback beyond Google STUN.
// Replace with your own TURN credentials for production.
const RTC_CONFIG = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' },
		{ urls: 'stun:stun.relay.metered.ca:80' },
		{
			urls: 'turn:global.relay.metered.ca:80',
			username: 'openrelayproject',
			credential: 'openrelayproject',
		},
		{
			urls: 'turn:global.relay.metered.ca:443',
			username: 'openrelayproject',
			credential: 'openrelayproject',
		},
		{
			urls: 'turns:global.relay.metered.ca:443',
			username: 'openrelayproject',
			credential: 'openrelayproject',
		},
	],
	iceCandidatePoolSize: 10,
}

// ── RoomPage ──────────────────────────────────────────────────────────────────
const RoomPage = () => {
	const { roomCode } = useParams()
	const navigate = useNavigate()

	// Refs
	const localVideoRef = useRef(null)
	const remoteVideoRef = useRef(null)
	const peerConnection = useRef(null)
	const socket = useRef(null)
	const localStream = useRef(null)
	const messagesEndRef = useRef(null)
	const pendingCandidates = useRef([])
	// Keep latest user/handler in refs to avoid stale closures in onmessage
	const userRef = useRef(null)
	const handleSignalingRef = useRef(null)

	// State
	const [messages, setMessages] = useState([])
	const [input, setInput] = useState('')
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [cameraError, setCameraError] = useState(false)
	const [activeTab, setActiveTab] = useState('video')
	const [remoteConnected, setRemoteConnected] = useState(false)
	const [audioMuted, setAudioMuted] = useState(false)
	const [videoOff, setVideoOff] = useState(false)
	const [chatOpen, setChatOpen] = useState(false)
	const [unreadCount, setUnreadCount] = useState(0)
	// 'waiting' | 'connecting' | 'connected' | 'disconnected'
	const [connState, setConnState] = useState('waiting')

	// ── scroll chat ────────────────────────────────────────────────────────
	useEffect(() => {
		if (chatOpen) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
			setUnreadCount(0)
		}
	}, [messages, chatOpen])

	// ── peer connection factory ────────────────────────────────────────────
	const createPeerConnection = useCallback(() => {
		peerConnection.current?.close()

		const pc = new RTCPeerConnection(RTC_CONFIG)

		if (localStream.current) {
			localStream.current
				.getTracks()
				.forEach(t => pc.addTrack(t, localStream.current))
		}

		pc.ontrack = e => {
			if (remoteVideoRef.current && e.streams?.[0]) {
				remoteVideoRef.current.srcObject = e.streams[0]
				setRemoteConnected(true)
				setConnState('connected')
			}
		}

		pc.onicecandidate = e => {
			if (e.candidate && socket.current?.readyState === WebSocket.OPEN) {
				socket.current.send(
					JSON.stringify({ type: 'candidate', candidate: e.candidate }),
				)
			}
		}

		pc.onconnectionstatechange = () => {
			const s = pc.connectionState
			if (s === 'connected') {
				setConnState('connected')
				setRemoteConnected(true)
			}
			if (s === 'disconnected' || s === 'failed' || s === 'closed') {
				setConnState('disconnected')
				setRemoteConnected(false)
				if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
			}
		}

		// Also watch ICE connection state for faster "connected" detection
		pc.oniceconnectionstatechange = () => {
			if (
				pc.iceConnectionState === 'connected' ||
				pc.iceConnectionState === 'completed'
			) {
				setConnState('connected')
				setRemoteConnected(true)
			}
			if (pc.iceConnectionState === 'failed') {
				pc.restartIce()
			}
		}

		peerConnection.current = pc
		return pc
	}, [])

	// ── flush queued ICE candidates ────────────────────────────────────────
	const flushCandidates = async () => {
		const pc = peerConnection.current
		if (!pc?.remoteDescription) return
		for (const c of pendingCandidates.current) {
			await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
		}
		pendingCandidates.current = []
	}

	// ── initiate call (teacher) ────────────────────────────────────────────
	const initiateCall = useCallback(async () => {
		const pc = createPeerConnection()
		const offer = await pc.createOffer()
		await pc.setLocalDescription(offer)
		socket.current?.send(JSON.stringify({ type: 'offer', offer }))
	}, [createPeerConnection])

	// ── signaling handler ──────────────────────────────────────────────────
	// Defined as a stable ref-based function so it always sees latest state
	// without the onmessage closure going stale.
	const handleSignaling = useCallback(
		async data => {
			const currentUser = userRef.current

			switch (data.type) {
				case 'system': {
					setMessages(prev => [
						...prev,
						{ type: 'system', content: data.content },
					])
					if (
						data.content?.includes('joined') &&
						currentUser?.role === 'teacher'
					) {
						setConnState('connecting')
						await initiateCall()
					}
					break
				}
				case 'offer': {
					setConnState('connecting')
					const pc = createPeerConnection()
					await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
					await flushCandidates()
					const answer = await pc.createAnswer()
					await pc.setLocalDescription(answer)
					socket.current?.send(JSON.stringify({ type: 'answer', answer }))
					break
				}
				case 'answer': {
					const pc = peerConnection.current
					if (pc?.signalingState === 'have-local-offer') {
						await pc.setRemoteDescription(
							new RTCSessionDescription(data.answer),
						)
						await flushCandidates()
					}
					break
				}
				case 'candidate': {
					const pc = peerConnection.current
					if (pc?.remoteDescription) {
						await pc
							.addIceCandidate(new RTCIceCandidate(data.candidate))
							.catch(() => {})
					} else {
						pendingCandidates.current.push(data.candidate)
					}
					break
				}
				case 'chat': {
					setMessages(prev => [...prev, data])
					setUnreadCount(n => n + 1)
					break
				}
			}
		},
		[createPeerConnection, initiateCall],
	)

	// Keep the ref in sync with the latest callback
	useEffect(() => {
		handleSignalingRef.current = handleSignaling
	}, [handleSignaling])

	// ── room setup ────────────────────────────────────────────────────────
	useEffect(() => {
		let alive = true

		const setup = async () => {
			try {
				const { data: me } = await api.get('/auth/me')
				if (!alive) return
				userRef.current = me
				setUser(me)

				// Media
				try {
					localStream.current = await navigator.mediaDevices.getUserMedia({
						video: true,
						audio: true,
					})
					if (localVideoRef.current)
						localVideoRef.current.srcObject = localStream.current
				} catch {
					setCameraError(true)
				}

				// WebSocket
				const ws = new WebSocket(`wss://${rawWsUrl}/ws/${roomCode}/${me.id}`)
				socket.current = ws

				ws.onopen = () => {
					if (alive) setLoading(false)
				}
				ws.onclose = () => {
					if (alive) setConnState(s => (s !== 'connected' ? s : 'disconnected'))
				}
				ws.onerror = () => {
					if (alive) setConnState('disconnected')
				}

				// Always delegate to the ref so we never have a stale closure
				ws.onmessage = async event => {
					if (!alive) return
					try {
						const data = JSON.parse(event.data)
						await handleSignalingRef.current(data)
					} catch {
						/* ignore malformed */
					}
				}
			} catch {
				navigate('/dashboard')
			}
		}

		setup()

		return () => {
			alive = false
			socket.current?.close()
			peerConnection.current?.close()
			localStream.current?.getTracks().forEach(t => t.stop())
		}
	}, [roomCode, navigate])

	// ── chat send ─────────────────────────────────────────────────────────
	const sendChat = () => {
		if (!input.trim() || socket.current?.readyState !== WebSocket.OPEN) return
		const msg = {
			type: 'chat',
			content: input.trim(),
			sender: user?.username ?? 'Unknown',
		}
		socket.current.send(JSON.stringify(msg))
		setMessages(prev => [...prev, { ...msg, isSelf: true }])
		setInput('')
	}

	// ── media toggles ─────────────────────────────────────────────────────
	const toggleAudio = () => {
		localStream.current?.getAudioTracks().forEach(t => (t.enabled = audioMuted))
		setAudioMuted(m => !m)
	}
	const toggleVideo = () => {
		localStream.current?.getVideoTracks().forEach(t => (t.enabled = videoOff))
		setVideoOff(v => !v)
	}

	const openChat = () => {
		setChatOpen(true)
		setUnreadCount(0)
	}

	// ── status badge ──────────────────────────────────────────────────────
	const StatusBadge = () => {
		const map = {
			waiting: { label: 'Waiting', color: 'text-amber-400', Icon: Users },
			connecting: {
				label: 'Connecting…',
				color: 'text-blue-400',
				Icon: Loader2,
			},
			connected: { label: 'Live', color: 'text-emerald-400', Icon: Wifi },
			disconnected: {
				label: 'Disconnected',
				color: 'text-rose-400',
				Icon: WifiOff,
			},
		}
		const { label, color, Icon } = map[connState] ?? map.waiting
		return (
			<div
				className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}
			>
				<Icon
					size={13}
					className={connState === 'connecting' ? 'animate-spin' : ''}
				/>
				{label}
			</div>
		)
	}

	// ── Loading ───────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-5'>
				<div className='relative w-16 h-16'>
					<div className='absolute inset-0 rounded-full border-4 border-slate-800' />
					<div className='absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin' />
				</div>
				<div className='text-center'>
					<p className='text-sm font-bold tracking-widest uppercase'>
						Initialising Room
					</p>
					<p className='text-xs text-slate-500 mt-1 font-mono'>{roomCode}</p>
				</div>
			</div>
		)
	}

	// ── Main UI ───────────────────────────────────────────────────────────
	return (
		<div className='h-screen bg-slate-950 text-white flex flex-col overflow-hidden'>
			{/* Ambient */}
			<div className='pointer-events-none fixed inset-0 overflow-hidden'>
				<div className='absolute -top-40 left-1/3 w-[600px] h-[600px] bg-blue-700/8 blur-[160px] rounded-full' />
				<div className='absolute -bottom-40 right-1/3 w-[500px] h-[500px] bg-violet-700/8 blur-[130px] rounded-full' />
			</div>

			{/* ── Header ── */}
			<header className='relative z-10 shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl'>
				<div className='flex items-center gap-3 sm:gap-5 min-w-0'>
					{/* Brand */}
					<div className='flex items-center gap-2 shrink-0'>
						<div className='w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs'>
							C
						</div>
						<span className='text-sm font-black tracking-tight hidden md:block'>
							ClassRoom
						</span>
					</div>

					<div className='w-px h-4 bg-white/10 hidden sm:block shrink-0' />

					{/* Room code */}
					<div className='min-w-0 hidden sm:block'>
						<p className='text-[9px] text-slate-500 font-semibold uppercase tracking-widest'>
							Room
						</p>
						<p className='text-xs font-black font-mono truncate'>{roomCode}</p>
					</div>

					<div className='w-px h-4 bg-white/10 hidden sm:block shrink-0' />
					<StatusBadge />
				</div>

				<div className='flex items-center gap-2'>
					{/* Tabs */}
					<div className='flex bg-slate-900 p-1 rounded-xl border border-white/[0.07] gap-1'>
						<button
							onClick={() => setActiveTab('video')}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
								${activeTab === 'video' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
						>
							<VideoIcon size={13} />
							<span className='hidden sm:inline'>Video</span>
						</button>
						<button
							onClick={() => setActiveTab('board')}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
								${activeTab === 'board' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
						>
							<PresentationIcon size={13} />
							<span className='hidden sm:inline'>Board</span>
						</button>
					</div>

					{/* Chat toggle button */}
					<button
						onClick={openChat}
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
						onClick={() => navigate('/dashboard')}
						className='flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all'
					>
						<PhoneOff size={13} />
						<span className='hidden sm:inline'>Leave</span>
					</button>
				</div>
			</header>

			{/* ── Body ── */}
			<div className='relative z-10 flex flex-grow overflow-hidden p-3 sm:p-4 gap-4'>
				{/* Main area */}
				<div className='flex-grow flex flex-col gap-4 min-w-0 overflow-hidden'>
					{activeTab === 'video' ? (
						<>
							<div className='flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0'>
								{/* Local */}
								<div className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center min-h-[160px]'>
									{cameraError || videoOff ? (
										<div className='flex flex-col items-center gap-3'>
											<div className='w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-xl font-black text-slate-400'>
												{user?.username?.[0]?.toUpperCase() ?? '?'}
											</div>
											<p className='text-xs text-slate-500'>
												{cameraError ? 'Camera unavailable' : 'Camera off'}
											</p>
										</div>
									) : (
										<video
											ref={localVideoRef}
											autoPlay
											muted
											playsInline
											className='w-full h-full object-cover'
										/>
									)}
									<div className='absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full'>
										<span className='text-xs font-bold'>You</span>
										<span className='text-[10px] text-blue-400 capitalize'>
											({user?.role})
										</span>
									</div>
									{audioMuted && (
										<div className='absolute top-3 right-3 bg-rose-600 rounded-full p-1.5'>
											<MicOff size={12} />
										</div>
									)}
								</div>

								{/* Remote */}
								<div className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center min-h-[160px]'>
									<video
										ref={remoteVideoRef}
										autoPlay
										playsInline
										className={`w-full h-full object-cover ${remoteConnected ? '' : 'hidden'}`}
									/>
									{!remoteConnected && (
										<div className='flex flex-col items-center gap-3 text-center'>
											<div className='w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center'>
												<VideoOff size={24} className='text-slate-600' />
											</div>
											<p className='text-xs text-slate-500'>
												Waiting for participant…
											</p>
										</div>
									)}
									<div className='absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full'>
										<span className='text-xs font-bold'>Participant</span>
									</div>
								</div>
							</div>

							{/* Media controls */}
							{!cameraError && (
								<div className='shrink-0 flex items-center justify-center gap-3 py-1'>
									<button
										onClick={toggleAudio}
										title={audioMuted ? 'Unmute' : 'Mute'}
										className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all
											${
												audioMuted
													? 'bg-rose-600 border-rose-500 text-white'
													: 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
											}`}
									>
										{audioMuted ? <MicOff size={18} /> : <Mic size={18} />}
									</button>
									<button
										onClick={toggleVideo}
										title={videoOff ? 'Camera on' : 'Camera off'}
										className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all
											${
												videoOff
													? 'bg-rose-600 border-rose-500 text-white'
													: 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
											}`}
									>
										{videoOff ? <VideoOff size={18} /> : <Video size={18} />}
									</button>
								</div>
							)}
						</>
					) : (
						<div className='flex-grow min-h-0'>
							<Whiteboard
								socket={socket}
								isTeacher={user?.role === 'teacher'}
								roomCode={roomCode}
							/>
						</div>
					)}
				</div>

				{/* ── Chat panel (toggleable, slides in over content on mobile) ── */}
				<div
					className={`
						fixed inset-0 z-50 transition-all duration-300
						md:relative md:inset-auto md:z-auto md:w-80 md:shrink-0
						${chatOpen ? 'pointer-events-auto' : 'pointer-events-none md:pointer-events-auto'}
					`}
				>
					{/* Mobile backdrop */}
					{chatOpen && (
						<div
							className='absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden'
							onClick={() => setChatOpen(false)}
						/>
					)}

					{/* Panel */}
					<div
						className={`
							absolute right-0 top-0 h-full w-[85vw] max-w-sm
							md:relative md:w-full md:max-w-none md:h-auto md:flex
							flex flex-col bg-slate-900/90 backdrop-blur-xl border-l border-white/[0.06] md:rounded-2xl md:border md:border-white/[0.06] overflow-hidden shadow-2xl
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
								className='md:hidden w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center ml-1'
							>
								<X size={14} className='text-slate-400' />
							</button>
						</div>

						{/* Messages */}
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
								const isSelf = m.isSelf || m.sender === user?.username
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

						{/* Input */}
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
