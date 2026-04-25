import React, { useRef, useEffect, useState } from 'react'
import {
	Pencil,
	Eraser,
	Minus,
	Square,
	Circle,
	Trash2,
	Eye,
	PenLine,
} from 'lucide-react'

const COLORS = [
	'#111827',
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
	'#ffffff',
]

const TOOLS = [
	{ key: 'pen', label: 'Pen', Icon: Pencil, cursor: 'crosshair' },
	{ key: 'eraser', label: 'Eraser', Icon: Eraser, cursor: 'cell' },
	{ key: 'line', label: 'Line', Icon: Minus, cursor: 'crosshair' },
	{ key: 'rect', label: 'Rect', Icon: Square, cursor: 'crosshair' },
	{ key: 'circle', label: 'Circle', Icon: Circle, cursor: 'crosshair' },
]

const WIDTHS = [2, 4, 8, 14]

// ─── pure draw helper (no state) ─────────────────────────────────────────────
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
		ctx.ellipse(
			(x1 + x2) / 2,
			(y1 + y2) / 2,
			Math.abs(x2 - x1) / 2,
			Math.abs(y2 - y1) / 2,
			0,
			0,
			2 * Math.PI,
		)
	}
	ctx.stroke()
	ctx.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
const Whiteboard = ({ socket, isTeacher }) => {
	const containerRef = useRef(null)
	const canvasRef = useRef(null)
	const overlayRef = useRef(null)

	// Keep mutable drawing state in refs so addEventListener callbacks
	// never capture stale closure values.
	const toolRef = useRef('pen')
	const colorRef = useRef('#111827')
	const lwRef = useRef(3)
	const isDrawing = useRef(false)
	const startPos = useRef(null)
	const penPoints = useRef([])

	// Minimal React state just for toolbar re-renders
	const [tool, setToolUI] = useState('pen')
	const [color, setColorUI] = useState('#111827')
	const [lineWidth, setLwUI] = useState(3)

	const setTool = v => {
		toolRef.current = v
		setToolUI(v)
	}
	const setColor = v => {
		colorRef.current = v
		setColorUI(v)
	}
	const setLw = v => {
		lwRef.current = v
		setLwUI(v)
	}

	// ── Canvas init & ResizeObserver ─────────────────────────────────────────
	useEffect(() => {
		const container = containerRef.current
		const canvas = canvasRef.current
		const overlay = overlayRef.current

		const init = () => {
			const w = container.offsetWidth
			const h = container.offsetHeight

			// Preserve existing drawing
			let saved = null
			if (canvas.width > 0 && canvas.height > 0) {
				saved = canvas
					.getContext('2d')
					.getImageData(0, 0, canvas.width, canvas.height)
			}

			canvas.width = w
			canvas.height = h
			overlay.width = w
			overlay.height = h

			const ctx = canvas.getContext('2d')
			ctx.fillStyle = '#ffffff'
			ctx.fillRect(0, 0, w, h)
			if (saved) ctx.putImageData(saved, 0, 0)
		}

		init()
		const ro = new ResizeObserver(init)
		ro.observe(container)
		return () => ro.disconnect()
	}, [])

	// ── Remote draw events ───────────────────────────────────────────────────
	useEffect(() => {
		if (!socket?.current) return

		const handle = event => {
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
				if (!points?.length) return
				const isErase = strokeColor === '__eraser__'
				ctx.save()
				ctx.globalCompositeOperation = isErase
					? 'destination-out'
					: 'source-over'
				ctx.strokeStyle = isErase ? 'rgba(0,0,0,1)' : strokeColor
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

		socket.current.addEventListener('message', handle)
		return () => socket.current?.removeEventListener('message', handle)
	}, [socket])

	// ── Pointer / touch listeners — { passive: false } ───────────────────────
	// React's synthetic touch events are passive in modern browsers, so
	// e.preventDefault() inside them throws a warning and doesn't work.
	// We register them manually with passive:false to allow scroll prevention.
	useEffect(() => {
		if (!isTeacher) return
		const el = overlayRef.current

		const getPos = e => {
			const rect = el.getBoundingClientRect()
			const src = e.touches?.[0] ?? e
			return {
				x: (src.clientX - rect.left) * (el.width / rect.width),
				y: (src.clientY - rect.top) * (el.height / rect.height),
			}
		}

		const onDown = e => {
			e.preventDefault()
			const pos = getPos(e)
			startPos.current = pos
			penPoints.current = [pos]
			isDrawing.current = true
		}

		const onMove = e => {
			if (!isDrawing.current) return
			e.preventDefault()
			const pos = getPos(e)
			const isErase = toolRef.current === 'eraser'
			const isPenLike = toolRef.current === 'pen' || isErase

			if (isPenLike) {
				const ctx = canvasRef.current.getContext('2d')
				const prev = penPoints.current[penPoints.current.length - 1]
				ctx.save()
				ctx.globalCompositeOperation = isErase
					? 'destination-out'
					: 'source-over'
				ctx.strokeStyle = isErase ? 'rgba(0,0,0,1)' : colorRef.current
				ctx.lineWidth = isErase ? lwRef.current * 5 : lwRef.current
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				ctx.beginPath()
				ctx.moveTo(prev.x, prev.y)
				ctx.lineTo(pos.x, pos.y)
				ctx.stroke()
				ctx.restore()
				penPoints.current.push(pos)
			} else {
				const ov = overlayRef.current
				const ovCtx = ov.getContext('2d')
				ovCtx.clearRect(0, 0, ov.width, ov.height)
				const { x: x1, y: y1 } = startPos.current
				drawShape(
					ovCtx,
					toolRef.current,
					x1,
					y1,
					pos.x,
					pos.y,
					colorRef.current,
					lwRef.current,
				)
			}
		}

		const onUp = e => {
			if (!isDrawing.current) return
			// touchend has no touches[0] — use changedTouches
			const src = e.changedTouches?.[0] ?? e
			const rect = el.getBoundingClientRect()
			const pos = {
				x: (src.clientX - rect.left) * (el.width / rect.width),
				y: (src.clientY - rect.top) * (el.height / rect.height),
			}

			// Clear shape preview overlay
			const ov = overlayRef.current
			ov.getContext('2d').clearRect(0, 0, ov.width, ov.height)

			const isErase = toolRef.current === 'eraser'
			const isPenLike = toolRef.current === 'pen' || isErase

			if (isPenLike) {
				if (socket.current?.readyState === WebSocket.OPEN) {
					socket.current.send(
						JSON.stringify({
							type: 'draw_stroke',
							content: {
								points: penPoints.current,
								strokeColor: isErase ? '__eraser__' : colorRef.current,
								strokeWidth: isErase ? lwRef.current * 5 : lwRef.current,
							},
						}),
					)
				}
				penPoints.current = []
			} else {
				const ctx = canvasRef.current.getContext('2d')
				const { x: x1, y: y1 } = startPos.current
				drawShape(
					ctx,
					toolRef.current,
					x1,
					y1,
					pos.x,
					pos.y,
					colorRef.current,
					lwRef.current,
				)
				if (socket.current?.readyState === WebSocket.OPEN) {
					socket.current.send(
						JSON.stringify({
							type: 'draw_shape',
							content: {
								shape: toolRef.current,
								x1,
								y1,
								x2: pos.x,
								y2: pos.y,
								strokeColor: colorRef.current,
								strokeWidth: lwRef.current,
							},
						}),
					)
				}
			}

			isDrawing.current = false
			startPos.current = null
		}

		const opts = { passive: false }
		el.addEventListener('mousedown', onDown, opts)
		el.addEventListener('mousemove', onMove, opts)
		el.addEventListener('mouseup', onUp, opts)
		el.addEventListener('mouseleave', onUp, opts)
		el.addEventListener('touchstart', onDown, opts)
		el.addEventListener('touchmove', onMove, opts)
		el.addEventListener('touchend', onUp, { passive: true }) // touchend is usually non-cancelable anyway

		return () => {
			el.removeEventListener('mousedown', onDown)
			el.removeEventListener('mousemove', onMove)
			el.removeEventListener('mouseup', onUp)
			el.removeEventListener('mouseleave', onUp)
			el.removeEventListener('touchstart', onDown)
			el.removeEventListener('touchmove', onMove)
			el.removeEventListener('touchend', onUp)
		}
	}, [isTeacher, socket])

	// ── Clear ────────────────────────────────────────────────────────────────
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

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<div
			ref={containerRef}
			className='relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/40'
		>
			{/* Main canvas — always white */}
			<canvas
				ref={canvasRef}
				style={{
					position: 'absolute',
					inset: 0,
					zIndex: 1,
					background: '#fff',
				}}
			/>

			{/* Overlay — pointer target + shape preview */}
			<canvas
				ref={overlayRef}
				style={{
					position: 'absolute',
					inset: 0,
					zIndex: 2,
					cursor: isTeacher
						? (TOOLS.find(t => t.key === tool)?.cursor ?? 'crosshair')
						: 'default',
					touchAction: 'none',
				}}
			/>

			{/* ── Teacher toolbar ── */}
			{isTeacher ? (
				<div
					style={{ zIndex: 10, background: '#0f172a' }}
					className='absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60'
				>
					{/* Tools */}
					<div className='flex items-center gap-1 pr-3 border-r border-slate-700'>
						{TOOLS.map(({ key, label, Icon }) => (
							<button
								key={key}
								title={label}
								onClick={() => setTool(key)}
								className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
									${
										tool === key
											? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
											: 'text-slate-400 hover:bg-slate-800 hover:text-white'
									}`}
							>
								<Icon size={16} />
							</button>
						))}
					</div>

					{/* Colours */}
					<div className='flex items-center gap-1.5 pr-3 border-r border-slate-700'>
						{COLORS.map(c => (
							<button
								key={c}
								onClick={() => setColor(c)}
								title={c}
								className='w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0'
								style={{
									background: c,
									outline:
										color === c ? '2px solid #60a5fa' : '2px solid transparent',
									outlineOffset: '2px',
									border: c === '#ffffff' ? '1px solid #475569' : 'none',
								}}
							/>
						))}
						<input
							type='color'
							value={color}
							onChange={e => setColor(e.target.value)}
							title='Custom colour'
							className='w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0'
						/>
					</div>

					{/* Stroke width */}
					<div className='flex items-center gap-1 pr-3 border-r border-slate-700'>
						{WIDTHS.map(w => (
							<button
								key={w}
								onClick={() => setLw(w)}
								title={`${w}px`}
								className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
									${lineWidth === w ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'hover:bg-slate-800'}`}
							>
								<div
									className='rounded-full bg-white'
									style={{
										width: Math.min(w * 2.2, 22),
										height: Math.min(w * 2.2, 22),
									}}
								/>
							</button>
						))}
					</div>

					{/* Clear */}
					<button
						onClick={clearBoard}
						className='flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all'
					>
						<Trash2 size={14} />
						<span className='hidden sm:inline'>Clear</span>
					</button>
				</div>
			) : (
				<div
					style={{ zIndex: 10, background: '#0f172a' }}
					className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 text-xs font-bold text-slate-400 tracking-widest'
				>
					<Eye size={13} />
					VIEW ONLY — LIVE BOARD
				</div>
			)}

			{/* Corner label */}
			<div
				style={{ zIndex: 10, background: '#0f172a' }}
				className='absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 text-[10px] font-bold text-slate-400 tracking-widest'
			>
				{isTeacher ? (
					<>
						<PenLine size={11} />
						&nbsp;TEACHER BOARD
					</>
				) : (
					<>
						<Eye size={11} />
						&nbsp;LIVE BOARD
					</>
				)}
			</div>
		</div>
	)
}

export default Whiteboard
