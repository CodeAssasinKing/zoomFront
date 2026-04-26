import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Pencil,
  Eraser,
  Minus,
  Square,
  Circle,
  Trash2,
  PenLine,
  Download,
  Undo2,
  Redo2,
  Droplet,
  Triangle,
  Move,
  ZoomIn,
  ZoomOut,
  Type,
  ArrowRight,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Grid,
  ChevronDown,
  ChevronRight,
  Star,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const PALETTE_ROWS = [
  [
    "#000000",
    "#111827",
    "#1f2937",
    "#374151",
    "#4b5563",
    "#6b7280",
    "#9ca3af",
    "#d1d5db",
    "#e5e7eb",
    "#f9fafb",
    "#ffffff",
    "transparent",
  ],
  [
    "#7f1d1d",
    "#991b1b",
    "#dc2626",
    "#ef4444",
    "#f87171",
    "#fca5a5",
    "#fecaca",
    "#fff1f2",
    "#7c2d12",
    "#ea580c",
    "#f97316",
    "#fb923c",
  ],
  [
    "#78350f",
    "#b45309",
    "#d97706",
    "#f59e0b",
    "#fbbf24",
    "#fcd34d",
    "#fde68a",
    "#fffbeb",
    "#365314",
    "#4d7c0f",
    "#65a30d",
    "#84cc16",
  ],
  [
    "#14532d",
    "#15803d",
    "#16a34a",
    "#22c55e",
    "#4ade80",
    "#86efac",
    "#bbf7d0",
    "#f0fdf4",
    "#164e63",
    "#0e7490",
    "#0891b2",
    "#06b6d4",
  ],
  [
    "#1e3a5f",
    "#1e40af",
    "#1d4ed8",
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#dbeafe",
    "#312e81",
    "#4338ca",
    "#6366f1",
    "#818cf8",
  ],
  [
    "#581c87",
    "#7e22ce",
    "#9333ea",
    "#a855f7",
    "#c084fc",
    "#d8b4fe",
    "#ede9fe",
    "#faf5ff",
    "#831843",
    "#be185d",
    "#db2777",
    "#ec4899",
  ],
];

const TOOLS = [
  {
    key: "pen",
    label: "Pen",
    shortcut: "P",
    Icon: Pencil,
    cursor: "crosshair",
    group: "draw",
  },
  {
    key: "brush",
    label: "Brush",
    shortcut: "B",
    Icon: PenLine,
    cursor: "crosshair",
    group: "draw",
  },
  {
    key: "eraser",
    label: "Eraser",
    shortcut: "E",
    Icon: Eraser,
    cursor: "cell",
    group: "draw",
  },
  {
    key: "fill",
    label: "Fill",
    shortcut: "F",
    Icon: Droplet,
    cursor: "crosshair",
    group: "draw",
  },
  {
    key: "text",
    label: "Text",
    shortcut: "T",
    Icon: Type,
    cursor: "text",
    group: "shape",
  },
  {
    key: "line",
    label: "Line",
    shortcut: "L",
    Icon: Minus,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "arrow",
    label: "Arrow",
    shortcut: "A",
    Icon: ArrowRight,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "rect",
    label: "Rectangle",
    shortcut: "R",
    Icon: Square,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "circle",
    label: "Ellipse",
    shortcut: "O",
    Icon: Circle,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "triangle",
    label: "Triangle",
    shortcut: "I",
    Icon: Triangle,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "star",
    label: "Star",
    shortcut: "S",
    Icon: Star,
    cursor: "crosshair",
    group: "shape",
  },
  {
    key: "select",
    label: "Select",
    shortcut: "V",
    Icon: Move,
    cursor: "default",
    group: "util",
  },
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const OPACITY_PRESETS = [10, 25, 50, 75, 100];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 72, 96];
const FONT_FAMILIES = [
  { label: "Sans", value: "system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Cursive", value: "cursive" },
  { label: "Impact", value: "Impact, fantasy" },
];
const DASH_STYLES = [
  { label: "Solid", value: [] },
  { label: "Dashed", value: [8, 4] },
  { label: "Dotted", value: [2, 4] },
  { label: "Dash·dot", value: [12, 4, 2, 4] },
];
const BLEND_MODES = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
];

const MAX_UNDO = 60;
const GRID_MINOR = 20;
const GRID_MAJOR = 100;

// ════════════════════════════════════════════════════════════════════════════
// PURE UTILITIES
// ════════════════════════════════════════════════════════════════════════════

const hexToRgba = (hex, a = 100) => {
  if (hex === "transparent") return "rgba(0,0,0,0)";
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a / 100})`;
};

/**
 * Paint the permanent grid onto its dedicated canvas.
 * Called on init and every resize — never by user actions.
 */
const paintGrid = (canvas) => {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  // Minor lines (every 20px)
  ctx.strokeStyle = "rgba(148,163,184,0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += GRID_MINOR) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += GRID_MINOR) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Major lines (every 100px)
  ctx.strokeStyle = "rgba(100,116,139,0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += GRID_MAJOR) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += GRID_MAJOR) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
};

const drawArrowhead = (ctx, x1, y1, x2, y2, size) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 0.42;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(a - s), y2 - size * Math.sin(a - s));
  ctx.lineTo(x2 - size * Math.cos(a + s), y2 - size * Math.sin(a + s));
  ctx.closePath();
  ctx.fill();
};

const starPath = (ctx, cx, cy, r1, r2, pts = 5) => {
  const step = Math.PI / pts;
  ctx.beginPath();
  for (let i = 0; i < 2 * pts; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = i * step - Math.PI / 2;
    i === 0
      ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
};

const renderShape = (ctx, opts) => {
  const {
    shape,
    x1,
    y1,
    x2,
    y2,
    strokeColor,
    strokeWidth,
    fillColor,
    dashStyle = [],
    blendMode = "source-over",
  } = opts;

  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor || "transparent";
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dashStyle.length) ctx.setLineDash(dashStyle);

  const cx = (x1 + x2) / 2,
    cy = (y1 + y2) / 2;
  const rx = Math.abs(x2 - x1) / 2,
    ry = Math.abs(y2 - y1) / 2;

  if (shape === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (shape === "arrow") {
    const hs = Math.max(strokeWidth * 3, 12);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = strokeColor;
    drawArrowhead(ctx, x1, y1, x2, y2, hs);
    ctx.fill();
  } else if (shape === "rect") {
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    if (fillColor) ctx.fill();
    ctx.stroke();
  } else if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, 2 * Math.PI);
    if (fillColor) ctx.fill();
    ctx.stroke();
  } else if (shape === "triangle") {
    ctx.beginPath();
    ctx.moveTo(cx, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y2);
    ctx.closePath();
    if (fillColor) ctx.fill();
    ctx.stroke();
  } else if (shape === "star") {
    const outerR = Math.max(rx, ry);
    starPath(ctx, cx, cy, outerR, outerR * 0.4, 5);
    if (fillColor) ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

const floodFill = (canvas, sx, sy, fillHex) => {
  if (fillHex === "transparent") return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const si = (Math.round(sy) * w + Math.round(sx)) * 4;
  const [sr, sg, sb, sa] = [data[si], data[si + 1], data[si + 2], data[si + 3]];
  const fh = fillHex.replace("#", "");
  const tr = parseInt(fh.slice(0, 2), 16),
    tg = parseInt(fh.slice(2, 4), 16);
  const tb = parseInt(fh.slice(4, 6), 16),
    ta = 255;
  if (sr === tr && sg === tg && sb === tb && sa === ta) return;
  const match = (i) =>
    data[i] === sr &&
    data[i + 1] === sg &&
    data[i + 2] === sb &&
    data[i + 3] === sa;
  const paint = (i) => {
    data[i] = tr;
    data[i + 1] = tg;
    data[i + 2] = tb;
    data[i + 3] = ta;
  };
  const stack = [[Math.round(sx), Math.round(sy)]];
  const vis = new Uint8Array(w * h);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const vi = cy * w + cx;
    if (vis[vi]) continue;
    const i = vi * 4;
    if (!match(i)) continue;
    vis[vi] = 1;
    paint(i);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(img, 0, 0);
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const Whiteboard = ({ socket, isTeacher }) => {
  // ─── Canvas layer refs ─────────────────────────────────────────────────────
  //
  // KEY FIX: We use TWO separate refs for the viewport:
  //   viewportRef  → the stable outer div that NEVER moves/scales.
  //                  ResizeObserver watches this to get the true pixel size.
  //   zoomWrapRef  → the inner div that gets CSS `transform: scale(zoom)`.
  //                  Canvases live here but are sized from viewportRef.
  //
  // This eliminates the bug where containerRef pointed to the scaled element,
  // causing offsetWidth/offsetHeight to return wrong (pre-scale) values.
  //
  const viewportRef = useRef(null); // stable, unscaled — for measurement
  const zoomWrapRef = useRef(null); // scaled wrapper — canvases live here
  const gridCanvasRef = useRef(null); // Layer 0: permanent grid
  const canvasRef = useRef(null); // Layer 1: drawing
  const overlayRef = useRef(null); // Layer 2: shape preview + events
  const textInputRef = useRef(null);

  // ─── Mutable drawing state refs (stale-closure safe) ──────────────────────
  const toolRef = useRef("pen");
  const colorRef = useRef("#1e293b");
  const lwRef = useRef(4);
  const opacityRef = useRef(100);
  const smoothRef = useRef(true);
  const fillRef = useRef(false);
  const dashRef = useRef([]);
  const blendRef = useRef("source-over");
  const fontSizeRef = useRef(24);
  const fontFamilyRef = useRef("system-ui, sans-serif");
  const boldRef = useRef(false);
  const italicRef = useRef(false);
  const textAlignRef = useRef("left");
  const zoomRef = useRef(1);

  const isDrawing = useRef(false);
  const startPos = useRef(null);
  const penPoints = useRef([]);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ─── React UI state ────────────────────────────────────────────────────────
  const [tool, setToolUI] = useState("pen");
  const [color, setColorUI] = useState("#1e293b");
  const [lw, setLwUI] = useState(4);
  const [opacity, setOpacityUI] = useState(100);
  const [fill, setFillUI] = useState(false);
  const [smooth, setSmoothUI] = useState(true);
  const [dash, setDashUI] = useState([]);
  const [blend, setBlendUI] = useState("source-over");
  const [zoom, setZoomUI] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fontSize, setFontSizeUI] = useState(24);
  const [fontFamily, setFontFamilyUI] = useState("system-ui, sans-serif");
  const [bold, setBoldUI] = useState(false);
  const [italic, setItalicUI] = useState(false);
  const [textAlign, setTextAlignUI] = useState("left");
  const [textEntry, setTextEntry] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [sectionOpen, setSectionOpen] = useState({
    color: true,
    stroke: true,
    text: false,
    options: true,
  });

  // Synced setters: update ref (for event listeners) AND state (for renders)
  const setTool = (v) => {
    toolRef.current = v;
    setToolUI(v);
  };
  const setColor = (v) => {
    colorRef.current = v;
    setColorUI(v);
  };
  const setLw = (v) => {
    lwRef.current = v;
    setLwUI(v);
  };
  const setOpacity = (v) => {
    opacityRef.current = v;
    setOpacityUI(v);
  };
  const setFill = (v) => {
    fillRef.current = v;
    setFillUI(v);
  };
  const setSmooth = (v) => {
    smoothRef.current = v;
    setSmoothUI(v);
  };
  const setDash = (v) => {
    dashRef.current = v;
    setDashUI(v);
  };
  const setBlend = (v) => {
    blendRef.current = v;
    setBlendUI(v);
  };
  const setFontSize = (v) => {
    fontSizeRef.current = v;
    setFontSizeUI(v);
  };
  const setFontFamily = (v) => {
    fontFamilyRef.current = v;
    setFontFamilyUI(v);
  };
  const setBold = (v) => {
    boldRef.current = v;
    setBoldUI(v);
  };
  const setItalic = (v) => {
    italicRef.current = v;
    setItalicUI(v);
  };
  const setTextAlign = (v) => {
    textAlignRef.current = v;
    setTextAlignUI(v);
  };
  const setZoom = (v) => {
    const z = Math.min(Math.max(v, 0.1), 5);
    zoomRef.current = z;
    setZoomUI(z);
  };
  const toggleSection = (k) => setSectionOpen((s) => ({ ...s, [k]: !s[k] }));

  const activeColorDisplay = useMemo(
    () => (color === "transparent" ? "transparent" : hexToRgba(color, opacity)),
    [color, opacity],
  );

  // ─── Snapshot helpers (undo/redo) ──────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const snap = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    undoStack.current.push(snap);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    redoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
    ctx.putImageData(snap, 0, 0);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
    ctx.putImageData(snap, 0, 0);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  // ─── Draw text to canvas ───────────────────────────────────────────────────
  const drawTextToCanvas = useCallback((text, x, y, opts = {}) => {
    const {
      fs = fontSizeRef.current,
      ff = fontFamilyRef.current,
      b = boldRef.current,
      it = italicRef.current,
      col = colorRef.current,
      align = textAlignRef.current,
    } = opts;
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.font = `${it ? "italic " : ""}${b ? "bold " : ""}${fs}px ${ff}`;
    ctx.fillStyle = col === "transparent" ? "rgba(0,0,0,0)" : col;
    ctx.textBaseline = "top";
    ctx.textAlign = align;
    text
      .split("\n")
      .forEach((line, i) => ctx.fillText(line, x, y + i * fs * 1.4));
    ctx.restore();
  }, []);

  // ─── Commit text overlay ───────────────────────────────────────────────────
  const commitText = useCallback(() => {
    if (!textEntry || !textInputRef.current) return;
    const text = textInputRef.current.innerText;
    if (text.trim()) {
      saveSnapshot();
      drawTextToCanvas(text, textEntry.x, textEntry.y);
      if (socket?.current?.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({
            type: "draw_text",
            content: {
              text,
              x: textEntry.x,
              y: textEntry.y,
              fontSize: fontSizeRef.current,
              fontFamily: fontFamilyRef.current,
              bold: boldRef.current,
              italic: italicRef.current,
              color: colorRef.current,
              align: textAlignRef.current,
            },
          }),
        );
      }
    }
    setTextEntry(null);
  }, [textEntry, saveSnapshot, drawTextToCanvas, socket]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!isTeacher || textEntry) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
          return;
        }
        if (e.key === "y") {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key === "]") {
          e.preventDefault();
          setZoom(zoomRef.current + 0.1);
          return;
        }
        if (e.key === "[") {
          e.preventDefault();
          setZoom(zoomRef.current - 0.1);
          return;
        }
        if (e.key === "0") {
          e.preventDefault();
          setZoom(1);
          return;
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const map = {
          p: "pen",
          b: "brush",
          e: "eraser",
          f: "fill",
          t: "text",
          l: "line",
          a: "arrow",
          r: "rect",
          o: "circle",
          i: "triangle",
          s: "star",
          v: "select",
        };
        if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTeacher, textEntry, undo, redo]);

  // ─── Canvas init & resize ──────────────────────────────────────────────────
  //
  // FIX: We observe viewportRef (the stable, unscaled outer div) for its true
  // pixel dimensions, then apply those dimensions directly to all canvases.
  // The zoom CSS transform on zoomWrapRef is purely visual — canvases always
  // reflect the true viewport size so they cover the full area on first render.
  //
  useEffect(() => {
    const viewport = viewportRef.current;
    const drawCanvas = canvasRef.current;
    const gridCanvas = gridCanvasRef.current;
    const overlay = overlayRef.current;
    if (!viewport || !drawCanvas || !gridCanvas || !overlay) return;

    const applySize = (w, h) => {
      if (w === 0 || h === 0) return;

      // Preserve existing drawing before resizing
      let saved = null;
      if (drawCanvas.width > 0 && drawCanvas.height > 0) {
        try {
          saved = drawCanvas
            .getContext("2d")
            .getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        } catch (_) {
          /* cross-origin or security error — skip */
        }
      }

      // Resize all three canvases to the TRUE viewport size
      // NOTE: assigning width/height clears the canvas to transparent automatically.
      drawCanvas.width = w;
      drawCanvas.height = h;
      gridCanvas.width = w;
      gridCanvas.height = h;
      overlay.width = w;
      overlay.height = h;

      // Drawing canvas stays transparent — no white fill.
      // The white "paper" background comes from the viewport div's CSS background.
      const ctx = drawCanvas.getContext("2d");

      // Restore previous drawing (pixel-for-pixel, no white backdrop)
      if (saved) ctx.putImageData(saved, 0, 0);

      // Paint the permanent grid
      paintGrid(gridCanvas);

      // Seed undo stack with initial blank state
      if (!undoStack.current.length) saveSnapshot();
    };

    // Run once immediately with current size
    applySize(viewport.offsetWidth, viewport.offsetHeight);

    // Watch for any future size changes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        applySize(Math.round(width), Math.round(height));
      }
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [saveSnapshot]);

  // ─── Remote WebSocket events ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket?.current) return;
    const handle = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (data.type === "draw_stroke") {
        const { points, strokeColor, strokeWidth, blendMode, dashStyle } =
          data.content;
        if (!points?.length) return;
        const isErase = strokeColor === "__eraser__";
        ctx.save();
        ctx.globalCompositeOperation = isErase
          ? "destination-out"
          : blendMode || "source-over";
        ctx.strokeStyle = isErase ? "rgba(0,0,0,1)" : strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (!isErase && dashStyle?.length) ctx.setLineDash(dashStyle);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const mx = (points[i].x + points[i + 1].x) / 2;
          const my = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        if (points.length > 1) {
          const last = points[points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (data.type === "draw_shape") {
        renderShape(ctx, data.content);
      } else if (data.type === "draw_text") {
        const {
          text,
          x,
          y,
          fontSize: fs,
          fontFamily: ff,
          bold: b,
          italic: it,
          color: col,
          align,
        } = data.content;
        drawTextToCanvas(text, x, y, { fs, ff, b, it, col, align });
      } else if (data.type === "clear_board") {
        // Clear to transparent so grid shows through
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (data.type === "flood_fill") {
        floodFill(canvas, data.content.x, data.content.y, data.content.color);
      }
    };
    socket.current.addEventListener("message", handle);
    return () => socket.current?.removeEventListener("message", handle);
  }, [socket, drawTextToCanvas]);

  // ─── Pointer / touch drawing listeners ────────────────────────────────────
  //
  // FIX: getPos reads bounding rect from overlayRef (the actual canvas element)
  // and divides by zoom to get canvas-space coordinates. This is correct because
  // the overlay element is CSS-scaled by zoom, so its bounding rect is zoom×
  // the canvas pixel dimensions. Dividing by zoom gives true canvas coords.
  //
  useEffect(() => {
    if (!isTeacher) return;
    const el = overlayRef.current;
    if (!el) return;

    const getPos = (e) => {
      const rect = el.getBoundingClientRect();
      const src = e.touches?.[0] ?? e;
      const z = zoomRef.current;
      // rect.width  = canvas.width  * zoom (because CSS scaled)
      // so canvas coords = (clientX - left) * (canvas.width / rect.width)
      //                  = (clientX - left) / zoom
      return {
        x: (src.clientX - rect.left) / z,
        y: (src.clientY - rect.top) / z,
      };
    };

    const onDown = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      setCursorPos(pos);

      if (toolRef.current === "text") {
        setTextEntry(pos);
        return;
      }
      if (toolRef.current === "fill") {
        if (colorRef.current === "transparent") return;
        saveSnapshot();
        floodFill(canvasRef.current, pos.x, pos.y, colorRef.current);
        if (socket?.current?.readyState === WebSocket.OPEN) {
          socket.current.send(
            JSON.stringify({
              type: "flood_fill",
              content: { x: pos.x, y: pos.y, color: colorRef.current },
            }),
          );
        }
        return;
      }

      startPos.current = pos;
      penPoints.current = [pos];
      isDrawing.current = true;
    };

    const onMove = (e) => {
      const pos = getPos(e);
      setCursorPos(pos);
      if (!isDrawing.current) return;
      e.preventDefault();

      const t = toolRef.current;
      const isErase = t === "eraser";
      const isBrush = t === "brush";
      const isPen = t === "pen" || isErase || isBrush;

      if (isPen) {
        const ctx = canvasRef.current.getContext("2d");
        const prev = penPoints.current[penPoints.current.length - 1];
        const col = isErase
          ? "rgba(0,0,0,1)"
          : hexToRgba(colorRef.current, opacityRef.current);
        const w = isErase
          ? lwRef.current * 5
          : isBrush
            ? lwRef.current * 2.5
            : lwRef.current;

        ctx.save();
        ctx.globalCompositeOperation = isErase
          ? "destination-out"
          : blendRef.current;
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (!isErase && !isBrush && dashRef.current.length)
          ctx.setLineDash(dashRef.current);
        if (isBrush) ctx.globalAlpha = 0.4;

        if (smoothRef.current && penPoints.current.length > 2) {
          const pts = penPoints.current;
          const p1 = pts[pts.length - 1];
          ctx.beginPath();
          ctx.moveTo((prev.x + p1.x) / 2, (prev.y + p1.y) / 2);
          ctx.quadraticCurveTo(
            p1.x,
            p1.y,
            (p1.x + pos.x) / 2,
            (p1.y + pos.y) / 2,
          );
        } else {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pos.x, pos.y);
        }
        ctx.stroke();
        ctx.restore();
        penPoints.current.push(pos);
      } else if (t !== "select" && t !== "fill" && t !== "text") {
        const ov = overlayRef.current;
        const ovCtx = ov.getContext("2d");
        ovCtx.clearRect(0, 0, ov.width, ov.height);

        const { x: x1, y: y1 } = startPos.current;

        // Crosshair guide
        ovCtx.save();
        ovCtx.setLineDash([4, 6]);
        ovCtx.strokeStyle = "rgba(99,102,241,0.35)";
        ovCtx.lineWidth = 1;
        ovCtx.beginPath();
        ovCtx.moveTo(0, pos.y);
        ovCtx.lineTo(ov.width, pos.y);
        ovCtx.moveTo(pos.x, 0);
        ovCtx.lineTo(pos.x, ov.height);
        ovCtx.stroke();
        // Dimension label
        ovCtx.setLineDash([]);
        ovCtx.font = "11px monospace";
        ovCtx.fillStyle = "rgba(99,102,241,0.85)";
        ovCtx.fillText(
          `${Math.abs(pos.x - x1).toFixed(0)} × ${Math.abs(pos.y - y1).toFixed(0)}`,
          pos.x + 10,
          pos.y - 14,
        );
        ovCtx.restore();

        const strokeColor = hexToRgba(colorRef.current, opacityRef.current);
        const fillColor = fillRef.current
          ? hexToRgba(colorRef.current, Math.max(5, opacityRef.current * 0.28))
          : null;

        renderShape(ovCtx, {
          shape: t,
          x1,
          y1,
          x2: pos.x,
          y2: pos.y,
          strokeColor,
          strokeWidth: lwRef.current,
          fillColor,
          dashStyle: dashRef.current,
          blendMode: blendRef.current,
        });
      }
    };

    const onUp = (e) => {
      if (!isDrawing.current) return;
      const src = e.changedTouches?.[0] ?? e;
      const rect = el.getBoundingClientRect();
      const z = zoomRef.current;
      const pos = {
        x: (src.clientX - rect.left) / z,
        y: (src.clientY - rect.top) / z,
      };

      // Clear shape-preview overlay
      const ov = overlayRef.current;
      ov.getContext("2d").clearRect(0, 0, ov.width, ov.height);

      const t = toolRef.current;
      const isErase = t === "eraser";
      const isBrush = t === "brush";
      const isPen = t === "pen" || isErase || isBrush;

      saveSnapshot();

      if (isPen) {
        if (socket?.current?.readyState === WebSocket.OPEN) {
          socket.current.send(
            JSON.stringify({
              type: "draw_stroke",
              content: {
                points: penPoints.current,
                strokeColor: isErase
                  ? "__eraser__"
                  : hexToRgba(colorRef.current, opacityRef.current),
                strokeWidth: isErase
                  ? lwRef.current * 5
                  : isBrush
                    ? lwRef.current * 2.5
                    : lwRef.current,
                blendMode: blendRef.current,
                dashStyle: dashRef.current,
              },
            }),
          );
        }
        penPoints.current = [];
      } else if (t !== "select" && t !== "fill" && t !== "text") {
        const ctx = canvasRef.current.getContext("2d");
        const { x: x1, y: y1 } = startPos.current;
        const strokeColor = hexToRgba(colorRef.current, opacityRef.current);
        const fillColor = fillRef.current
          ? hexToRgba(colorRef.current, Math.max(5, opacityRef.current * 0.28))
          : null;
        const shapeOpts = {
          shape: t,
          x1,
          y1,
          x2: pos.x,
          y2: pos.y,
          strokeColor,
          strokeWidth: lwRef.current,
          fillColor,
          dashStyle: dashRef.current,
          blendMode: blendRef.current,
        };
        renderShape(ctx, shapeOpts);
        if (socket?.current?.readyState === WebSocket.OPEN) {
          socket.current.send(
            JSON.stringify({ type: "draw_shape", content: shapeOpts }),
          );
        }
      }

      isDrawing.current = false;
      startPos.current = null;
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(zoomRef.current + (e.deltaY > 0 ? -0.08 : 0.08));
      }
    };

    const opts = { passive: false };
    el.addEventListener("mousedown", onDown, opts);
    el.addEventListener("mousemove", onMove, opts);
    el.addEventListener("mouseup", onUp, opts);
    el.addEventListener("mouseleave", onUp, opts);
    el.addEventListener("touchstart", onDown, opts);
    el.addEventListener("touchmove", onMove, opts);
    el.addEventListener("touchend", onUp, { passive: true });
    el.addEventListener("wheel", onWheel, opts);

    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mouseleave", onUp);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [isTeacher, socket, saveSnapshot]);

  // ─── Text overlay auto-focus & commit ─────────────────────────────────────
  useEffect(() => {
    if (!textEntry || !textInputRef.current) return;
    const el = textInputRef.current;
    el.focus();
    const onBlur = () => commitText();
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setTextEntry(null);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitText();
      }
    };
    el.addEventListener("blur", onBlur);
    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("keydown", onKeyDown);
    };
  }, [textEntry, commitText]);

  // ─── Board actions ─────────────────────────────────────────────────────────
  const clearBoard = () => {
    saveSnapshot();
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    // Clear to fully transparent — grid shows through from the canvas below
    ctx.clearRect(0, 0, c.width, c.height);
    overlayRef.current
      .getContext("2d")
      .clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    if (socket?.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: "clear_board" }));
  };

  const downloadCanvas = () => {
    const c = canvasRef.current;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext("2d");
    // 1. White background (since drawing canvas is now transparent)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    // 2. Grid layer
    ctx.drawImage(gridCanvasRef.current, 0, 0);
    // 3. Drawing layer
    ctx.drawImage(c, 0, 0);
    const a = document.createElement("a");
    a.download = `whiteboard-${Date.now()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  };

  const cursorStyle = useMemo(
    () =>
      isTeacher
        ? TOOLS.find((t) => t.key === tool)?.cursor || "crosshair"
        : "default",
    [isTeacher, tool],
  );

  const isTextTool = tool === "text";

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
        background: "#0a0a12",
        userSelect: "none",
      }}
    >
      {/* ━━━ LEFT TOOLBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isTeacher && (
        <aside
          style={{
            width: 58,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#0d0d1a",
            borderRight: "1px solid rgba(99,102,241,0.13)",
            padding: "10px 0 8px",
            gap: 1,
          }}
        >
          {/* Brand */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              marginBottom: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6 50%,#ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(99,102,241,0.45)",
            }}
          >
            <PenLine size={15} color="#fff" />
          </div>

          <ToolGroupDivider />
          {TOOLS.filter((t) => t.group === "draw").map(
            ({ key, label, shortcut, Icon }) => (
              <ToolBtn
                key={key}
                active={tool === key}
                title={`${label} (${shortcut})`}
                onClick={() => setTool(key)}
              >
                <Icon size={15} />
              </ToolBtn>
            ),
          )}

          <ToolGroupDivider />
          {TOOLS.filter((t) => t.group === "shape").map(
            ({ key, label, shortcut, Icon }) => (
              <ToolBtn
                key={key}
                active={tool === key}
                title={`${label} (${shortcut})`}
                onClick={() => setTool(key)}
              >
                <Icon size={15} />
              </ToolBtn>
            ),
          )}

          <div style={{ flex: 1 }} />

          <ToolGroupDivider />
          {[
            {
              action: undo,
              Icon: Undo2,
              label: "Undo (Ctrl+Z)",
              dis: !canUndo,
            },
            {
              action: redo,
              Icon: Redo2,
              label: "Redo (Ctrl+Y)",
              dis: !canRedo,
            },
          ].map(({ action, Icon, label, dis }) => (
            <ToolBtn
              key={label}
              title={label}
              disabled={dis}
              dimmed={dis}
              onClick={action}
            >
              <Icon size={15} />
            </ToolBtn>
          ))}

          <ToolGroupDivider />
          <ToolBtn
            title="Download PNG (includes grid)"
            onClick={downloadCanvas}
          >
            <Download size={15} />
          </ToolBtn>
          <ToolBtn title="Clear board" danger onClick={clearBoard}>
            <Trash2 size={15} />
          </ToolBtn>
        </aside>
      )}

      {/* ━━━ MAIN CANVAS COLUMN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* ── Status bar ── */}
        <div
          style={{
            height: 34,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 14,
            background: "#0b0b16",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
            fontSize: 10,
            letterSpacing: "0.07em",
            color: "#475569",
          }}
        >
          <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 11 }}>
            CANVAS
          </span>

          {isTeacher && (
            <>
              <StatusPill label="TOOL" value={tool.toUpperCase()} />
              <StatusPill
                label="SIZE"
                value={isTextTool ? `${fontSize}px` : `${lw}px`}
              />
              <StatusPill label="OPACITY" value={`${opacity}%`} />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: activeColorDisplay,
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow:
                    color !== "transparent"
                      ? `0 0 6px ${hexToRgba(color, 60)}`
                      : undefined,
                }}
              />
              <span style={{ color: "#64748b", fontSize: 9 }}>
                {color.toUpperCase()}
              </span>
              <span style={{ color: "#334155" }}>│</span>
              <StatusPill label="X" value={cursorPos.x.toFixed(0)} />
              <StatusPill label="Y" value={cursorPos.y.toFixed(0)} />
            </>
          )}

          <div style={{ flex: 1 }} />

          {!isTeacher && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#10b981",
                letterSpacing: "0.1em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block",
                }}
              />
              LIVE STREAM
            </span>
          )}

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((v) => !v)}
            title="Toggle grid"
            style={topBarBtnStyle(showGrid)}
          >
            <Grid size={12} />
          </button>

          {/* Zoom controls */}
          {isTeacher && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <ZBtn
                onClick={() => setZoom(zoomRef.current - 0.1)}
                title="Zoom out (Ctrl+[)"
              >
                <ZoomOut size={12} />
              </ZBtn>
              <span
                style={{
                  color: "#94a3b8",
                  minWidth: 36,
                  textAlign: "center",
                  fontSize: 10,
                }}
              >
                {Math.round(zoom * 100)}%
              </span>
              <ZBtn
                onClick={() => setZoom(zoomRef.current + 0.1)}
                title="Zoom in (Ctrl+])"
              >
                <ZoomIn size={12} />
              </ZBtn>
              <ZBtn onClick={() => setZoom(1)} title="Reset (Ctrl+0)">
                1:1
              </ZBtn>
            </div>
          )}
        </div>

        {/* ── Canvas viewport ─────────────────────────────────────────────── */}
        {/*
          viewportRef: stable outer div — ResizeObserver target, never scaled.
                       background:#ffffff so the area behind the canvases is
                       white (not grey) even before canvases are sized.
          zoomWrapRef: inner div that receives CSS transform:scale(zoom).
                       Positioned absolute so it doesn't affect layout.
        */}
        <div
          ref={viewportRef}
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#ffffff", // White "paper" — shows through transparent drawing canvas
          }}
        >
          {/* Zoom transform wrapper — purely visual, does NOT affect measurements */}
          <div
            ref={zoomWrapRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              // Size is always 100% of viewport — zoom is visual only
              width: "100%",
              height: "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {/*
              Layer 0 — Grid canvas
              z-index: 10 (as requested), pointer-events: none.
              Sized to viewport dimensions in applySize(). Never cleared by user.
              Visibility toggled via opacity (CSS), never by clearing the canvas.
            */}
            <canvas
              ref={gridCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 10,
                opacity: showGrid ? 1 : 0,
                transition: "opacity .2s",
                pointerEvents: "none",
              }}
            />

            {/*
              Layer 1 — Drawing canvas
              z-index: 11 (above grid so drawings appear on top of grid).
              White background set in applySize().
            */}
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 11,
              }}
            />

            {/*
              Layer 2 — Overlay canvas
              z-index: 12 (top). Receives all pointer events.
              Used for shape previews and crosshair guides only.
              Cleared at end of every stroke/shape.
            */}
            <canvas
              ref={overlayRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 12,
                cursor: cursorStyle,
                touchAction: "none",
              }}
            />

            {/* Text input widget — appears on click when text tool is active */}
            {textEntry && (
              <div
                ref={textInputRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                style={{
                  position: "absolute",
                  left: textEntry.x,
                  top: textEntry.y,
                  minWidth: 120,
                  minHeight: fontSize + 12,
                  padding: "4px 8px",
                  background: "rgba(255,255,255,0.93)",
                  border: "1.5px dashed #6366f1",
                  borderRadius: 6,
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  fontWeight: bold ? "bold" : "normal",
                  fontStyle: italic ? "italic" : "normal",
                  color: color === "transparent" ? "#000" : color,
                  textAlign,
                  outline: "none",
                  whiteSpace: "pre-wrap",
                  zIndex: 20,
                  cursor: "text",
                  boxShadow:
                    "0 8px 28px rgba(0,0,0,0.25), 0 0 0 1px rgba(99,102,241,0.3)",
                  lineHeight: 1.4,
                }}
              />
            )}
          </div>

          {/* Coordinate readout — outside zoom wrapper so it never moves */}
          {isTeacher && (
            <div
              style={{
                position: "absolute",
                bottom: 10,
                right: 12,
                fontSize: 9,
                color: "rgba(99,102,241,0.45)",
                letterSpacing: "0.07em",
                pointerEvents: "none",
                zIndex: 100,
              }}
            >
              {Math.round(zoom * 100)}% · {cursorPos.x.toFixed(0)},
              {cursorPos.y.toFixed(0)}
            </div>
          )}
        </div>
      </div>

      {/* ━━━ RIGHT PROPERTIES PANEL (teacher only) ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isTeacher && (
        <aside
          style={{
            width: 240,
            flexShrink: 0,
            background: "#0d0d1a",
            borderLeft: "1px solid rgba(99,102,241,0.13)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            zIndex: 20,
            scrollbarWidth: "thin",
            scrollbarColor: "#1a1a28 transparent",
          }}
        >
          {/* Active color hero */}
          <div
            style={{
              padding: "14px 14px 10px",
              borderBottom: "1px solid rgba(99,102,241,0.09)",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  flexShrink: 0,
                  background:
                    color === "transparent"
                      ? "repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 0 / 10px 10px"
                      : activeColorDisplay,
                  border: "2px solid rgba(255,255,255,0.1)",
                  boxShadow:
                    color !== "transparent"
                      ? `0 0 22px ${hexToRgba(color, 55)}`
                      : undefined,
                  transition: "all .2s",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 8,
                    color: "#3d3d60",
                    letterSpacing: "0.12em",
                    marginBottom: 5,
                  }}
                >
                  ACTIVE COLOR
                </div>
                <input
                  type="color"
                  value={color === "transparent" ? "#000000" : color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: "100%",
                    height: 22,
                    border: "none",
                    borderRadius: 5,
                    cursor: "pointer",
                    background: "none",
                    padding: 0,
                  }}
                />
                <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>
                  {color.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Palette */}
          <PanelSection
            title="PALETTE"
            open={sectionOpen.color}
            onToggle={() => toggleSection("color")}
          >
            {PALETTE_ROWS.map((row, ri) => (
              <div
                key={ri}
                style={{ display: "flex", gap: 2, marginBottom: 2 }}
              >
                {row.map((c) => (
                  <SwatchBtn
                    key={c}
                    c={c}
                    active={color === c}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            ))}
          </PanelSection>

          {/* Stroke */}
          <PanelSection
            title="STROKE"
            open={sectionOpen.stroke}
            onToggle={() => toggleSection("stroke")}
          >
            <RangeRow
              label="Opacity"
              value={opacity}
              min={1}
              max={100}
              unit="%"
              onChange={setOpacity}
            />
            <ChipRow>
              {OPACITY_PRESETS.map((o) => (
                <Chip
                  key={o}
                  active={opacity === o}
                  onClick={() => setOpacity(o)}
                >
                  {o}%
                </Chip>
              ))}
            </ChipRow>

            <RangeRow
              label="Width"
              value={lw}
              min={1}
              max={60}
              unit="px"
              onChange={setLw}
            />
            <ChipRow style={{ flexWrap: "wrap" }}>
              {STROKE_WIDTHS.map((w) => (
                <Chip key={w} active={lw === w} onClick={() => setLw(w)}>
                  {w}
                </Chip>
              ))}
            </ChipRow>

            {/* Width preview pill */}
            <div
              style={{
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: Math.min(lw * 3.5, 206),
                  height: Math.min(lw, 22),
                  borderRadius: 999,
                  background: activeColorDisplay,
                  boxShadow:
                    color !== "transparent"
                      ? `0 0 ${lw + 4}px ${hexToRgba(color, 45)}`
                      : undefined,
                  transition: "all .15s",
                }}
              />
            </div>

            <FieldLabel>Line Style</FieldLabel>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {DASH_STYLES.map((d) => {
                const isActive =
                  JSON.stringify(dash) === JSON.stringify(d.value);
                return (
                  <button
                    key={d.label}
                    onClick={() => setDash(d.value)}
                    style={{
                      flex: 1,
                      padding: "5px 3px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 9,
                      background: isActive
                        ? "rgba(99,102,241,0.28)"
                        : "rgba(255,255,255,0.04)",
                      border: isActive
                        ? "1px solid #6366f1"
                        : "1px solid rgba(255,255,255,0.06)",
                      color: isActive ? "#c7d2fe" : "#64748b",
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <FieldLabel>Blend Mode</FieldLabel>
            <select
              value={blend}
              onChange={(e) => setBlend(e.target.value)}
              style={selectSt}
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </PanelSection>

          {/* Text */}
          <PanelSection
            title="TEXT"
            open={sectionOpen.text}
            onToggle={() => toggleSection("text")}
          >
            <RangeRow
              label="Font Size"
              value={fontSize}
              min={8}
              max={144}
              unit="px"
              onChange={setFontSize}
            />
            <ChipRow style={{ flexWrap: "wrap" }}>
              {FONT_SIZES.map((s) => (
                <Chip
                  key={s}
                  active={fontSize === s}
                  onClick={() => setFontSize(s)}
                >
                  {s}
                </Chip>
              ))}
            </ChipRow>

            <FieldLabel>Font Family</FieldLabel>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{ ...selectSt, marginBottom: 10 }}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                gap: 5,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <ToggleIconBtn
                active={bold}
                onClick={() => setBold(!bold)}
                title="Bold"
              >
                {" "}
                <Bold size={12} />
              </ToggleIconBtn>
              <ToggleIconBtn
                active={italic}
                onClick={() => setItalic(!italic)}
                title="Italic"
              >
                {" "}
                <Italic size={12} />
              </ToggleIconBtn>
              <div
                style={{
                  width: 1,
                  height: 22,
                  background: "rgba(255,255,255,0.07)",
                  margin: "0 2px",
                }}
              />
              <ToggleIconBtn
                active={textAlign === "left"}
                onClick={() => setTextAlign("left")}
                title="Left"
              >
                {" "}
                <AlignLeft size={12} />
              </ToggleIconBtn>
              <ToggleIconBtn
                active={textAlign === "center"}
                onClick={() => setTextAlign("center")}
                title="Center"
              >
                <AlignCenter size={12} />
              </ToggleIconBtn>
              <ToggleIconBtn
                active={textAlign === "right"}
                onClick={() => setTextAlign("right")}
                title="Right"
              >
                {" "}
                <AlignRight size={12} />
              </ToggleIconBtn>
            </div>

            {/* Live text preview */}
            <div
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.95)",
                fontFamily,
                fontSize: Math.min(fontSize, 22),
                fontWeight: bold ? "bold" : "normal",
                fontStyle: italic ? "italic" : "normal",
                color: color === "transparent" ? "#000" : color,
                textAlign,
                border: "1px solid rgba(99,102,241,0.2)",
                minHeight: 36,
                display: "flex",
                alignItems: "center",
              }}
            >
              Preview Text
            </div>
          </PanelSection>

          {/* Options */}
          <PanelSection
            title="OPTIONS"
            open={sectionOpen.options}
            onToggle={() => toggleSection("options")}
          >
            <ToggleRow
              label="Smooth strokes"
              active={smooth}
              onToggle={() => setSmooth(!smooth)}
            />
            <ToggleRow
              label="Fill shapes"
              active={fill}
              onToggle={() => setFill(!fill)}
            />
          </PanelSection>

          <div style={{ flex: 1 }} />

          {/* Shortcuts reference */}
          <div
            style={{
              padding: "10px 14px 14px",
              borderTop: "1px solid rgba(99,102,241,0.07)",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: "#2d2d55",
                letterSpacing: "0.12em",
                marginBottom: 7,
              }}
            >
              SHORTCUTS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 10px",
              }}
            >
              {[
                ["P", "Pen"],
                ["B", "Brush"],
                ["E", "Eraser"],
                ["F", "Fill"],
                ["T", "Text"],
                ["L", "Line"],
                ["A", "Arrow"],
                ["R", "Rect"],
                ["O", "Ellipse"],
                ["I", "Triangle"],
                ["S", "Star"],
                ["V", "Select"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Y", "Redo"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 5,
                    fontSize: 9,
                    color: "#374151",
                    alignItems: "center",
                  }}
                >
                  <kbd
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "#6366f1",
                      padding: "1px 4px",
                      borderRadius: 3,
                      fontSize: 8,
                      fontWeight: 700,
                      minWidth: 16,
                      textAlign: "center",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    {k}
                  </kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Viewer badge */}
      {!isTeacher && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 999,
            background: "rgba(10,10,18,0.92)",
            border: "1px solid rgba(16,185,129,0.25)",
            backdropFilter: "blur(8px)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "#10b981",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <Eye size={11} /> LIVE VIEW — READ ONLY
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const ToolBtn = ({
  children,
  active,
  danger,
  dimmed,
  disabled,
  title,
  onClick,
}) => (
  <button
    onClick={!disabled ? onClick : undefined}
    title={title}
    style={{
      width: 42,
      height: 42,
      borderRadius: 10,
      margin: "1px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: active ? "rgba(99,102,241,0.2)" : "transparent",
      border: active
        ? "1.5px solid rgba(99,102,241,0.65)"
        : "1.5px solid transparent",
      color: danger
        ? "#ef4444"
        : dimmed || disabled
          ? "#1c2030"
          : active
            ? "#a5b4fc"
            : "#64748b",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all .12s",
      outline: "none",
    }}
    onMouseEnter={(e) => {
      if (!active && !disabled)
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    {children}
  </button>
);

const ToolGroupDivider = () => (
  <div
    style={{
      width: 28,
      height: 1,
      background: "rgba(99,102,241,0.12)",
      margin: "4px 0",
    }}
  />
);

const PanelSection = ({ title, open, onToggle, children }) => (
  <div style={{ borderBottom: "1px solid rgba(99,102,241,0.07)" }}>
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#3d3d60",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.14em",
        outline: "none",
      }}
    >
      {title}
      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
    </button>
    {open && <div style={{ padding: "0 14px 12px" }}>{children}</div>}
  </div>
);

const RangeRow = ({ label, value, min, max, unit, onChange }) => (
  <div style={{ marginBottom: 6 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 3,
      }}
    >
      <span style={{ fontSize: 8, color: "#3d3d60", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: "#64748b" }}>
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: "100%",
        accentColor: "#6366f1",
        cursor: "pointer",
        height: 2,
      }}
    />
  </div>
);

const ChipRow = ({ children, style }) => (
  <div style={{ display: "flex", gap: 3, marginBottom: 10, ...style }}>
    {children}
  </div>
);

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "2px 5px",
      borderRadius: 4,
      fontSize: 8,
      cursor: "pointer",
      background: active ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.04)",
      border: active ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.06)",
      color: active ? "#c7d2fe" : "#64748b",
      outline: "none",
    }}
  >
    {children}
  </button>
);

const SwatchBtn = ({ c, active, onClick }) => (
  <button
    onClick={onClick}
    title={c}
    style={{
      flex: 1,
      height: 14,
      borderRadius: 3,
      cursor: "pointer",
      border: active ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.06)",
      background:
        c === "transparent"
          ? "repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%) 0 0 / 8px 8px"
          : c,
      transform: active ? "scale(1.2)" : "scale(1)",
      boxShadow: active ? "0 0 6px rgba(99,102,241,0.7)" : "none",
      transition: "transform .1s",
      outline: "none",
    }}
  />
);

const ToggleRow = ({ label, active, onToggle }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      cursor: "pointer",
      fontSize: 11,
      color: "#94a3b8",
      marginBottom: 8,
    }}
  >
    {label}
    <div
      onClick={onToggle}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: active ? "#6366f1" : "#18182e",
        position: "relative",
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "background .2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: active ? 15 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
        }}
      />
    </div>
  </label>
);

const ToggleIconBtn = ({ active, onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28,
      height: 28,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      outline: "none",
      background: active ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.04)",
      border: active ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.06)",
      color: active ? "#c7d2fe" : "#64748b",
    }}
  >
    {children}
  </button>
);

const StatusPill = ({ label, value }) => (
  <span>
    <span style={{ color: "#334155" }}>{label}:</span>{" "}
    <span style={{ color: "#94a3b8" }}>{value}</span>
  </span>
);

const topBarBtnStyle = (active) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "3px 5px",
  borderRadius: 4,
  color: active ? "#6366f1" : "#475569",
  display: "flex",
  alignItems: "center",
  outline: "none",
});

const ZBtn = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      background: "none",
      border: "none",
      color: "#64748b",
      cursor: "pointer",
      padding: "2px 5px",
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      outline: "none",
    }}
  >
    {children}
  </button>
);

const FieldLabel = ({ children }) => (
  <div
    style={{
      fontSize: 8,
      color: "#3d3d60",
      letterSpacing: "0.09em",
      marginBottom: 5,
      marginTop: 2,
    }}
  >
    {children}
  </div>
);

const selectSt = {
  width: "100%",
  background: "#12121f",
  color: "#94a3b8",
  border: "1px solid rgba(99,102,241,0.15)",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 11,
  outline: "none",
  marginBottom: 8,
  cursor: "pointer",
};

export default Whiteboard;
