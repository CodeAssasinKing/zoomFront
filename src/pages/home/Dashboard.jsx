import React, { useState, useEffect } from 'react'
import api from '../../api/api'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AddStudents from './AddStudents'
import { Link } from 'react-router-dom'
import { useNotification } from '../../components/NotificationContext'

const Dashboard = () => {
	const { showNotification } = useNotification()
	const [user, setUser] = useState(null)
	const [rooms, setRooms] = useState([])
	const [loading, setLoading] = useState(true)

	// States for Teacher (Create)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [newRoomName, setNewRoomName] = useState('')

	// States for Student (Join)
	const [joinCode, setJoinCode] = useState('')
	const [isJoining, setIsJoining] = useState(false)

	// Modal for adding students to exact Room;
	const [openModal, setOpenModal] = useState(false)
	const [selectedRoomCode, setSelectedRoomCode] = useState('')

	const openModalWithRoomCode = code => {
		if (!code) return
		setOpenModal(true)
		setSelectedRoomCode(code)
	}

	const fetchData = async () => {
		try {
			const [userRes, roomsRes] = await Promise.all([
				api.get('/auth/me'),
				api.get('/rooms/get-rooms'),
			])
			setUser(userRes.data)
			setRooms(roomsRes.data)
		} catch (err) {
			console.error('Failed to load dashboard data', err)
			if (err.response?.status === 404) setRooms([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [])

	const handleCreateRoom = async e => {
		e.preventDefault()
		try {
			await api.post('/rooms/create-room', { room_name: newRoomName })
			setNewRoomName('')
			setIsModalOpen(false)
			fetchData()
		} catch (err) {
			console.log(err)
			showNotification('error', 'Error', 'Failed to create room')
		}
	}

	const handleJoinRoom = async e => {
		e.preventDefault()
		if (!joinCode) return
		setIsJoining(true)
		try {
			await api.post(`/rooms/join-room/${joinCode}`)
			setJoinCode('')
			fetchData()
			showNotification('success', 'Success', 'Successfully joined the room!')
		} catch (err) {
			console.log(err)
			showNotification('error', 'Error', 'Invalid room code')
		} finally {
			setIsJoining(false)
		}
	}

	const handleDeleteRoom = async code => {
		try {
			await api.delete('/rooms/delete-room', {
				params: { room_code: code },
			})
			fetchData()
			showNotification('success', 'Success', 'Successfully deleted room')
		} catch (error) {
			console.log(err)
			showNotification('error', 'Error', 'Error occurred during deleting')
		}
	}

	if (loading)
		return (
			<div className='h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4'>
				<div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
				<p className='font-bold text-slate-500 uppercase tracking-widest text-xs'>
					Loading Dashboard
				</p>
			</div>
		)

	return (
		<div className='min-h-screen flex flex-col bg-slate-50 relative overflow-hidden'>
			{/* BACKGROUND DECOR */}
			<div className='absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-3xl' />
			<div className='absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-100/40 blur-3xl' />

			<Navbar user={user} />

			<main className='flex-grow max-w-7xl w-full mx-auto px-6 py-12 relative z-10'>
				{/* Welcome Header */}
				<div className='mb-12'>
					<h2 className='text-5xl font-black text-slate-900 tracking-tight'>
						Hello,{' '}
						<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'>
							{user?.username}!
						</span>{' '}
						👋
					</h2>
					<div className='inline-flex items-center mt-3 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm'>
						<span className='w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse'></span>
						<p className='text-sm font-bold text-slate-600 uppercase tracking-tighter italic'>
							Role: {user?.role}
						</p>
					</div>
				</div>

				{/* Action Bar */}
				<div className='flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6'>
					<div>
						<h3 className='text-2xl font-black text-slate-800 tracking-tight'>
							Your Classrooms
						</h3>
						<div className='h-1 w-12 bg-blue-600 rounded-full mt-2'></div>
					</div>

					{user?.role === 'teacher' ? (
						<button
							onClick={() => setIsModalOpen(true)}
							className='group bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center'
						>
							<span className='mr-2 text-xl transition-transform group-hover:rotate-90 inline-block'>
								+
							</span>
							Create New Class
						</button>
					) : (
						<form
							onSubmit={handleJoinRoom}
							className='flex gap-3 w-full md:w-auto'
						>
							<input
								type='text'
								placeholder='Enter room code...'
								value={joinCode}
								onChange={e => setJoinCode(e.target.value.toUpperCase())}
								className='bg-white/70 backdrop-blur-md border border-white rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 w-full md:w-72 shadow-sm transition-all placeholder:text-slate-400 font-medium'
							/>
							<button
								type='submit'
								disabled={isJoining}
								className='bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 transform hover:-translate-y-1'
							>
								{isJoining ? '...' : 'Join'}
							</button>
						</form>
					)}
				</div>

				{/* Room Grid */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'>
					{rooms.length > 0 ? (
						rooms.map(room => (
							<div
								key={room.id}
								className='group bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col'
							>
								<div className='flex justify-between items-start mb-6'>
									<div className='bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.2em] border border-blue-100/50'>
										{room.code}
									</div>
								</div>

								<h4 className='text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1'>
									{room.name}
								</h4>

								<p className='text-slate-500 font-medium mb-8 text-sm italic'>
									{user?.role === 'teacher'
										? '👨‍🏫 Classroom Teacher'
										: '🎓 Enrolled Student'}
								</p>

								<div className='mt-auto space-y-3'>
									<Link
										to={`/room/${room.code}`}
										className='flex items-center justify-center w-full bg-slate-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-500/30'
									>
										Enter Classroom
									</Link>

									{user?.role === 'teacher' && (
										<div className='grid grid-cols-2 gap-3'>
											<button
												onClick={() => openModalWithRoomCode(room.code)}
												className='bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors border border-emerald-100'
											>
												Add Students
											</button>
											<button
												onClick={() => handleDeleteRoom(room.code)}
												className='bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors border border-rose-100'
											>
												Delete
											</button>
										</div>
									)}
								</div>
							</div>
						))
					) : (
						<div className='col-span-full py-24 text-center bg-white/40 backdrop-blur-sm rounded-[3rem] border-4 border-dashed border-white/60'>
							<div className='inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-3xl mb-6 text-slate-400'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='h-10 w-10'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={1.5}
										d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
									/>
								</svg>
							</div>
							<h3 className='text-xl font-bold text-slate-800'>
								No active classes yet
							</h3>
							<p className='text-slate-500 mt-2 font-medium'>
								{user?.role === 'student'
									? 'Join a class using a code from your teacher.'
									: 'Start by creating your first virtual classroom.'}
							</p>
						</div>
					)}
				</div>
			</main>

			{/* CREATE ROOM MODAL (Teacher Only) */}
			{isModalOpen && (
				<div className='fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4'>
					<div className='bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-white animate-in zoom-in duration-300'>
						<div className='text-center mb-8'>
							<h3 className='text-3xl font-black text-slate-900 mb-2'>
								Create Room
							</h3>
							<p className='text-slate-500 font-medium'>
								Build your new learning space
							</p>
						</div>

						<form onSubmit={handleCreateRoom}>
							<div className='mb-8'>
								<label className='block text-xs font-black text-slate-700 ml-1 mb-3 uppercase tracking-widest'>
									Classroom Name
								</label>
								<input
									autoFocus
									type='text'
									required
									value={newRoomName}
									onChange={e => setNewRoomName(e.target.value)}
									placeholder='e.g. Advanced Mathematics'
									className='w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium'
								/>
							</div>

							<div className='flex gap-4'>
								<button
									type='button'
									onClick={() => setIsModalOpen(false)}
									className='flex-1 px-4 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all'
								>
									Cancel
								</button>
								<button
									type='submit'
									className='flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1'
								>
									Create
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
			/>
		</div>
	)
}

export default Dashboard
