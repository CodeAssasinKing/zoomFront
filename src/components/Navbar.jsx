import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Navbar = ({ user }) => {
	const navigate = useNavigate()

	const handleLogout = () => {
		// Очистка всех куки файлов
		const cookies = document.cookie.split(';')

		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i]
			const eqPos = cookie.indexOf('=')
			const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
			// Очищаем куки, устанавливая дату истечения в прошлом
			document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
		}

		// Дополнительно можно очистить localStorage, если там есть токены
		localStorage.clear()

		// Перенаправляем на логин
		navigate('/login')
	}

	return (
		<nav className='sticky top-0 z-[100] w-full px-6 py-4'>
			{/* Стекло-эффект для контейнера навбара */}
			<div className='max-w-7xl mx-auto'>
				<div className='bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] px-6 sm:px-8 shadow-xl shadow-blue-500/5 transition-all duration-300'>
					<div className='flex justify-between h-20 items-center'>
						{/* Logo */}
						<Link
							to='/'
							className='flex items-center gap-3 group transition-transform active:scale-95'
						>
							<div className='bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-transform duration-300'>
								<svg
									className='w-6 h-6 text-white'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth='2.5'
										d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
									/>
								</svg>
							</div>
							<span className='text-2xl font-black text-slate-900 tracking-tighter'>
								Edu<span className='text-blue-600'>Stream</span>
							</span>
						</Link>

						{/* User Section */}
						<div className='flex items-center gap-6'>
							{/* Profile Info */}
							<div className='hidden md:flex flex-col items-end border-r border-slate-200 pr-6'>
								<p className='text-sm font-black text-slate-900 tracking-tight leading-none mb-1'>
									{user?.username || 'Guest User'}
								</p>
								<div className='flex items-center gap-1.5'>
									<span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
									<p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none'>
										{user?.role || 'Visitor'}
									</p>
								</div>
							</div>

							{/* Logout Button */}
							<button
								onClick={handleLogout}
								className='group relative flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white transition-all duration-300 active:scale-95 border border-rose-100/50 shadow-sm'
							>
								<svg
									className='w-4 h-4 transition-transform group-hover:translate-x-1'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth='2.5'
										d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
									/>
								</svg>
								<span className='tracking-tight'>Выйти</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</nav>
	)
}

export default Navbar
