// Arena visual effects — ambient particles, combat marks, enhanced atmosphere
import * as C from './constants';
import { getBiome } from './biomes';

// ============ AMBIENT PARTICLES ============
// Dust motes, torch embers, ground fog

interface DustMote {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Ember {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  bright: number; // 0-1 glow intensity
}

interface GroundFog {
  x: number; y: number;
  radius: number;
  alpha: number;
  drift: number;
  phase: number;
}

interface CombatMark {
  x: number; y: number;
  angle: number;
  length: number;
  type: 'slash' | 'blood' | 'impact';
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TorchSmoke {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  life: number;
}

const MAX_DUST = 40;
const MAX_EMBERS = 25;
const MAX_FOG = 12;
const MAX_MARKS = 30;
const MAX_SMOKE = 20;

let dustMotes: DustMote[] = [];
let embers: Ember[] = [];
let groundFog: GroundFog[] = [];
let combatMarks: CombatMark[] = [];
let torchSmoke: TorchSmoke[] = [];
let initialized = false;

function rng(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function initArenaFX() {
  dustMotes = [];
  embers = [];
  groundFog = [];
  combatMarks = [];
  torchSmoke = [];
  initialized = true;

  // Pre-populate ground fog
  for (let i = 0; i < MAX_FOG; i++) {
    groundFog.push({
      x: rng(0, C.dims.gw),
      y: rng(C.dims.gh * 0.5, C.dims.gh),
      radius: rng(25, 60),
      alpha: rng(0.02, 0.06),
      drift: rng(-3, 3),
      phase: rng(0, Math.PI * 2),
    });
  }
}

export function resetArenaFX() {
  combatMarks = [];
}

// ============ UPDATE ============

export function updateArenaFX(dt: number, time: number, playerX: number, playerY: number, torchPositions: { x: number; y: number }[], floor = 1) {
  if (!initialized) initArenaFX();
  const biome = getBiome(floor);

  // --- Dust motes / Snowflakes ---
  if (dustMotes.length < MAX_DUST && Math.random() < 0.2) {
    const isCrystal = biome.theme === 'crystal';
    dustMotes.push({
      x: rng(C.TILE_SIZE, C.dims.gw - C.TILE_SIZE),
      y: rng(C.TILE_SIZE, C.dims.gh - C.TILE_SIZE),
      vx: rng(-4, 4),
      vy: isCrystal ? rng(10, 30) : rng(-6, -1), // Snow falls down
      size: isCrystal ? rng(1, 2) : rng(0.5, 1.5),
      alpha: rng(0.1, 0.4),
      life: isCrystal ? rng(4, 8) : rng(3, 7),
      maxLife: 0,
    });
    dustMotes[dustMotes.length - 1].maxLife = dustMotes[dustMotes.length - 1].life;
  }

  for (let i = dustMotes.length - 1; i >= 0; i--) {
    const d = dustMotes[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx += Math.sin(time * 2 + d.y * 0.1) * 0.5 * dt;
    d.life -= dt;
    if (d.life <= 0 || d.x < 0 || d.x > C.dims.gw || d.y > C.dims.gh) {
      dustMotes.splice(i, 1);
    }
  }

  // --- Embers / Frost Sparkles from torches ---
  if (embers.length < MAX_EMBERS && torchPositions.length > 0 && Math.random() < 0.2) {
    const torch = torchPositions[Math.floor(Math.random() * torchPositions.length)];
    const isCrystal = biome.theme === 'crystal';
    embers.push({
      x: torch.x + rng(-3, 3),
      y: torch.y - 5,
      vx: rng(-8, 8),
      vy: isCrystal ? rng(5, 15) : rng(-20, -8), // Frost sinks, embers rise
      size: rng(0.5, 1.8),
      alpha: rng(0.4, 0.9),
      life: rng(1, 3),
      maxLife: 0,
      bright: rng(0.5, 1),
    });
    embers[embers.length - 1].maxLife = embers[embers.length - 1].life;
  }

  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (biome.theme === 'crystal') {
      e.vy += 15 * dt; // sink faster
    } else {
      e.vy += 5 * dt; // slight gravity pull back
    }
    e.vx += Math.sin(time * 5 + e.x) * 2 * dt;
    e.life -= dt;
    e.bright *= 0.98;
    if (e.life <= 0) {
      embers.splice(i, 1);
    }
  }

  // --- Ground fog drift ---
  for (const f of groundFog) {
    if (biome.theme === 'crystal') {
      f.radius = rng(30, 70); // Wider cold mist
    }
    f.x += f.drift * dt;
    if (f.x < -f.radius) f.x = C.dims.gw + f.radius;
    if (f.x > C.dims.gw + f.radius) f.x = -f.radius;
  }

  // --- Torch smoke / Cold Breath ---
  if (torchSmoke.length < MAX_SMOKE && torchPositions.length > 0 && Math.random() < 0.15) {
    const torch = torchPositions[Math.floor(Math.random() * torchPositions.length)];
    const isCrystal = biome.theme === 'crystal';
    torchSmoke.push({
      x: torch.x + rng(-2, 2),
      y: torch.y - 6,
      vx: rng(-2, 2),
      vy: isCrystal ? rng(1, 4) : rng(-12, -5), // Cold breath sinks
      size: isCrystal ? rng(4, 8) : rng(3, 6),
      alpha: isCrystal ? rng(0.1, 0.2) : rng(0.03, 0.08),
      life: rng(2, 4),
    });
  }

  for (let i = torchSmoke.length - 1; i >= 0; i--) {
    const s = torchSmoke[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.size += 2 * dt;
    s.alpha *= 0.98;
    s.life -= dt;
    if (s.life <= 0 || s.alpha < 0.005) {
      torchSmoke.splice(i, 1);
    }
  }

  // --- Combat marks (blood marks are permanent, no fading) ---
  // Only remove non-blood marks that expire
  for (let i = combatMarks.length - 1; i >= 0; i--) {
    if (combatMarks[i].type !== 'blood') {
      combatMarks[i].life -= dt;
      if (combatMarks[i].life <= 0) {
        combatMarks.splice(i, 1);
      }
    }
  }
}

// ============ COMBAT MARK SPAWNERS ============

export function spawnSlashMark(x: number, y: number, angle: number) {
  if (combatMarks.length >= MAX_MARKS) combatMarks.shift();
  combatMarks.push({
    x, y,
    angle,
    length: rng(8, 16),
    type: 'slash',
    alpha: 0.35,
    life: 99999, // Permanent scar
    maxLife: 99999,
    color: 'rgba(20, 18, 25, 0.4)',
    size: rng(1, 2),
  });
}

export function spawnBloodMark(x: number, y: number) {
  // Blood marks are permanent — no life limit
  if (combatMarks.length >= MAX_MARKS) combatMarks.shift();
  combatMarks.push({
    x, y,
    angle: rng(0, Math.PI * 2),
    length: rng(4, 10),
    type: 'blood',
    alpha: 0.25,
    life: 99999,
    maxLife: 99999,
    color: 'rgba(120, 15, 15, 0.35)',
    size: rng(3, 7),
  });
}

export function spawnImpactMark(_x: number, _y: number) {
  // Removed — no impact ripples
}

// ============ RENDER — FLOOR LAYER (before entities) ============

export function renderArenaFloorFX(ctx: CanvasRenderingContext2D, time: number, floor = 1) {
  // --- Enhanced floor decorations ---
  renderFloorDecorations(ctx, time, floor);

  // --- Combat marks on floor (only blood) ---
  for (const m of combatMarks) {
    if (m.type === 'blood') {
      // Blood splatter — irregular shape, permanent
      ctx.fillStyle = `rgba(100, 10, 10, ${m.alpha})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.size, m.size * 0.6, m.angle, 0, Math.PI * 2);
      ctx.fill();
      // Smaller droplets nearby
      for (let i = 0; i < 3; i++) {
        const dx = Math.cos(m.angle + i * 1.2) * m.size * 1.5;
        const dy = Math.sin(m.angle + i * 1.2) * m.size * 1.2;
        ctx.beginPath();
        ctx.arc(m.x + dx, m.y + dy, m.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Ground fog ---
  const biome = getBiome(floor);
  for (const f of groundFog) {
    const pulse = Math.sin(time * 0.8 + f.phase) * 0.3 + 0.7;
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);

    if (biome.theme === 'crystal') {
      // Cold frozen mist
      grad.addColorStop(0, `rgba(200, 230, 255, ${f.alpha * pulse * 1.5})`);
      grad.addColorStop(0.5, `rgba(150, 200, 255, ${f.alpha * pulse * 0.6})`);
      grad.addColorStop(1, 'rgba(100, 150, 255, 0)');
    } else {
      grad.addColorStop(0, `rgba(25, 22, 40, ${f.alpha * pulse})`);
      grad.addColorStop(0.5, `rgba(20, 18, 35, ${f.alpha * pulse * 0.4})`);
      grad.addColorStop(1, 'rgba(15, 12, 25, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2);
  }
}

// ============ RENDER — OVERLAY LAYER (after entities, before lighting) ============

export function renderArenaOverlayFX(ctx: CanvasRenderingContext2D, time: number, floor = 1) {
  const biome = getBiome(floor);
  // --- Dust motes (glow when in light) ---
  for (const d of dustMotes) {
    const fadeIn = Math.min(1, (d.maxLife - d.life) / 0.5);
    const fadeOut = Math.min(1, d.life / 1);
    const alpha = d.alpha * fadeIn * fadeOut;
    const pulse = Math.sin(time * 3 + d.x) * 0.3 + 0.7;

    if (biome.theme === 'crystal') {
      // Snowflakes / Frost motes
      ctx.fillStyle = `rgba(220, 240, 255, ${alpha * pulse * 1.5})`;
    } else {
      ctx.fillStyle = `rgba(200, 190, 170, ${alpha * pulse})`;
    }

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Embers ---
  for (const e of embers) {
    const fadeOut = Math.min(1, e.life / 0.5);
    const alpha = e.alpha * fadeOut;
    // Hot core
    const r = Math.floor(255);
    const g = Math.floor(100 + e.bright * 100);
    const b = Math.floor(20 + e.bright * 30);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
    glow.addColorStop(0, `rgba(${r}, ${g}, 30, ${alpha * 0.3})`);
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(e.x - e.size * 3, e.y - e.size * 3, e.size * 6, e.size * 6);
  }

  // --- Torch smoke ---
  for (const s of torchSmoke) {
    ctx.fillStyle = `rgba(30, 25, 40, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============ ENHANCED FLOOR DECORATIONS ============

function renderFloorDecorations(ctx: CanvasRenderingContext2D, time: number, floor = 1) {
  const biome = getBiome(floor);
  const gw = C.dims.gw;
  const gh = C.dims.gh;
  const cx = gw / 2;
  const cy = gh / 2;

  // --- Central rune circle (subtle, mysterious) ---
  const runeAlpha = 0.035 + Math.sin(time * 0.5) * 0.008;
  ctx.strokeStyle = `rgba(100, 70, 160, ${runeAlpha})`;
  ctx.lineWidth = 1;
  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.stroke();
  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, 35, 0, Math.PI * 2);
  ctx.stroke();
  // Rune symbols (simple geometric)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 0.02;
    const rx = cx + Math.cos(a) * 42;
    const ry = cy + Math.sin(a) * 42;
    ctx.fillStyle = `rgba(100, 70, 160, ${runeAlpha * 1.2})`;
    ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
  }
  // Cross lines through center
  ctx.beginPath();
  ctx.moveTo(cx - 50, cy);
  ctx.lineTo(cx + 50, cy);
  ctx.moveTo(cx, cy - 50);
  ctx.lineTo(cx, cy + 50);
  ctx.stroke();
  // Diagonal cross
  const diag = 35;
  ctx.strokeStyle = `rgba(100, 70, 160, ${runeAlpha * 0.7})`;
  ctx.beginPath();
  ctx.moveTo(cx - diag, cy - diag);
  ctx.lineTo(cx + diag, cy + diag);
  ctx.moveTo(cx + diag, cy - diag);
  ctx.lineTo(cx - diag, cy + diag);
  ctx.stroke();

  if (biome.theme === 'crystal') {
    // FROZEN RUNE GLOW
    ctx.shadowBlur = 4;
    ctx.shadowColor = biome.accent;
    ctx.strokeStyle = `rgba(180, 240, 255, ${runeAlpha * 2})`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Large floor cracks (organic, spanning multiple tiles) ---
  ctx.strokeStyle = 'rgba(20, 18, 30, 0.25)';
  ctx.lineWidth = 0.8;
  // Crack 1 — from top-left area
  ctx.beginPath();
  ctx.moveTo(gw * 0.15, gh * 0.2);
  ctx.quadraticCurveTo(gw * 0.2, gh * 0.35, gw * 0.25, gh * 0.4);
  ctx.quadraticCurveTo(gw * 0.3, gh * 0.42, gw * 0.32, gh * 0.5);
  ctx.stroke();
  // Crack 2 — from bottom-right
  ctx.beginPath();
  ctx.moveTo(gw * 0.8, gh * 0.75);
  ctx.quadraticCurveTo(gw * 0.75, gh * 0.65, gw * 0.7, gh * 0.6);
  ctx.stroke();
  // Crack 3 — horizontal
  ctx.beginPath();
  ctx.moveTo(gw * 0.55, gh * 0.8);
  ctx.quadraticCurveTo(gw * 0.6, gh * 0.78, gw * 0.68, gh * 0.82);
  ctx.stroke();

  // --- Moisture patches (darker, subtle wet spots) ---
  if (biome.theme !== 'crystal') {
    const moistureSpots = [
      { x: gw * 0.12, y: gh * 0.7, r: 12 },
      { x: gw * 0.85, y: gh * 0.3, r: 10 },
      { x: gw * 0.4, y: gh * 0.85, r: 14 },
      { x: gw * 0.7, y: gh * 0.15, r: 8 },
    ];
    for (const m of moistureSpots) {
      const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      grad.addColorStop(0, 'rgba(15, 18, 25, 0.15)');
      grad.addColorStop(0.6, 'rgba(15, 18, 25, 0.06)');
      grad.addColorStop(1, 'rgba(15, 18, 25, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
  } else {
    // ICE PATCHES (Slippery looking white gradients)
    const iceSpots = [
      { x: gw * 0.15, y: gh * 0.2, r: 20 },
      { x: gw * 0.75, y: gh * 0.8, r: 25 },
      { x: gw * 0.3, y: gh * 0.6, r: 15 },
    ];
    for (const m of iceSpots) {
      const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      grad.addColorStop(0.7, 'rgba(200, 240, 255, 0.05)');
      grad.addColorStop(1, 'rgba(200, 240, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
  }

  // --- Moss/lichen patches along walls ---
  if (biome.theme !== 'crystal') {
    const wallMoss = [
      { x: C.TILE_SIZE * 3, y: C.TILE_SIZE + 2, w: 15, h: 4 },
      { x: C.TILE_SIZE * 8, y: gh - C.TILE_SIZE - 3, w: 12, h: 3 },
      { x: C.TILE_SIZE + 2, y: C.TILE_SIZE * 5, w: 4, h: 10 },
      { x: gw - C.TILE_SIZE - 3, y: C.TILE_SIZE * 8, w: 3, h: 12 },
      { x: C.TILE_SIZE * 14, y: C.TILE_SIZE + 1, w: 18, h: 3 },
      { x: C.TILE_SIZE * 20, y: gh - C.TILE_SIZE - 2, w: 10, h: 3 },
    ];
    for (const m of wallMoss) {
      ctx.fillStyle = 'rgba(20, 45, 25, 0.12)';
      ctx.fillRect(m.x, m.y, m.w, m.h);
      // Slightly brighter spots
      ctx.fillStyle = 'rgba(30, 55, 30, 0.07)';
      ctx.fillRect(m.x + 2, m.y, m.w * 0.5, m.h * 0.6);
    }
  } else {
    // FROZEN EDGES
    ctx.fillStyle = 'rgba(200, 240, 255, 0.15)';
    ctx.fillRect(0, C.TILE_SIZE, gw, 2);
    ctx.fillRect(0, gh - C.TILE_SIZE - 2, gw, 2);
  }

  // --- Scattered stone chips (away from center) ---
  const chips = [
    { x: gw * 0.1, y: gh * 0.3, s: 2 },
    { x: gw * 0.9, y: gh * 0.6, s: 3 },
    { x: gw * 0.3, y: gh * 0.9, s: 2 },
    { x: gw * 0.75, y: gh * 0.1, s: 2 },
    { x: gw * 0.2, y: gh * 0.5, s: 1.5 },
    { x: gw * 0.6, y: gh * 0.2, s: 2.5 },
  ];
  for (const c of chips) {
    ctx.fillStyle = 'rgba(50, 45, 65, 0.15)';
    ctx.fillRect(c.x, c.y, c.s, c.s * 0.7);
    ctx.fillRect(c.x + c.s, c.y + 1, c.s * 0.5, c.s * 0.5);
  }
}

// ============ TORCH POSITIONS HELPER ============

export function getTorchPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let col = 4; col < C.dims.rc; col += 8) {
    positions.push({ x: col * C.TILE_SIZE, y: C.TILE_SIZE });
    positions.push({ x: col * C.TILE_SIZE, y: C.dims.gh - C.TILE_SIZE });
  }
  for (let row = 5; row < C.dims.rr; row += 5) {
    positions.push({ x: C.TILE_SIZE, y: row * C.TILE_SIZE });
    positions.push({ x: C.dims.gw - C.TILE_SIZE, y: row * C.TILE_SIZE });
  }
  return positions;
}
