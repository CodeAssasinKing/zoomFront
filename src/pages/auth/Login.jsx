import { useState } from 'react'
import api from '../../api/api'
import { Link, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/NotificationContext'

const Login = () => {
	const { showNotification } = useNotification()
	const [formData, setFormData] = useState({ username: '', password: '' })
	const [isLoading, setIsLoading] = useState(false) // Состояние загрузки
	const navigate = useNavigate()

	const handleLogin = async e => {
		e.preventDefault()
		setIsLoading(true) // Включаем лоадер

		try {
			const res = await api.post('/auth/login', formData)
			const user = res.data.user
			navigate('/dashboard')
		} catch (err) {
			console.log(err)
			showNotification(
				'error',
				'Login Failed',
				'Please check your credentials and try again.',
			)
		} finally {
			setIsLoading(false) // Выключаем лоадер в любом случае
		}
	}

	return (
		<div className='min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6'>
			<div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl animate-pulse' />
			<div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl animate-pulse' />

			<div className='max-w-md w-full relative z-10'>
				<Link
					to='/'
					className='inline-flex items-center text-slate-400 hover:text-blue-600 mb-8 transition-colors group font-medium'
				>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						className='h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M15 19l-7-7 7-7'
						/>
					</svg>
					Back to home
				</Link>

				<div className='bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-blue-500/10 p-10'>
					<div className='text-center mb-10'>
						<h2 className='text-4xl font-black text-slate-900 tracking-tight mb-3'>
							Welcome{' '}
							<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'>
								Back
							</span>
						</h2>
						<p className='text-slate-500 font-medium'>
							Please enter your details
						</p>
					</div>

					<form onSubmit={handleLogin} className='space-y-6'>
						<div>
							<label className='block text-sm font-bold text-slate-700 ml-1 mb-2 uppercase tracking-wider'>
								Username
							</label>
							<input
								type='text'
								required
								placeholder='Enter your username'
								className='w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 placeholder:text-slate-400'
								onChange={e =>
									setFormData({ ...formData, username: e.target.value })
								}
							/>
						</div>

						<div>
							<label className='block text-sm font-bold text-slate-700 ml-1 mb-2 uppercase tracking-wider'>
								Password
							</label>
							<input
								type='password'
								required
								placeholder='••••••••'
								className='w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 placeholder:text-slate-400'
								onChange={e =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>
						</div>

						<button
							type='submit'
							disabled={isLoading} // Блокируем кнопку при загрузке
							className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform flex items-center justify-center space-x-2 ${
								isLoading
									? 'bg-slate-400 cursor-not-allowed scale-[0.98]'
									: 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-[0.98]'
							}`}
						>
							{isLoading ? (
								<>
									<svg
										className='animate-spin h-5 w-5 text-white'
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'
									>
										<circle
											className='opacity-25'
											cx='12'
											cy='12'
											r='10'
											stroke='currentColor'
											strokeWidth='4'
										></circle>
										<path
											className='opacity-75'
											fill='currentColor'
											d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
										></path>
									</svg>
									<span>Processing...</span>
								</>
							) : (
								'Sign In'
							)}
						</button>
					</form>

					<div className='mt-10 text-center'>
						<p className='text-slate-500 font-medium'>
							Don't have an account?{' '}
							<Link
								to='/signup'
								className='text-blue-600 hover:text-indigo-600 font-bold transition-colors'
							>
								Create one for free
							</Link>
						</p>
					</div>
				</div>

				<p className='text-center mt-8 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]'>
					Secure Access • CloudSync
				</p>
			</div>
		</div>
	)
}

export default Login
