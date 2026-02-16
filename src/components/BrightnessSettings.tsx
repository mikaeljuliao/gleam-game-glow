import { useState, useEffect, useCallback, useRef } from 'react';
import { getBrightness, setBrightness, applyBrightnessToCanvas } from '@/game/brightness';

interface BrightnessSettingsProps {
  open: boolean;
  onClose: () => void;
}

/** Render a simulated dungeon scene on a canvas for brightness preview */
function renderDungeonPreview(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  // Dark dungeon floor
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  const ts = 20;
  const cols = Math.ceil(w / ts);
  const rows = Math.ceil(h / ts);

  // Floor tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * ts;
      const y = r * ts;
      const hash = ((r * 7 + c * 13) & 0xFF);
      const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;

      if (isEdge) {
        // Walls
        const dark = 0.7 + (hash % 10) * 0.03;
        ctx.fillStyle = `rgb(${Math.floor(25 * dark)}, ${Math.floor(22 * dark)}, ${Math.floor(35 * dark)})`;
        ctx.fillRect(x, y, ts, ts);
        ctx.fillStyle = 'rgba(35, 30, 50, 0.4)';
        ctx.fillRect(x, y, ts, 1);
        if (hash % 7 === 0) {
          ctx.fillStyle = 'rgba(15, 12, 25, 0.5)';
          ctx.fillRect(x + 3, y + 5, 4, 1);
        }
      } else {
        // Floor
        ctx.fillStyle = (r + c) % 2 === 0 ? '#12121e' : '#10101a';
        ctx.fillRect(x, y, ts, ts);
        if (hash % 17 === 0) {
          ctx.fillStyle = 'rgba(25, 25, 35, 0.3)';
          ctx.fillRect(x + 3, y + 3, 2, 1);
        }
        if (hash % 23 === 0) {
          ctx.fillStyle = 'rgba(80, 20, 20, 0.08)';
          ctx.fillRect(x + 2, y + 5, 4, 4);
        }
        // Faint rune
        if (hash % 53 === 0) {
          ctx.fillStyle = 'rgba(80, 60, 120, 0.05)';
          ctx.beginPath();
          ctx.arc(x + ts / 2, y + ts / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Obstacles (pillars)
  const pillars = [
    { x: w * 0.25, y: h * 0.35, w: 16, h: 18 },
    { x: w * 0.7, y: h * 0.55, w: 16, h: 18 },
    { x: w * 0.45, y: h * 0.7, w: 14, h: 16 },
  ];
  for (const p of pillars) {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(p.x + 3, p.y + 3, p.w + 2, p.h + 2);
    // Body
    ctx.fillStyle = '#1e1c2a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Top
    ctx.fillStyle = '#2a2838';
    ctx.fillRect(p.x, p.y, p.w, 2);
    // Mortar
    ctx.fillStyle = 'rgba(15, 12, 25, 0.3)';
    for (let by = p.y + 5; by < p.y + p.h - 2; by += 5) {
      ctx.fillRect(p.x, by, p.w, 1);
    }
  }

  // Torches with warm glow
  const torches = [
    { x: w * 0.15, y: ts + 2 },
    { x: w * 0.5, y: ts + 2 },
    { x: w * 0.85, y: ts + 2 },
    { x: ts + 2, y: h * 0.5 },
    { x: w - ts - 2, y: h * 0.5 },
  ];
  const flicker = Math.sin(time * 8) * 0.12 + 0.88;
  for (const t of torches) {
    // Floor light pool
    const pool = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 35);
    pool.addColorStop(0, `rgba(255, 130, 40, ${0.05 * flicker})`);
    pool.addColorStop(0.5, `rgba(255, 100, 20, ${0.02 * flicker})`);
    pool.addColorStop(1, 'rgba(255, 80, 10, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(t.x - 35, t.y - 35, 70, 70);
    // Torch glow
    const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 14);
    g.addColorStop(0, `rgba(255, 160, 60, ${0.15 * flicker})`);
    g.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(t.x - 14, t.y - 14, 28, 28);
    // Bracket
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(t.x - 1, t.y, 2, 4);
    // Flame
    ctx.fillStyle = `rgba(255, 140, 30, ${0.7 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y - 2, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 240, 120, ${0.8 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y - 2, 0.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central lighting (player area simulation)
  const cx = w / 2;
  const cy = h / 2;
  const lightR = Math.min(w, h) * 0.45;

  // Darkness vignette (simulates dungeon lighting)
  const darkness = ctx.createRadialGradient(cx, cy, lightR * 0.3, cx, cy, lightR);
  darkness.addColorStop(0, 'rgba(0, 0, 0, 0)');
  darkness.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
  darkness.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = darkness;
  ctx.fillRect(0, 0, w, h);

  // Simulated player (small glow in center)
  const playerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
  playerGlow.addColorStop(0, 'rgba(180, 160, 220, 0.08)');
  playerGlow.addColorStop(1, 'rgba(180, 160, 220, 0)');
  ctx.fillStyle = playerGlow;
  ctx.fillRect(cx - 20, cy - 20, 40, 40);
  ctx.fillStyle = '#8877aa';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Apply gamma correction
  applyBrightnessToCanvas(ctx);
}

const BrightnessSettings = ({ open, onClose }: BrightnessSettingsProps) => {
  const [value, setValue] = useState(getBrightness());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (open) setValue(getBrightness());
  }, [open]);

  // Animate preview canvas
  useEffect(() => {
    if (!open) return;
    let running = true;
    const draw = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          const w = Math.round(rect.width * dpr);
          const h = Math.round(rect.height * dpr);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          renderDungeonPreview(ctx, rect.width, rect.height, performance.now() / 1000);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [open, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setValue(v);
    setBrightness(v);
  }, []);

  const handleReset = useCallback(() => {
    setValue(0);
    setBrightness(0);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a0a14 0%, #080810 100%)',
          borderColor: '#2a2a44',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2
            className="text-center text-lg font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Cinzel', serif", color: '#b0a0cc', letterSpacing: '0.2em' }}
          >
            AJUSTE DE BRILHO
          </h2>
          <p className="text-center mt-2" style={{ color: '#555566', fontFamily: 'monospace', fontSize: '11px' }}>
            Ajuste até enxergar detalhes nas áreas escuras<br />
            sem perder a atmosfera do jogo.
          </p>
        </div>

        {/* Live dungeon preview */}
        <div className="px-6 py-4">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg"
            style={{ height: '180px', background: '#050508' }}
          />
        </div>

        {/* Slider */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            <span style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>🌑</span>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.01"
              value={value}
              onChange={handleChange}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(90deg, #1a1020, #3a2850 50%, #887799)`,
                outline: 'none',
                accentColor: '#8866aa',
              }}
            />
            <span style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>☀️</span>
          </div>
          <p className="text-center mt-2" style={{ color: '#444455', fontFamily: 'monospace', fontSize: '10px' }}>
            {value > 0.01 ? `+${Math.round(value * 100)}%` : value < -0.01 ? `${Math.round(value * 100)}%` : 'Padrão'}
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 text-sm border rounded-lg transition-all duration-200 hover:opacity-80 active:scale-95"
            style={{
              fontFamily: 'monospace',
              color: '#666677',
              letterSpacing: '0.1em',
              background: 'rgba(20, 20, 35, 0.6)',
              borderColor: '#2a2a44',
              fontSize: '11px',
            }}
          >
            RESETAR
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#ccbbee',
              letterSpacing: '0.15em',
              background: 'linear-gradient(180deg, rgba(100, 60, 160, 0.35), rgba(80, 45, 130, 0.25))',
              borderColor: '#554488',
              fontSize: '12px',
            }}
          >
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrightnessSettings;
