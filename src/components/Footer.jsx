import React from 'react'

const Footer = () => {
	return (
		<footer className='relative mt-auto w-full px-6 pb-8 pt-4'>
			{/* Стеклянная панель футера */}
			<div className='max-w-7xl mx-auto bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-xl shadow-blue-500/5 transition-all duration-300'>
				<div className='flex flex-col md:flex-row justify-between items-center gap-8'>
					{/* Logo & Copyright */}
					<div className='text-center md:text-left'>
						<div className='flex items-center justify-center md:justify-start gap-2 mb-3'>
							<div className='w-2 h-2 rounded-full bg-blue-600 animate-pulse' />
							<span className='text-lg font-black text-slate-900 tracking-tighter'>
								EduStream
							</span>
						</div>
						<p className='text-slate-400 text-xs font-bold uppercase tracking-[0.15em]'>
							&copy; {new Date().getFullYear()} • Empowering Education
						</p>
					</div>

					{/* Links Section */}
					<div className='flex flex-wrap justify-center gap-8'>
						{[
							{ name: 'Privacy Policy', href: '#' },
							{ name: 'Terms of Service', href: '#' },
							{ name: 'Support', href: '#' },
						].map(link => (
							<a
								key={link.name}
								href={link.href}
								className='text-xs font-black text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors duration-300 relative group'
							>
								{link.name}
								<span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full' />
							</a>
						))}
					</div>
				</div>

				{/* Bottom Line Decoration */}
				<div className='mt-8 pt-8 border-t border-slate-100/50 flex justify-center'>
					<p className='text-[10px] text-slate-300 font-medium uppercase tracking-[0.3em]'>
						CloudSync Technology • Secure Access
					</p>
				</div>
			</div>
		</footer>
	)
}

export default Footer
