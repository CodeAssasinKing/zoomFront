import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import Whiteboard from './Whiteboard'

const rawWsUrl = import.meta.env.VITE_API_WS_URL.replace(/^https?:\/\//, '')

// ─── Icons ───────────────────────────────────────────────────────────────────
const SendIcon = () => (
	<svg
		className='w-5 h-5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth={2.5}
			d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
		/>
	</svg>
)
const MicIcon = ({ muted }) => (
	<svg
		className='w-5 h-5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		{muted ? (
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				strokeWidth={2}
				d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
			/>
		) : (
			<>
				<path
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
					d='M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5'
				/>
				<line
					x1='2'
					y1='2'
					x2='22'
					y2='22'
					strokeLinecap='round'
					strokeWidth={2}
				/>
			</>
		)}
	</svg>
)
const CamIcon = ({ off }) => (
	<svg
		className='w-5 h-5'
		fill='none'
		stroke='currentColor'
		viewBox='0 0 24 24'
	>
		{off ? (
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				strokeWidth={2}
				d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z'
			/>
		) : (
			<>
				<path
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
					d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z'
				/>
				<line
					x1='2'
					y1='2'
					x2='22'
					y2='22'
					strokeLinecap='round'
					strokeWidth={2}
				/>
			</>
		)}
	</svg>
)

// ─── RoomPage ─────────────────────────────────────────────────────────────────
const RoomPage = () => {
	const { roomCode } = useParams()
	const navigate = useNavigate()

	const localVideoRef = useRef(null)
	const remoteVideoRef = useRef(null)
	const peerConnection = useRef(null)
	const socket = useRef(null)
	const localStream = useRef(null)
	const messagesEndRef = useRef(null)
	const pendingCandidates = useRef([])

	const [messages, setMessages] = useState([])
	const [input, setInput] = useState('')
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [cameraError, setCameraError] = useState(false)
	const [activeTab, setActiveTab] = useState('video')
	const [remoteConnected, setRemoteConnected] = useState(false)
	const [audioMuted, setAudioMuted] = useState(false)
	const [videoOff, setVideoOff] = useState(false)
	const [connectionState, setConnectionState] = useState('waiting') // waiting | connecting | connected | disconnected

	const rtcConfig = {
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' },
			{ urls: 'stun:stun1.l.google.com:19302' },
		],
	}

	// ── scroll chat to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// ── setup room
	useEffect(() => {
		let isMounted = true

		const setupRoom = async () => {
			try {
				const userRes = await api.get('/auth/me')
				if (!isMounted) return
				setUser(userRes.data)

				// Camera / mic
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
				const wsUrl = `wss://${rawWsUrl}/ws/${roomCode}/${userRes.data.id}`
				socket.current = new WebSocket(wsUrl)

				socket.current.onopen = () => {
					if (isMounted) setLoading(false)
				}

				socket.current.onclose = () => {
					if (isMounted) setConnectionState('disconnected')
				}

				socket.current.onerror = () => {
					if (isMounted) setConnectionState('disconnected')
				}

				socket.current.onmessage = async event => {
					if (!isMounted) return
					try {
						const data = JSON.parse(event.data)
						handleSignalingData(data, userRes.data)
					} catch {
						/* ignore malformed */
					}
				}
			} catch {
				navigate('/dashboard')
			}
		}

		setupRoom()

		return () => {
			isMounted = false
			socket.current?.close()
			peerConnection.current?.close()
			localStream.current?.getTracks().forEach(t => t.stop())
		}
	}, [roomCode, navigate])

	// ── peer connection factory
	const createPeerConnection = useCallback(() => {
		if (peerConnection.current) {
			peerConnection.current.close()
		}

		const pc = new RTCPeerConnection(rtcConfig)

		// Add local tracks
		if (localStream.current) {
			localStream.current
				.getTracks()
				.forEach(t => pc.addTrack(t, localStream.current))
		}

		// Remote track handler
		pc.ontrack = e => {
			if (remoteVideoRef.current && e.streams?.[0]) {
				remoteVideoRef.current.srcObject = e.streams[0]
				setRemoteConnected(true)
				setConnectionState('connected')
			}
		}

		// ICE candidates
		pc.onicecandidate = e => {
			if (e.candidate && socket.current?.readyState === WebSocket.OPEN) {
				socket.current.send(
					JSON.stringify({ type: 'candidate', candidate: e.candidate }),
				)
			}
		}

		pc.onconnectionstatechange = () => {
			const state = pc.connectionState
			if (state === 'connected') setConnectionState('connected')
			if (state === 'disconnected' || state === 'failed') {
				setRemoteConnected(false)
				setConnectionState('disconnected')
				if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
			}
		}

		peerConnection.current = pc
		return pc
	}, [])

	// ── flush ICE candidates once remote description is set
	const flushPendingCandidates = async () => {
		const pc = peerConnection.current
		if (!pc || !pc.remoteDescription) return
		for (const c of pendingCandidates.current) {
			await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
		}
		pendingCandidates.current = []
	}

	// ── signaling handler
	const handleSignalingData = useCallback(
		async (data, currentUser) => {
			switch (data.type) {
				case 'system': {
					const msg = {
						type: 'system',
						content: data.content,
						sender: 'System',
					}
					setMessages(prev => [...prev, msg])
					// Teacher initiates call when student joins
					if (
						data.content?.includes('joined') &&
						currentUser?.role === 'teacher'
					) {
						setConnectionState('connecting')
						await initiateCall()
					}
					break
				}

				case 'offer': {
					setConnectionState('connecting')
					const pc = createPeerConnection()
					await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
					await flushPendingCandidates()
					const answer = await pc.createAnswer()
					await pc.setLocalDescription(answer)
					socket.current?.send(JSON.stringify({ type: 'answer', answer }))
					break
				}

				case 'answer': {
					if (peerConnection.current?.signalingState === 'have-local-offer') {
						await peerConnection.current.setRemoteDescription(
							new RTCSessionDescription(data.answer),
						)
						await flushPendingCandidates()
					}
					break
				}

				case 'candidate': {
					if (peerConnection.current?.remoteDescription) {
						await peerConnection.current
							.addIceCandidate(new RTCIceCandidate(data.candidate))
							.catch(() => {})
					} else {
						// Queue candidates until remote description is set
						pendingCandidates.current.push(data.candidate)
					}
					break
				}

				case 'chat': {
					setMessages(prev => [...prev, data])
					break
				}
			}
		},
		[createPeerConnection],
	)

	// ── initiate WebRTC call (teacher)
	const initiateCall = async () => {
		const pc = createPeerConnection()
		const offer = await pc.createOffer()
		await pc.setLocalDescription(offer)
		socket.current?.send(JSON.stringify({ type: 'offer', offer }))
	}

	// ── chat
	const sendChatMessage = () => {
		if (!input.trim() || socket.current?.readyState !== WebSocket.OPEN) return
		const msg = {
			type: 'chat',
			content: input.trim(),
			sender: user?.username || 'Unknown',
		}
		socket.current.send(JSON.stringify(msg))
		setMessages(prev => [...prev, { ...msg, isSelf: true }])
		setInput('')
	}

	// ── media controls
	const toggleAudio = () => {
		if (!localStream.current) return
		localStream.current.getAudioTracks().forEach(t => (t.enabled = audioMuted))
		setAudioMuted(m => !m)
	}

	const toggleVideo = () => {
		if (!localStream.current) return
		localStream.current.getVideoTracks().forEach(t => (t.enabled = videoOff))
		setVideoOff(v => !v)
	}

	// ── status badge
	const StatusBadge = () => {
		const states = {
			waiting: { label: 'Waiting for participant', color: 'bg-amber-500' },
			connecting: {
				label: 'Connecting...',
				color: 'bg-blue-500 animate-pulse',
			},
			connected: { label: 'Live', color: 'bg-emerald-500' },
			disconnected: { label: 'Disconnected', color: 'bg-rose-500' },
		}
		const s = states[connectionState] || states.waiting
		return (
			<div className='flex items-center gap-2'>
				<span className={`w-2 h-2 rounded-full ${s.color}`} />
				<span className='text-xs font-semibold text-slate-400'>{s.label}</span>
			</div>
		)
	}

	// ─── Loading screen
	if (loading) {
		return (
			<div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-5'>
				<div className='relative'>
					<div className='w-16 h-16 border-4 border-slate-800 rounded-full' />
					<div className='absolute inset-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
				</div>
				<div className='text-center'>
					<p className='text-sm font-bold text-white tracking-widest uppercase'>
						Initializing Room
					</p>
					<p className='text-xs text-slate-500 mt-1'>{roomCode}</p>
				</div>
			</div>
		)
	}

	// ─── Main UI
	return (
		<div className='h-screen bg-slate-950 text-white flex flex-col overflow-hidden'>
			{/* Ambient glows */}
			<div className='pointer-events-none fixed inset-0 overflow-hidden'>
				<div className='absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-700/10 blur-[140px] rounded-full' />
				<div className='absolute -bottom-32 right-1/4 w-[400px] h-[400px] bg-violet-700/10 blur-[120px] rounded-full' />
			</div>

			{/* ── Header ── */}
			<header className='relative z-10 shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl'>
				<div className='flex items-center gap-5'>
					{/* Logo / brand */}
					<div className='flex items-center gap-2'>
						<div className='w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm'>
							C
						</div>
						<span className='text-sm font-black tracking-tight hidden sm:block'>
							ClassRoom
						</span>
					</div>

					<div className='w-px h-5 bg-white/10' />

					{/* Room code */}
					<div>
						<p className='text-xs text-slate-500 font-medium uppercase tracking-widest'>
							Room
						</p>
						<p className='text-sm font-black tracking-tighter font-mono'>
							{roomCode}
						</p>
					</div>

					<div className='w-px h-5 bg-white/10' />
					<StatusBadge />
				</div>

				<div className='flex items-center gap-3'>
					{/* Tab switcher */}
					<div className='flex bg-slate-900 p-1 rounded-xl border border-white/[0.08] gap-1'>
						{['video', 'board'].map(tab => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
							>
								{tab === 'video' ? '📹 Video' : '🖊 Board'}
							</button>
						))}
					</div>

					{/* Leave */}
					<button
						onClick={() => navigate('/dashboard')}
						className='px-5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-black uppercase tracking-widest transition-all'
					>
						Leave
					</button>
				</div>
			</header>

			{/* ── Body ── */}
			<div className='relative z-10 flex flex-grow overflow-hidden p-4 gap-4'>
				{/* Main content */}
				<div className='flex-grow flex flex-col gap-4 min-w-0 overflow-hidden'>
					{activeTab === 'video' ? (
						<>
							{/* Video grid */}
							<div className='flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0'>
								{/* Local */}
								<div className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center'>
									{cameraError || videoOff ? (
										<div className='flex flex-col items-center gap-3'>
											<div className='w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl'>
												{user?.username?.[0]?.toUpperCase() || '?'}
											</div>
											<p className='text-xs text-slate-500 font-medium'>
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
										<span className='text-xs text-blue-400 capitalize'>
											({user?.role})
										</span>
									</div>
									{audioMuted && (
										<div className='absolute top-3 right-3 bg-rose-600 rounded-full p-1.5'>
											<svg
												className='w-3 h-3'
												fill='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m14 0h2m-16 0H1m11 7v4m-4 0h8'
													stroke='currentColor'
													fill='none'
													strokeWidth={2}
													strokeLinecap='round'
												/>
											</svg>
										</div>
									)}
								</div>

								{/* Remote */}
								<div className='relative bg-slate-900 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center'>
									<video
										ref={remoteVideoRef}
										autoPlay
										playsInline
										className={`w-full h-full object-cover ${remoteConnected ? '' : 'hidden'}`}
									/>
									{!remoteConnected && (
										<div className='flex flex-col items-center gap-3 text-center'>
											<div className='w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center'>
												<svg
													className='w-7 h-7 text-slate-600'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={1.5}
														d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z'
													/>
												</svg>
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

							{/* Media controls bar */}
							{!cameraError && (
								<div className='shrink-0 flex items-center justify-center gap-3 py-2'>
									<button
										onClick={toggleAudio}
										title={audioMuted ? 'Unmute' : 'Mute'}
										className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${audioMuted ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
									>
										<MicIcon muted={audioMuted} />
									</button>
									<button
										onClick={toggleVideo}
										title={videoOff ? 'Turn camera on' : 'Turn camera off'}
										className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${videoOff ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
									>
										<CamIcon off={videoOff} />
									</button>
								</div>
							)}
						</>
					) : (
						/* Whiteboard — teacher only gets tools, student just views */
						<div className='flex-grow min-h-0'>
							<Whiteboard
								socket={socket}
								isTeacher={user?.role === 'teacher'}
								roomCode={roomCode}
							/>
						</div>
					)}
				</div>

				{/* ── Chat sidebar ── */}
				<div className='w-80 shrink-0 flex flex-col bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden'>
					<div className='px-5 py-4 border-b border-white/[0.06] flex items-center gap-2'>
						<span className='text-xs font-black uppercase tracking-widest text-blue-400'>
							Class Chat
						</span>
						<span className='ml-auto w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black flex items-center justify-center'>
							{messages.filter(m => m.type === 'chat').length}
						</span>
					</div>

					<div className='flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700'>
						{messages.length === 0 && (
							<p className='text-center text-xs text-slate-600 mt-8'>
								No messages yet
							</p>
						)}
						{messages.map((m, i) => {
							if (m.type === 'system') {
								return (
									<div key={i} className='text-center'>
										<span className='text-[10px] text-slate-600 bg-slate-800 px-3 py-1 rounded-full'>
											{m.content}
										</span>
									</div>
								)
							}
							const isSelf = m.sender === user?.username || m.isSelf
							return (
								<div
									key={i}
									className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
								>
									<span className='text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-1 px-1'>
										{m.sender}
									</span>
									<div
										className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed ${isSelf ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/[0.06]'}`}
									>
										{m.content}
									</div>
								</div>
							)
						})}
						<div ref={messagesEndRef} />
					</div>

					<div className='p-3 border-t border-white/[0.06] flex gap-2'>
						<input
							value={input}
							onChange={e => setInput(e.target.value)}
							onKeyDown={e =>
								e.key === 'Enter' && !e.shiftKey && sendChatMessage()
							}
							placeholder='Message class…'
							maxLength={500}
							className='flex-grow bg-slate-800 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600 font-medium'
						/>
						<button
							onClick={sendChatMessage}
							disabled={!input.trim()}
							className='w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all active:scale-90'
						>
							<SendIcon />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default RoomPage
