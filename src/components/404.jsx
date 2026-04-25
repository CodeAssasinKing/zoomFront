import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

const NotFound = () => {
	const navigate = useNavigate()

	return (
		<div className='min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden'>
			{/* BACKGROUND ELEMENTS - Декоративные сферы */}
			<div className='absolute top-[20%] left-[10%] w-64 h-64 rounded-full bg-blue-100/50 blur-3xl animate-pulse' />
			<div className='absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-indigo-100/50 blur-3xl animate-pulse' />
			<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-slate-100/30 blur-[100px]' />

			<div className='max-w-2xl w-full relative z-10 text-center'>
				{/* Main Glass Card */}
				<div className='bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl shadow-blue-500/10 p-12 md:p-20'>
					{/* Large Animated 404 Text */}
					<div className='relative inline-block mb-8'>
						<h1 className='text-[120px] md:text-[180px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-700/80'>
							404
						</h1>
						{/* Маленькая парящая плашка */}
						<div className='absolute -top-4 -right-8 bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-2xl rotate-12 shadow-lg shadow-blue-500/40 animate-bounce'>
							OOPS!
						</div>
					</div>

					<div className='space-y-4 mb-12'>
						<h2 className='text-3xl md:text-4xl font-black text-slate-900 tracking-tight'>
							Lost in{' '}
							<span className='text-blue-600 font-black italic'>EduSpace?</span>
						</h2>
						<p className='text-slate-500 font-medium max-w-md mx-auto leading-relaxed'>
							The page you are looking for has been moved, deleted, or perhaps
							never existed in this dimension.
						</p>
					</div>

					{/* Action Buttons */}
					<div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
						<button
							onClick={() => navigate(-1)}
							className='w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2'
						>
							<svg
								className='w-5 h-5'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2.5'
									d='M10 19l-7-7m0 0l7-7m-7 7h18'
								/>
							</svg>
							Go Back
						</button>

						<Link
							to='/dashboard'
							className='w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-blue-600 shadow-xl shadow-slate-200 hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2'
						>
							<svg
								className='w-5 h-5'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2.5'
									d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
								/>
							</svg>
							Dashboard
						</Link>
					</div>
				</div>

				{/* Footer Decoration */}
				<div className='mt-12'>
					<p className='text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]'>
						Error Code: RPC_0x404_NOT_FOUND
					</p>
				</div>
			</div>
		</div>
	)
}

export default NotFound
