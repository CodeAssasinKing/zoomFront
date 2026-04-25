import React, { useRef, useEffect, useState, useCallback } from 'react'

const COLORS = [
	'#1e1e1e',
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
	'#ffffff',
]
const TOOLS = {
	pen: { label: 'Pen', icon: '✏️', cursor: 'crosshair' },
	eraser: { label: 'Eraser', icon: '⬜', cursor: 'cell' },
	line: { label: 'Line', icon: '╱', cursor: 'crosshair' },
	rect: { label: 'Rect', icon: '▭', cursor: 'crosshair' },
	circle: { label: 'Circle', icon: '○', cursor: 'crosshair' },
}

const Whiteboard = ({ socket, isTeacher, roomCode }) => {
	const canvasRef = useRef(null)
	const overlayRef = useRef(null)
	const [tool, setTool] = useState('pen')
	const [color, setColor] = useState('#1e1e1e')
	const [lineWidth, setLineWidth] = useState(3)
	const [isDrawing, setIsDrawing] = useState(false)
	const startPos = useRef(null)
	const snapshot = useRef(null)

	// Resize canvas on mount and window resize
	useEffect(() => {
		const canvas = canvasRef.current
		const overlay = overlayRef.current

		const resize = () => {
			const parent = canvas.parentElement
			// Save current drawing
			const imgData = canvas
				.getContext('2d')
				.getImageData(0, 0, canvas.width, canvas.height)
			canvas.width = parent.offsetWidth
			canvas.height = parent.offsetHeight
			overlay.width = parent.offsetWidth
			overlay.height = parent.offsetHeight
			// Restore drawing
			canvas.getContext('2d').putImageData(imgData, 0, 0)
			// Re-style main canvas
			const ctx = canvas.getContext('2d')
			ctx.fillStyle = '#ffffff'
			ctx.fillRect(0, 0, canvas.width, canvas.height)
		}

		// Initial fill white
		canvas.width = canvas.parentElement.offsetWidth
		canvas.height = canvas.parentElement.offsetHeight
		overlay.width = canvas.parentElement.offsetWidth
		overlay.height = canvas.parentElement.offsetHeight
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		window.addEventListener('resize', resize)
		return () => window.removeEventListener('resize', resize)
	}, [])

	// Listen to remote draw events
	useEffect(() => {
		if (!socket?.current) return

		const handleMessage = event => {
			let data
			try {
				data = JSON.parse(event.data)
			} catch {
				return
			}

			const canvas = canvasRef.current
			const ctx = canvas.getContext('2d')

			if (data.type === 'draw_stroke') {
				const { points, strokeColor, strokeWidth } = data.content
				if (!points || points.length < 2) return
				ctx.save()
				ctx.globalCompositeOperation =
					strokeColor === 'eraser' ? 'destination-out' : 'source-over'
				ctx.strokeStyle =
					strokeColor === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor
				ctx.lineWidth = strokeWidth
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				ctx.beginPath()
				ctx.moveTo(points[0].x, points[0].y)
				points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
				ctx.stroke()
				ctx.restore()
			} else if (data.type === 'draw_shape') {
				const { shape, x1, y1, x2, y2, strokeColor, strokeWidth } = data.content
				drawShape(ctx, shape, x1, y1, x2, y2, strokeColor, strokeWidth)
			} else if (data.type === 'clear_board') {
				ctx.fillStyle = '#ffffff'
				ctx.fillRect(0, 0, canvas.width, canvas.height)
			}
		}

		socket.current.addEventListener('message', handleMessage)
		return () => socket.current?.removeEventListener('message', handleMessage)
	}, [socket])

	const drawShape = (ctx, shape, x1, y1, x2, y2, strokeColor, strokeWidth) => {
		ctx.save()
		ctx.strokeStyle = strokeColor
		ctx.lineWidth = strokeWidth
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.beginPath()
		if (shape === 'line') {
			ctx.moveTo(x1, y1)
			ctx.lineTo(x2, y2)
		} else if (shape === 'rect') {
			ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
		} else if (shape === 'circle') {
			const rx = Math.abs(x2 - x1) / 2
			const ry = Math.abs(y2 - y1) / 2
			ctx.ellipse(
				x1 + (x2 - x1) / 2,
				y1 + (y2 - y1) / 2,
				rx,
				ry,
				0,
				0,
				2 * Math.PI,
			)
		}
		ctx.stroke()
		ctx.restore()
	}

	const penPoints = useRef([])

	const getPos = e => {
		const canvas = overlayRef.current
		const rect = canvas.getBoundingClientRect()
		const touch = e.touches?.[0] || e
		return {
			x: (touch.clientX - rect.left) * (canvas.width / rect.width),
			y: (touch.clientY - rect.top) * (canvas.height / rect.height),
		}
	}

	const onPointerDown = e => {
		if (!isTeacher) return
		e.preventDefault()
		const pos = getPos(e)
		startPos.current = pos
		penPoints.current = [pos]

		if (['line', 'rect', 'circle'].includes(tool)) {
			// Save canvas snapshot for shape preview
			snapshot.current = canvasRef.current
				.getContext('2d')
				.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
		}
		setIsDrawing(true)
	}

	const onPointerMove = e => {
		if (!isDrawing || !isTeacher) return
		e.preventDefault()
		const pos = getPos(e)
		const overlayCtx = overlayRef.current.getContext('2d')

		if (tool === 'pen' || tool === 'eraser') {
			// Draw on main canvas directly
			const mainCtx = canvasRef.current.getContext('2d')
			const prev = penPoints.current[penPoints.current.length - 1]
			mainCtx.save()
			mainCtx.globalCompositeOperation =
				tool === 'eraser' ? 'destination-out' : 'source-over'
			mainCtx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color
			mainCtx.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth
			mainCtx.lineCap = 'round'
			mainCtx.lineJoin = 'round'
			mainCtx.beginPath()
			mainCtx.moveTo(prev.x, prev.y)
			mainCtx.lineTo(pos.x, pos.y)
			mainCtx.stroke()
			mainCtx.restore()
			penPoints.current.push(pos)
		} else {
			// Preview shape on overlay canvas
			overlayCtx.clearRect(
				0,
				0,
				overlayRef.current.width,
				overlayRef.current.height,
			)
			const { x: x1, y: y1 } = startPos.current
			drawShape(overlayCtx, tool, x1, y1, pos.x, pos.y, color, lineWidth)
		}
	}

	const onPointerUp = e => {
		if (!isDrawing || !isTeacher) return
		e.preventDefault()
		const pos = getPos(e)
		const overlayCtx = overlayRef.current.getContext('2d')
		overlayCtx.clearRect(
			0,
			0,
			overlayRef.current.width,
			overlayRef.current.height,
		)

		if (tool === 'pen' || tool === 'eraser') {
			// Emit full stroke
			if (socket.current?.readyState === WebSocket.OPEN) {
				socket.current.send(
					JSON.stringify({
						type: 'draw_stroke',
						content: {
							points: penPoints.current,
							strokeColor: tool === 'eraser' ? 'eraser' : color,
							strokeWidth: tool === 'eraser' ? lineWidth * 5 : lineWidth,
						},
					}),
				)
			}
			penPoints.current = []
		} else {
			// Commit shape to main canvas
			const mainCtx = canvasRef.current.getContext('2d')
			const { x: x1, y: y1 } = startPos.current
			drawShape(mainCtx, tool, x1, y1, pos.x, pos.y, color, lineWidth)
			if (socket.current?.readyState === WebSocket.OPEN) {
				socket.current.send(
					JSON.stringify({
						type: 'draw_shape',
						content: {
							shape: tool,
							x1,
							y1,
							x2: pos.x,
							y2: pos.y,
							strokeColor: color,
							strokeWidth: lineWidth,
						},
					}),
				)
			}
		}

		setIsDrawing(false)
		startPos.current = null
	}

	const clearBoard = () => {
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		overlayRef.current
			.getContext('2d')
			.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)
		if (socket.current?.readyState === WebSocket.OPEN) {
			socket.current.send(JSON.stringify({ type: 'clear_board' }))
		}
	}

	return (
		<div className='relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200/20'>
			{/* White canvas */}
			<canvas
				ref={canvasRef}
				className='absolute inset-0 w-full h-full bg-white'
				style={{ zIndex: 1 }}
			/>
			{/* Overlay for shape preview */}
			<canvas
				ref={overlayRef}
				onMouseDown={onPointerDown}
				onMouseMove={onPointerMove}
				onMouseUp={onPointerUp}
				onMouseLeave={onPointerUp}
				onTouchStart={onPointerDown}
				onTouchMove={onPointerMove}
				onTouchEnd={onPointerUp}
				className='absolute inset-0 w-full h-full'
				style={{
					zIndex: 2,
					cursor: isTeacher ? TOOLS[tool]?.cursor : 'default',
					touchAction: 'none',
				}}
			/>

			{/* Teacher Toolbar */}
			{isTeacher ? (
				<div
					className='absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-slate-200'
					style={{ zIndex: 10, background: '#1e293b' }}
				>
					{/* Tool buttons */}
					<div className='flex items-center gap-1 pr-3 border-r border-slate-600'>
						{Object.entries(TOOLS).map(([key, val]) => (
							<button
								key={key}
								title={val.label}
								onClick={() => setTool(key)}
								className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all font-bold
									${tool === key ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700'}`}
							>
								{val.icon}
							</button>
						))}
					</div>

					{/* Color picker */}
					<div className='flex items-center gap-1 pr-3 border-r border-slate-600'>
						{COLORS.map(c => (
							<button
								key={c}
								onClick={() => setColor(c)}
								className='w-6 h-6 rounded-full border-2 transition-transform hover:scale-110'
								style={{
									background: c,
									borderColor: color === c ? '#60a5fa' : 'transparent',
									outline: color === c ? '2px solid #3b82f6' : 'none',
									outlineOffset: '1px',
								}}
							/>
						))}
						<input
							type='color'
							value={color}
							onChange={e => setColor(e.target.value)}
							className='w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent'
							title='Custom color'
						/>
					</div>

					{/* Line width */}
					<div className='flex items-center gap-2 pr-3 border-r border-slate-600'>
						{[2, 4, 8, 14].map(w => (
							<button
								key={w}
								onClick={() => setLineWidth(w)}
								className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all
									${lineWidth === w ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
							>
								<div
									className='rounded-full bg-white'
									style={{
										width: Math.min(w * 2, 24),
										height: Math.min(w * 2, 24),
									}}
								/>
							</button>
						))}
					</div>

					{/* Clear */}
					<button
						onClick={clearBoard}
						className='px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all'
					>
						Clear
					</button>
				</div>
			) : (
				/* Student read-only badge */
				<div
					className='absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-bold tracking-widest text-slate-400 border border-slate-600'
					style={{ zIndex: 10, background: '#1e293b' }}
				>
					VIEW ONLY — LIVE BOARD
				</div>
			)}

			{/* Top label */}
			<div
				className='absolute top-4 left-5 px-3 py-1 rounded-full text-xs font-bold tracking-widest text-slate-400 border border-slate-700'
				style={{ zIndex: 10, background: '#1e293b' }}
			>
				{isTeacher ? '✏️ WHITEBOARD — TEACHER' : '👁 WHITEBOARD — STUDENT'}
			</div>
		</div>
	)
}

export default Whiteboard
