import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import Whiteboard from './Whiteboard'

const rawWsUrl = import.meta.env.VITE_API_WS_URL.replace(/^https?:\/\//, '')

const RoomPage = () => {
	const { roomCode } = useParams()
	const navigate = useNavigate()

	const localVideoRef = useRef()
	const remoteVideoRef = useRef()
	const peerConnection = useRef(null)
	const socket = useRef(null)
	const localStream = useRef(null)

	const [messages, setMessages] = useState([])
	const [input, setInput] = useState('')
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [cameraError, setCameraError] = useState(false)
	const [activeTab, setActiveTab] = useState('video') // 'video' or 'board'

	const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

	useEffect(() => {
		const setupRoom = async () => {
			try {
				const userRes = await api.get('/auth/me')
				setUser(userRes.data)

				try {
					localStream.current = await navigator.mediaDevices.getUserMedia({
						video: true,
						audio: true,
					})
					if (localVideoRef.current)
						localVideoRef.current.srcObject = localStream.current
				} catch (mediaErr) {
					setCameraError(true)
				}

				const wsUrl = `wss://${rawWsUrl}/ws/${roomCode}/${userRes.data.id}`
				socket.current = new WebSocket(wsUrl)

				socket.current.onopen = () => setLoading(false)
				socket.current.onmessage = async event => {
					const data = JSON.parse(event.data)
					handleSignalingData(data, userRes.data)
				}
			} catch (err) {
				navigate('/dashboard')
			}
		}
		setupRoom()
		return () => {
			socket.current?.close()
			if (peerConnection.current) peerConnection.current.close()
			if (localStream.current)
				localStream.current.getTracks().forEach(t => t.stop())
		}
	}, [roomCode, navigate])

	const createPeerConnection = () => {
		const pc = new RTCPeerConnection(rtcConfig)
		if (localStream.current)
			localStream.current
				.getTracks()
				.forEach(t => pc.addTrack(t, localStream.current))
		pc.ontrack = e => {
			if (remoteVideoRef.current)
				remoteVideoRef.current.srcObject = e.streams[0]
		}
		pc.onicecandidate = e => {
			if (e.candidate && socket.current?.readyState === WebSocket.OPEN) {
				socket.current.send(
					JSON.stringify({ type: 'candidate', candidate: e.candidate }),
				)
			}
		}
		return pc
	}

	const handleSignalingData = async (data, currentUser) => {
		switch (data.type) {
			case 'system':
				if (data.content.includes('joined') && currentUser?.role === 'teacher')
					initiateCall()
				break
			case 'offer':
				if (peerConnection.current) peerConnection.current.close()
				peerConnection.current = createPeerConnection()
				await peerConnection.current.setRemoteDescription(
					new RTCSessionDescription(data.offer),
				)
				const answer = await peerConnection.current.createAnswer()
				await peerConnection.current.setLocalDescription(answer)
				socket.current.send(JSON.stringify({ type: 'answer', answer }))
				break
			case 'answer':
				if (peerConnection.current)
					await peerConnection.current.setRemoteDescription(
						new RTCSessionDescription(data.answer),
					)
				break
			case 'candidate':
				if (peerConnection.current)
					await peerConnection.current
						.addIceCandidate(new RTCIceCandidate(data.candidate))
						.catch(e => {})
				break
			case 'chat':
				setMessages(prev => [...prev, data])
				break
		}
	}

	const initiateCall = async () => {
		peerConnection.current = createPeerConnection()
		const offer = await peerConnection.current.createOffer()
		await peerConnection.current.setLocalDescription(offer)
		socket.current.send(JSON.stringify({ type: 'offer', offer }))
	}

	const sendChatMessage = () => {
		if (!input.trim() || socket.current?.readyState !== WebSocket.OPEN) return
		const msg = {
			type: 'chat',
			content: input,
			sender: user?.username || 'Unknown',
		}
		socket.current.send(JSON.stringify(msg))
		setMessages(prev => [...prev, msg])
		setInput('')
	}

	if (loading)
		return (
			<div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-black tracking-widest uppercase text-xs'>
				<div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
				<p className='animate-pulse'>Initializing Secure Channel...</p>
			</div>
		)

	return (
		<div className='h-screen bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative'>
			{/* Background Glow */}
			<div className='absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none' />
			<div className='absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] pointer-events-none' />

			{/* Header Bar */}
			<header className='relative z-10 px-8 py-5 flex justify-between items-center bg-white/5 backdrop-blur-xl border-b border-white/10'>
				<div className='flex items-center gap-6'>
					<div className='flex flex-col'>
						<h2 className='text-xl font-black tracking-tighter'>
							Room: {roomCode}
						</h2>
						<p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest italic'>
							Stream Status: Active
						</p>
					</div>

					<div className='flex bg-slate-900/50 p-1 rounded-2xl border border-white/10'>
						<button
							onClick={() => setActiveTab('video')}
							className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'video' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
						>
							VIDEO
						</button>
						<button
							onClick={() => setActiveTab('board')}
							className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'board' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
						>
							WHITEBOARD
						</button>
					</div>
				</div>

				<button
					onClick={() => navigate('/dashboard')}
					className='bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 px-8 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 uppercase tracking-widest'
				>
					Leave Room
				</button>
			</header>

			<div className='flex flex-grow overflow-hidden relative z-10 p-6 gap-6'>
				{/* Main Content Area */}
				<div className='flex-grow flex flex-col gap-6 overflow-hidden'>
					{activeTab === 'video' ? (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6 h-full'>
							{/* Local View */}
							<div className='relative bg-black/40 backdrop-blur-md rounded-[2.5rem] border-2 border-blue-500/50 overflow-hidden shadow-2xl group'>
								{cameraError ? (
									<div className='flex items-center justify-center h-full text-slate-500 text-[10px] font-black uppercase tracking-widest'>
										Webcam Occupied
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
								<div className='absolute bottom-6 left-6 bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl'>
									You ({user?.role})
								</div>
							</div>

							{/* Remote View */}
							<div className='relative bg-white/5 backdrop-blur-md rounded-[2.5rem] border-2 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center'>
								<video
									ref={remoteVideoRef}
									autoPlay
									playsInline
									className='w-full h-full object-cover'
								/>
								{!remoteVideoRef.current?.srcObject && (
									<div className='text-center animate-pulse'>
										<p className='text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mb-4'>
											Signal Lost
										</p>
										<p className='text-slate-500 text-xs font-medium'>
											Waiting for participant to join...
										</p>
									</div>
								)}
								<div className='absolute bottom-6 left-6 bg-slate-900/80 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10'>
									Participant
								</div>
							</div>
						</div>
					) : (
						<Whiteboard
							socket={socket}
							isTeacher={user?.role === 'teacher'}
							roomCode={roomCode}
						/>
					)}
				</div>

				{/* Chat Sidebar */}
				<div className='w-96 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden'>
					<div className='p-8 border-b border-white/10'>
						<h3 className='text-sm font-black uppercase tracking-widest text-blue-400'>
							Class Chat
						</h3>
					</div>

					<div className='flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar'>
						{messages.map((m, i) => (
							<div
								key={i}
								className={`flex flex-col ${m.sender === user?.username ? 'items-end' : 'items-start'}`}
							>
								<span className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2'>
									{m.sender}
								</span>
								<div
									className={`p-4 rounded-[1.5rem] max-w-[85%] text-sm font-medium leading-relaxed shadow-sm ${m.sender === user?.username ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'}`}
								>
									{m.content}
								</div>
							</div>
						))}
					</div>

					<div className='p-6 bg-white/5 border-t border-white/10 flex gap-3'>
						<input
							value={input}
							onChange={e => setInput(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
							placeholder='Message class...'
							className='flex-grow bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all text-sm font-medium placeholder:text-slate-600'
						/>
						<button
							onClick={sendChatMessage}
							className='bg-blue-600 p-4 rounded-2xl hover:bg-blue-500 transition-all active:scale-90 shadow-lg shadow-blue-500/20'
						>
							<svg
								className='w-5 h-5 text-white'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='3'
									d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default RoomPage
