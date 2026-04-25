import React from 'react'
import { Link } from 'react-router-dom'

function Home() {
	return (
		/* Улучшен фон: добавили радиальный градиент для глубины */
		<div className='min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6'>
			{/* Декоративные элементы на фоне */}
			<div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl animate-pulse' />
			<div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl animate-pulse' />

			<div className='max-w-2xl w-full text-center relative z-10'>
				{/* Hero Section */}
				<div className='mb-12'>
					{/* Иконка: добавили эффект свечения и легкое покачивание */}
					<div className='inline-block p-4 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white mb-8 shadow-2xl shadow-blue-200 animate-bounce-slow'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							className='h-12 w-12'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={1.5}
								d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
							/>
						</svg>
					</div>

					<h1 className='text-6xl font-black text-slate-900 tracking-tight mb-6'>
						Next-Gen <br />
						<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'>
							Virtual Learning
						</span>
					</h1>
					<p className='text-xl text-slate-500 max-w-lg mx-auto leading-relaxed font-medium'>
						Connect with teachers and students around the world in real-time
						with <span className='text-slate-800'>high-quality</span> video and
						chat.
					</p>
				</div>

				{/* Action Cards */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-8 mt-10'>
					{/* Login Card: Glassmorphism effect */}
					<Link
						to='/login'
						className='group p-8 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-500 text-left'
					>
						<div className='h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='h-6 w-6'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
								/>
							</svg>
						</div>
						<h3 className='text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors'>
							Welcome Back
						</h3>
						<p className='text-slate-500 mt-2 mb-6 leading-snug'>
							Already have an account? Sign in to access your classes.
						</p>
						<span className='inline-flex items-center text-blue-600 font-bold uppercase tracking-wider text-xs'>
							Login to Account
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={3}
									d='M9 5l7 7-7 7'
								/>
							</svg>
						</span>
					</Link>

					{/* Signup Card */}
					<Link
						to='/signup'
						className='group p-8 bg-slate-900 rounded-[2rem] shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-2 transition-all duration-500 text-left relative overflow-hidden'
					>
						{/* Декоративное пятно внутри карты */}
						<div className='absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/40 transition-colors' />

						<div className='h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-500 transition-all duration-500 text-white'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='h-6 w-6'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
								/>
							</svg>
						</div>
						<h3 className='text-2xl font-bold text-white transition-colors'>
							Join Us
						</h3>
						<p className='text-slate-400 mt-2 mb-6 leading-snug'>
							New here? Create a free account to start learning or teaching.
						</p>
						<span className='inline-flex items-center text-indigo-400 font-bold uppercase tracking-wider text-xs'>
							Create Account
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={3}
									d='M9 5l7 7-7 7'
								/>
							</svg>
						</span>
					</Link>
				</div>

				{/* Footer info */}
				<div className='mt-16 flex items-center justify-center space-x-4'>
					<span className='h-px w-8 bg-slate-200'></span>
					<p className='text-slate-400 text-sm font-medium tracking-widest uppercase'>
						Secure • Fast • WebRTC
					</p>
					<span className='h-px w-8 bg-slate-200'></span>
				</div>
			</div>
		</div>
	)
}

export default Home
