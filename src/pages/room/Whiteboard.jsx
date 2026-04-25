import React, { useRef, useEffect, useState } from 'react'

const Whiteboard = ({ socket, isTeacher, roomCode }) => {
	const canvasRef = useRef(null)
	const [isDrawing, setIsDrawing] = useState(false)
	const [color, setColor] = useState('#3b82f6') // Blue-500

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')

		// Подстройка размера под контейнер
		const resizeCanvas = () => {
			canvas.width = canvas.parentElement.offsetWidth
			canvas.height = canvas.parentElement.offsetHeight
			ctx.lineCap = 'round'
			ctx.lineWidth = 3
		}

		resizeCanvas()
		window.addEventListener('resize', resizeCanvas)

		// Слушаем данные от других пользователей (для учеников)
		const handleWsMessage = event => {
			const data = JSON.parse(event.data)
			if (data.type === 'draw') {
				const { x, y, prevX, prevY, drawColor } = data.content
				ctx.strokeStyle = drawColor
				ctx.beginPath()
				ctx.moveTo(prevX, prevY)
				ctx.lineTo(x, y)
				ctx.stroke()
			} else if (data.type === 'clear_board') {
				ctx.clearRect(0, 0, canvas.width, canvas.height)
			}
		}

		if (socket.current) {
			socket.current.addEventListener('message', handleWsMessage)
		}

		return () => {
			window.removeEventListener('resize', resizeCanvas)
			if (socket.current)
				socket.current.removeEventListener('message', handleWsMessage)
		}
	}, [socket])

	const startDrawing = e => {
		if (!isTeacher) return
		const { offsetX, offsetY } = e.nativeEvent
		setIsDrawing(true)
		canvasRef.current.lastX = offsetX
		canvasRef.current.lastY = offsetY
	}

	const draw = e => {
		if (!isDrawing || !isTeacher) return
		const { offsetX, offsetY } = e.nativeEvent
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')

		ctx.strokeStyle = color
		ctx.beginPath()
		ctx.moveTo(canvas.lastX, canvas.lastY)
		ctx.lineTo(offsetX, offsetY)
		ctx.stroke()

		// Отправляем координаты через сокет
		socket.current.send(
			JSON.stringify({
				type: 'draw',
				content: {
					x: offsetX,
					y: offsetY,
					prevX: canvas.lastX,
					prevY: canvas.lastY,
					drawColor: color,
				},
			}),
		)

		canvas.lastX = offsetX
		canvas.lastY = offsetY
	}

	const stopDrawing = () => setIsDrawing(false)

	const clearBoard = () => {
		const canvas = canvasRef.current
		canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
		socket.current.send(JSON.stringify({ type: 'clear_board' }))
	}

	return (
		<div className='relative w-full h-full bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden group'>
			<canvas
				ref={canvasRef}
				onMouseDown={startDrawing}
				onMouseMove={draw}
				onMouseUp={stopDrawing}
				onMouseLeave={stopDrawing}
				className={`w-full h-full ${isTeacher ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
			/>

			{isTeacher && (
				<div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl p-3 rounded-2xl border border-white/20 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity'>
					<input
						type='color'
						value={color}
						onChange={e => setColor(e.target.value)}
						className='w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none'
					/>
					<button
						onClick={clearBoard}
						className='px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all'
					>
						Clear Board
					</button>
				</div>
			)}

			<div className='absolute top-6 left-6 px-4 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10'>
				<span className='text-[10px] font-black text-white/50 uppercase tracking-[0.2em]'>
					Live Board
				</span>
			</div>
		</div>
	)
}

export default Whiteboard
