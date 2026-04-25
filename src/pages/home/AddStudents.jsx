import React, { useEffect, useState } from 'react'
import api from '../../api/api'
import { useNotification } from '../../components/NotificationContext'

function AddStudents({ room_code, onClose, isOpen }) {
	const { showNotification } = useNotification()
	const [listOfStudents, setListOfStudents] = useState([])
	const [selectedIds, setSelectedIds] = useState([])
	const [loading, setLoading] = useState(false)

	const fetchStudents = async () => {
		try {
			const response = await api.get('/users/students')
			setListOfStudents(response.data)
		} catch (err) {
			console.error('Failed to fetch students', err)
		}
	}

	useEffect(() => {
		if (isOpen) {
			fetchStudents()
			setSelectedIds([]) // Сбрасываем выбор при открытии
		}
	}, [isOpen])

	const toggleStudent = id => {
		setSelectedIds(prev =>
			prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id],
		)
	}

	const handleAddStudents = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			await api.post(`/rooms/add-students/${room_code}`, selectedIds)
			showNotification(
				'success',
				'Students Added',
				`Successfully added ${selectedIds.length} students to the classroom.`,
			)
			onClose()
		} catch (err) {
			showNotification(
				'error',
				'Action Failed',
				'Could not add students. Please try again later.',
			)
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
			{/* Backdrop */}
			<div
				className='absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in'
				onClick={onClose}
			/>

			{/* Modal Container */}
			<div className='relative bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white overflow-hidden flex flex-col max-h-[85vh] animate-modal-in'>
				{/* Декоративное пятно на фоне модалки */}
				<div className='absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none' />

				{/* Header */}
				<div className='p-8 border-b border-white/50 relative z-10'>
					<h3 className='text-3xl font-black text-slate-900 tracking-tight'>
						Add <span className='text-blue-600'>Students</span>
					</h3>
					<div className='mt-2 inline-flex items-center px-3 py-1 bg-blue-50 rounded-lg border border-blue-100'>
						<span className='text-[10px] font-black text-blue-400 uppercase tracking-widest mr-2'>
							Room:
						</span>
						<span className='font-mono font-bold text-blue-600 text-sm'>
							{room_code}
						</span>
					</div>
				</div>

				{/* Student List */}
				<div className='flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar relative z-10'>
					{listOfStudents.length > 0 ? (
						listOfStudents.map(student => (
							<div
								key={student.id}
								onClick={() => toggleStudent(student.id)}
								className={`group flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
									selectedIds.includes(student.id)
										? 'border-blue-600 bg-blue-600/5 shadow-lg shadow-blue-500/5'
										: 'border-transparent bg-white/50 hover:bg-white hover:border-slate-200'
								}`}
							>
								<div className='flex items-center space-x-4'>
									<div
										className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
											selectedIds.includes(student.id)
												? 'bg-blue-600 text-white'
												: 'bg-slate-100 text-slate-500'
										}`}
									>
										{student.username.charAt(0).toUpperCase()}
									</div>
									<div className='flex flex-col'>
										<span className='font-bold text-slate-800 tracking-tight'>
											{student.username}
										</span>
										<span className='text-xs font-medium text-slate-400'>
											{student.email}
										</span>
									</div>
								</div>

								{/* Checkbox Icon */}
								<div
									className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
										selectedIds.includes(student.id)
											? 'bg-blue-600 border-blue-600 scale-110 shadow-lg shadow-blue-200'
											: 'border-slate-200 bg-white group-hover:border-slate-300'
									}`}
								>
									{selectedIds.includes(student.id) && (
										<svg
											className='w-4 h-4 text-white'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='3.5'
												d='M5 13l4 4L19 7'
											/>
										</svg>
									)}
								</div>
							</div>
						))
					) : (
						<div className='flex flex-col items-center justify-center py-12 text-slate-400'>
							<div className='w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4'>
								<svg
									className='w-8 h-8 opacity-20'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth='2'
										d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
									/>
								</svg>
							</div>
							<p className='font-bold text-sm uppercase tracking-widest opacity-40'>
								No students found
							</p>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className='p-8 bg-white/50 backdrop-blur-md border-t border-white/50 flex gap-4 relative z-10'>
					<button
						onClick={onClose}
						className='flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95'
					>
						Cancel
					</button>
					<button
						onClick={handleAddStudents}
						disabled={selectedIds.length === 0 || loading}
						className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center space-x-2 ${
							selectedIds.length === 0 || loading
								? 'bg-slate-300 cursor-not-allowed shadow-none'
								: 'bg-slate-900 hover:bg-blue-600 shadow-xl shadow-blue-500/20 hover:-translate-y-1'
						}`}
					>
						{loading ? (
							<svg
								className='animate-spin h-5 w-5 text-white'
								viewBox='0 0 24 24'
							>
								<circle
									className='opacity-25'
									cx='12'
									cy='12'
									r='10'
									stroke='currentColor'
									strokeWidth='4'
									fill='none'
								></circle>
								<path
									className='opacity-75'
									fill='currentColor'
									d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
								></path>
							</svg>
						) : (
							<span>
								Add {selectedIds.length > 0 ? selectedIds.length : ''} Students
							</span>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default AddStudents
