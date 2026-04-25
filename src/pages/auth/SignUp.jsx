import { useState, useMemo } from 'react'
import api from '../../api/api'
import { Link, useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/NotificationContext'

const SignUp = () => {
	const { showNotification } = useNotification()
	const navigate = useNavigate()

	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		role: 'student',
	})
	const [isLoading, setIsLoading] = useState(false)

	// Функция проверки сложности пароля
	const passwordStrength = useMemo(() => {
		const pass = formData.password
		if (!pass) return { score: 0, label: '', color: 'bg-slate-200' }

		let score = 0
		if (pass.length > 6) score++
		if (/[A-Z]/.test(pass)) score++
		if (/[0-9]/.test(pass)) score++
		if (/[^A-Za-z0-9]/.test(pass)) score++

		const levels = [
			{ label: 'Weak', color: 'bg-rose-500' },
			{ label: 'Fair', color: 'bg-orange-400' },
			{ label: 'Good', color: 'bg-blue-500' },
			{ label: 'Strong', color: 'bg-emerald-500' },
		]

		return { score, ...(levels[score - 1] || levels[0]) }
	}, [formData.password])

	const handleSubmit = async e => {
		e.preventDefault()

		// Проверка сложности пароля перед отправкой
		if (passwordStrength.score < 2) {
			showNotification(
				'error',
				'Weak Password',
				'Please create a stronger password to protect your account.',
			)
			return
		}

		setIsLoading(true)
		try {
			// 1. Создаем аккаунт
			await api.post('/auth/signup', formData)

			// 2. Сразу логинимся, используя те же данные из formData
			// Мы передаем только username и password, которые ожидает эндпоинт логина
			const loginRes = await api.post('/auth/login', {
				username: formData.username,
				password: formData.password,
			})

			// Получаем данные пользователя и сохраняем их (если нужно)
			const user = loginRes.data.user
			console.log('Logged in as:', user)

			showNotification(
				'success',
				'Account Created!',
				`Welcome, ${formData.username}! You have been automatically logged in.`,
			)

			// 3. Переходим в дашборд
			navigate('/dashboard')
		} catch (err) {
			console.error(err)
			showNotification(
				'error',
				'Action Failed',
				err.response?.data?.detail ||
					'Something went wrong during registration.',
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6'>
			{/* BACKGROUND ELEMENTS */}
			<div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl animate-pulse' />
			<div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl animate-pulse' />

			<div className='max-w-md w-full relative z-10'>
				<Link
					to='/login'
					className='inline-flex items-center text-slate-400 hover:text-blue-600 mb-6 transition-colors group font-medium'
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
					Back to login
				</Link>

				<div className='bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-blue-500/10 p-10'>
					<div className='text-center mb-8'>
						<h2 className='text-4xl font-black text-slate-900 tracking-tight mb-3'>
							Join{' '}
							<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'>
								Us
							</span>
						</h2>
						<p className='text-slate-500 font-medium'>
							Create your professional account
						</p>
					</div>

					<form onSubmit={handleSubmit} className='space-y-5'>
						{/* USERNAME */}
						<div>
							<label className='block text-xs font-bold text-slate-700 ml-1 mb-2 uppercase tracking-widest'>
								Username
							</label>
							<input
								type='text'
								required
								className='w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400'
								onChange={e =>
									setFormData({ ...formData, username: e.target.value })
								}
							/>
						</div>

						{/* EMAIL */}
						<div>
							<label className='block text-xs font-bold text-slate-700 ml-1 mb-2 uppercase tracking-widest'>
								Email Address
							</label>
							<input
								type='email'
								required
								className='w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400'
								onChange={e =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>

						{/* PASSWORD */}
						<div>
							<label className='block text-xs font-bold text-slate-700 ml-1 mb-2 uppercase tracking-widest'>
								Password
							</label>
							<input
								type='password'
								required
								className='w-full px-6 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all'
								onChange={e =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>

							{/* STRENGTH INDICATOR */}
							{formData.password && (
								<div className='mt-3 px-1'>
									<div className='flex justify-between items-center mb-1'>
										<span className='text-[10px] font-bold uppercase text-slate-400 tracking-tighter'>
											Strength: {passwordStrength.label}
										</span>
									</div>
									<div className='h-1.5 w-full bg-slate-200 rounded-full overflow-hidden'>
										<div
											className={`h-full transition-all duration-500 ${passwordStrength.color}`}
											style={{
												width: `${(passwordStrength.score / 4) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
						</div>

						{/* ROLE SELECT */}
						<div>
							<label className='block text-xs font-bold text-slate-700 ml-1 mb-2 uppercase tracking-widest'>
								I am a
							</label>
							<div className='grid grid-cols-2 gap-4'>
								{['student', 'teacher'].map(r => (
									<button
										key={r}
										type='button'
										onClick={() => setFormData({ ...formData, role: r })}
										className={`py-3 rounded-xl font-bold capitalize transition-all border-2 ${
											formData.role === r
												? 'border-blue-600 bg-blue-50 text-blue-600'
												: 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200'
										}`}
									>
										{r}
									</button>
								))}
							</div>
						</div>

						<button
							type='submit'
							disabled={isLoading}
							className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform flex items-center justify-center space-x-2 mt-4 ${
								isLoading
									? 'bg-slate-400 cursor-not-allowed scale-[0.98]'
									: 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-[0.98]'
							}`}
						>
							{isLoading ? (
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
								'Create Account'
							)}
						</button>
					</form>

					<div className='mt-8 text-center'>
						<p className='text-slate-500 font-medium'>
							Have an account?{' '}
							<Link
								to='/login'
								className='text-blue-600 hover:text-indigo-600 font-bold transition-colors'
							>
								Sign In
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default SignUp
