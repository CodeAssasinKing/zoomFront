import React, { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
	const [notification, setNotification] = useState({
		isOpen: false,
		type: 'success', // 'success' | 'error'
		title: '',
		description: '',
	})

	const showNotification = useCallback((type, title, description) => {
		setNotification({ isOpen: true, type, title, description })
	}, [])

	const closeNotification = () => {
		setNotification(prev => ({ ...prev, isOpen: false }))
	}

	return (
		<NotificationContext.Provider value={{ showNotification }}>
			{children}

			{/* Overlay */}
			{notification.isOpen && (
				<div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
					{/* Backdrop */}
					<div
						className='absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in'
						onClick={closeNotification}
					/>

					{/* Modal Content */}
					<div className='relative bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-white animate-modal-in overflow-hidden'>
						{/* Декоративное пятно внутри */}
						<div
							className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${
								notification.type === 'success'
									? 'bg-emerald-500'
									: 'bg-rose-500'
							}`}
						/>

						<div className='text-center relative z-10'>
							{/* Icon Container */}
							<div
								className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-lg ${
									notification.type === 'success'
										? 'bg-emerald-100 text-emerald-600 shadow-emerald-200'
										: 'bg-rose-100 text-rose-600 shadow-rose-200'
								}`}
							>
								{notification.type === 'success' ? (
									<svg
										className='w-10 h-10'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2.5}
											d='M5 13l4 4L19 7'
										/>
									</svg>
								) : (
									<svg
										className='w-10 h-10'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2.5}
											d='M6 18L18 6M6 6l12 12'
										/>
									</svg>
								)}
							</div>

							<h3 className='text-2xl font-black text-slate-900 mb-2'>
								{notification.title}
							</h3>
							<p className='text-slate-500 font-medium leading-relaxed mb-8'>
								{notification.description}
							</p>

							<button
								onClick={closeNotification}
								className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] shadow-xl ${
									notification.type === 'success'
										? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
										: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
								}`}
							>
								Continue
							</button>
						</div>
					</div>
				</div>
			)}
		</NotificationContext.Provider>
	)
}

export const useNotification = () => useContext(NotificationContext)
