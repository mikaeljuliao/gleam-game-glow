import { PlayerState, EnemyState, ProjectileState, Particle, DungeonMap, DungeonRoom, Obstacle, ScreenEffect, Viewport } from './types';
import { HiddenTrap } from './traps';
import * as C from './constants';
import { getBrightness } from './brightness';
import { getBiome, Biome } from './biomes';

/** Draw text with letter-spacing by rendering each character individually */
function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, stroke = false) {
  let cx = x;
  const align = ctx.textAlign;
  if (align === 'center') {
    let totalW = 0;
    for (const ch of text) totalW += ctx.measureText(ch).width + spacing;
    totalW -= spacing;
    cx = x - totalW / 2;
  } else if (align === 'right') {
    let totalW = 0;
    for (const ch of text) totalW += ctx.measureText(ch).width + spacing;
    totalW -= spacing;
    cx = x - totalW;
  }
  const savedAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) {
    if (stroke) ctx.strokeText(ch, cx, y);
    else ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = savedAlign;
}

/** Clean text: just color + letter spacing, no outline/shadow/glow */
function drawHudText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, spacing = 0.8) {
  ctx.fillStyle = color;
  drawSpacedText(ctx, text, x, y, spacing, false);
}

// Render dungeon atmosphere in the viewport margins (beyond the 640x400 game area)
// This fills the "black bars" with stone wall textures so the arena feels immersive
export function renderViewportMargins(ctx: CanvasRenderingContext2D, time: number, vp: Viewport, floor = 1) {
  const { gox, goy, rw, rh } = vp;
  const ts = C.TILE_SIZE;
  const biome = getBiome(floor);

  const startCol = Math.floor(-gox / ts) - 1;
  const endCol = Math.ceil((rw - gox) / ts) + 1;
  const startRow = Math.floor(-goy / ts) - 1;
  const endRow = Math.ceil((rh - goy) / ts) + 1;

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      if (row >= 0 && row < C.dims.rr && col >= 0 && col < C.dims.rc) continue;

      const x = col * ts;
      const y = row * ts;
      const hash = ((row * 7 + col * 13) & 0xFF);

      // Warmer, more visible stone walls — based on biome color
      const shade = 0.8 + (hash % 10) * 0.03;
      ctx.fillStyle = biome.wall;
      ctx.globalAlpha = shade;
      ctx.fillRect(x, y, ts, ts);
      ctx.globalAlpha = 1.0;

      // Stone brick mortar lines
      ctx.fillStyle = biome.wallDetail;
      if ((row + col) % 2 === 0) {
        ctx.fillRect(x, y, ts, 1);
        ctx.fillRect(x, y, 1, ts);
      }
      // Alternate brick pattern
      if ((row + col) % 2 === 1) {
        ctx.fillRect(x + ts / 2, y, 1, ts);
      }

      // Cracks & details
      if (hash % 11 === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x + 3, y + 5, 5, 1);
      }

      // Biome-specific details (Moss/Ash/etc)
      if (hash % 23 === 0) {
        ctx.fillStyle = biome.detail;
        ctx.fillRect(x + 1, y + ts - 4, 7, 3);
      }

      // Pillar columns every ~6 tiles along arena edge
      const distToArenaCol = col < 0 ? -col : col - C.dims.rc + 1;
      const distToArenaRow = row < 0 ? -row : row - C.dims.rr + 1;
      const nearEdge = (distToArenaCol === 1 || distToArenaRow === 1);

      if (nearEdge && (col % 6 === 0 || row % 5 === 0)) {
        ctx.fillStyle = biome.wallTop;
        ctx.fillRect(x + 2, y, ts - 4, ts);
        ctx.fillStyle = biome.wallDetail;
        ctx.fillRect(x + 3, y, 1, ts);
      }
    }
  }

  // Soft fog/mist along margins — atmospheric glow matching biome accent
  const fogAlpha = 0.03 + Math.sin(time * 0.5) * 0.01;
  const fogColor = biome.accentGlow.replace('0.15', fogAlpha.toString()).replace('0.2', fogAlpha.toString());

  // Outer fade
  const grad = ctx.createRadialGradient(C.dims.gw / 2, C.dims.gh / 2, 200, C.dims.gw / 2, C.dims.gh / 2, 600);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, fogColor);
  ctx.fillStyle = grad;
  ctx.fillRect(-gox, -goy, rw, rh);
}
import { roomKey, getCurrentRoom } from './dungeon';

export function renderFloor(ctx: CanvasRenderingContext2D, time: number, floor = 1) {
  const biome = getBiome(floor);
  const ts = C.TILE_SIZE;

  // Render floor slabs (Large bricks/tiles)
  // We use a larger grid for slabs (e.g. 40x40 or 3x2 tiles)
  for (let row = 0; row < C.dims.rr; row++) {
    for (let col = 0; col < C.dims.rc; col++) {
      const x = col * ts;
      const y = row * ts;
      const isEdge = row === 0 || row === C.dims.rr - 1 || col === 0 || col === C.dims.rc - 1;

      if (isEdge) {
        // Architectural Walls with Depth
        const isBottom = row === C.dims.rr - 1;
        const isTop = row === 0;

        ctx.fillStyle = biome.wall;
        ctx.fillRect(x, y, ts, ts);

        // Heavy Top Face (Architectural perspective)
        if (isTop) {
          ctx.fillStyle = biome.wallTop;
          ctx.fillRect(x, y, ts, 12);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(x, y, ts, 1); // Edge highlight
        } else {
          ctx.fillStyle = biome.wallTop;
          ctx.fillRect(x, y, ts, 3);
        }

        // Brick mortar lines on side walls
        ctx.fillStyle = biome.wallDetail;
        if ((row + col) % 3 === 0) {
          ctx.fillRect(x + 4, y + 14, ts - 8, 1);
        }

        // Baseboard / Floor Trim
        if (!isTop) {
          ctx.fillStyle = biome.seam;
          ctx.fillRect(x, y + ts - 2, ts, 2);
        }
      } else {
        // Material Slabs logic
        // Group tiles into 3x2 or 2x2 slabs using floor/hash
        const slabCol = Math.floor(col / 3);
        const slabRow = Math.floor(row / 2);
        const slabID = (slabCol * 13 + slabRow * 7) % 100;

        ctx.fillStyle = slabID % 2 === 0 ? biome.floor : biome.floorAlt;
        ctx.fillRect(x, y, ts, ts);

        // Slab Seams & Bevels
        const inSlabCol = col % 3;
        const inSlabRow = row % 2;

        ctx.fillStyle = biome.seam;
        // Draw seams at slab edges
        if (inSlabCol === 0) ctx.fillRect(x, y, 1, ts);
        if (inSlabRow === 0) ctx.fillRect(x, y, ts, 1);

        // Material Variation / Procedural Noise
        const noise = (row * 31 + col * 17) % 10;
        if (noise === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
        }

        // Wear and Tear (cracks, details)
        if (slabID % 17 === 0 && inSlabCol === 1 && inSlabRow === 1) {
          ctx.fillStyle = biome.seam;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x + 5, y + 8, 8, 1);
          ctx.fillRect(x + 9, y + 5, 1, 6);
          ctx.globalAlpha = 1.0;
        }

        // Biome detail (Moss/Rust/Ash)
        if (slabID % 23 === 0) {
          ctx.fillStyle = biome.detail;
          ctx.fillRect(x + 2, y + ts - 5, ts - 4, 3);
        }
      }
    }
  }

  // Wall torches - rendered with biome-specific colors
  const torchPositions: { x: number; y: number }[] = [];
  for (let col = 4; col < C.dims.rc; col += 8) {
    torchPositions.push({ x: col * C.TILE_SIZE, y: C.TILE_SIZE });
    torchPositions.push({ x: col * C.TILE_SIZE, y: C.dims.gh - C.TILE_SIZE });
  }
  for (let row = 5; row < C.dims.rr; row += 5) {
    torchPositions.push({ x: C.TILE_SIZE, y: row * C.TILE_SIZE });
    torchPositions.push({ x: C.dims.gw - C.TILE_SIZE, y: row * C.TILE_SIZE });
  }

  const flicker = Math.sin(time * 8) * 0.15 + 0.85;
  const flicker2 = Math.sin(time * 11 + 1.3) * 0.1 + 0.9;

  for (let ti = 0; ti < torchPositions.length; ti++) {
    const t = torchPositions[ti];
    const localFlicker = ti % 2 === 0 ? flicker : flicker2;

    // Biome-specific light pool
    const floorGlow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 60);
    floorGlow.addColorStop(0, biome.accentGlow.replace('0.15', (0.12 * localFlicker).toString()));
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(t.x - 60, t.y - 60, 120, 120);

    // Torch light core
    const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 15);
    g.addColorStop(0, biome.accent);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.4 * localFlicker;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Torch handle
    ctx.fillStyle = biome.wallDetail;
    ctx.fillRect(t.x - 1, t.y, 2, 8);

    // Flame
    const fSway = Math.sin(time * 12 + ti * 2) * 1;
    ctx.fillStyle = biome.accent;
    ctx.beginPath();
    ctx.moveTo(t.x - 2 + fSway * 0.5, t.y - 2);
    ctx.quadraticCurveTo(t.x + fSway, t.y - 8, t.x + fSway * 0.3, t.y - 2);
    ctx.fill();
  }
}

export function renderDoors(ctx: CanvasRenderingContext2D, room: DungeonRoom, time: number, doorsLocked: boolean = false, dungeon?: DungeonMap) {
  const midX = C.dims.gw / 2;
  const midY = C.dims.gh / 2;
  const dw = C.DOOR_WIDTH;
  const isOpen = room.cleared && !doorsLocked;
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;

  // Helper to check if a neighboring room has been visited
  const isNeighborVisited = (dir: 'north' | 'south' | 'east' | 'west'): boolean => {
    if (!dungeon) return true;
    let nx = room.gridX, ny = room.gridY;
    if (dir === 'north') ny--;
    else if (dir === 'south') ny++;
    else if (dir === 'west') nx--;
    else if (dir === 'east') nx++;
    const key = roomKey(nx, ny);
    const neighbor = dungeon.rooms.get(key);
    return neighbor ? neighbor.visited : false;
  };

  const drawDoor = (x: number, y: number, w: number, h: number, dir: 'north' | 'south' | 'east' | 'west') => {
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (isOpen) {
      const visited = isNeighborVisited(dir);

      if (visited) {
        // GREEN — already visited room
        ctx.fillStyle = `rgba(50, 255, 100, ${0.25 * pulse})`;
        ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
        ctx.fillStyle = `rgba(50, 255, 100, ${0.15 * pulse})`;
        ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
        ctx.fillStyle = '#030308';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = `rgba(50, 255, 100, ${0.9 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // Arrow
        ctx.fillStyle = `rgba(50, 255, 100, ${0.95 * pulse})`;
        ctx.beginPath();
        const arrowSize = 8;
        if (dir === 'north') { ctx.moveTo(cx, cy - arrowSize); ctx.lineTo(cx - arrowSize, cy + arrowSize / 2); ctx.lineTo(cx + arrowSize, cy + arrowSize / 2); }
        else if (dir === 'south') { ctx.moveTo(cx, cy + arrowSize); ctx.lineTo(cx - arrowSize, cy - arrowSize / 2); ctx.lineTo(cx + arrowSize, cy - arrowSize / 2); }
        else if (dir === 'west') { ctx.moveTo(cx - arrowSize, cy); ctx.lineTo(cx + arrowSize / 2, cy - arrowSize); ctx.lineTo(cx + arrowSize / 2, cy + arrowSize); }
        else { ctx.moveTo(cx + arrowSize, cy); ctx.lineTo(cx - arrowSize / 2, cy - arrowSize); ctx.lineTo(cx - arrowSize / 2, cy + arrowSize); }
        ctx.closePath();
        ctx.fill();
        // Label
        ctx.fillStyle = `rgba(50, 255, 100, ${0.7 * pulse})`;
        ctx.font = `500 7px ${C.HUD_FONT}`;
        ctx.textAlign = 'center';
        if (dir === 'north') ctx.fillText('VISITADA', cx, y + C.TILE_SIZE + 14);
        else if (dir === 'south') ctx.fillText('VISITADA', cx, y - 6);
        else if (dir === 'west') ctx.fillText('VISITADA', x + C.TILE_SIZE + 28, cy + 3);
        else ctx.fillText('VISITADA', x - 28, cy + 3);
        ctx.textAlign = 'left';
      } else {
        // ORANGE — unexplored room
        ctx.fillStyle = `rgba(255, 165, 0, ${0.3 * pulse})`;
        ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
        ctx.fillStyle = `rgba(255, 165, 0, ${0.18 * pulse})`;
        ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
        ctx.fillStyle = '#030308';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = `rgba(255, 180, 30, ${0.9 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // Arrow
        ctx.fillStyle = `rgba(255, 180, 30, ${0.95 * pulse})`;
        ctx.beginPath();
        const arrowSize = 8;
        if (dir === 'north') { ctx.moveTo(cx, cy - arrowSize); ctx.lineTo(cx - arrowSize, cy + arrowSize / 2); ctx.lineTo(cx + arrowSize, cy + arrowSize / 2); }
        else if (dir === 'south') { ctx.moveTo(cx, cy + arrowSize); ctx.lineTo(cx - arrowSize, cy - arrowSize / 2); ctx.lineTo(cx + arrowSize, cy - arrowSize / 2); }
        else if (dir === 'west') { ctx.moveTo(cx - arrowSize, cy); ctx.lineTo(cx + arrowSize / 2, cy - arrowSize); ctx.lineTo(cx + arrowSize / 2, cy + arrowSize); }
        else { ctx.moveTo(cx + arrowSize, cy); ctx.lineTo(cx - arrowSize / 2, cy - arrowSize); ctx.lineTo(cx - arrowSize / 2, cy + arrowSize); }
        ctx.closePath();
        ctx.fill();
        // Label
        ctx.fillStyle = `rgba(255, 180, 30, ${0.85 * pulse})`;
        ctx.font = `500 8px ${C.HUD_FONT}`;
        ctx.textAlign = 'center';
        if (dir === 'north') ctx.fillText('? EXPLORAR ?', cx, y + C.TILE_SIZE + 16);
        else if (dir === 'south') ctx.fillText('? EXPLORAR ?', cx, y - 8);
        else if (dir === 'west') ctx.fillText('? EXPLORAR', x + C.TILE_SIZE + 28, cy + 3);
        else ctx.fillText('EXPLORAR ?', x - 36, cy + 3);
        ctx.textAlign = 'left';
      }
    } else {
      // RED — locked (in battle)
      ctx.fillStyle = '#1a1122';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#442222';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      // Lock X
      ctx.strokeStyle = '#663333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
      // "TRANCADA" label
      ctx.fillStyle = 'rgba(150, 60, 60, 0.5)';
      ctx.font = `6px ${C.HUD_FONT}`;
      ctx.textAlign = 'center';
      if (dir === 'north') ctx.fillText('TRANCADA', cx, y + C.TILE_SIZE + 12);
      else if (dir === 'south') ctx.fillText('TRANCADA', cx, y - 4);
      else if (dir === 'west') ctx.fillText('TRANCADA', x + C.TILE_SIZE + 30, cy + 3);
      else ctx.fillText('TRANCADA', x - 30, cy + 3);
      ctx.textAlign = 'left';
    }
  };

  if (room.doors.north) drawDoor(midX - dw / 2, 0, dw, C.TILE_SIZE, 'north');
  if (room.doors.south) drawDoor(midX - dw / 2, C.dims.gh - C.TILE_SIZE, dw, C.TILE_SIZE, 'south');
  if (room.doors.west) drawDoor(0, midY - dw / 2, C.TILE_SIZE, dw, 'west');
  if (room.doors.east) drawDoor(C.dims.gw - C.TILE_SIZE, midY - dw / 2, C.TILE_SIZE, dw, 'east');
}

export function renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
  for (const o of obstacles) {
    const hash = ((o.x * 7 + o.y * 13) & 0xFF);

    // Projected shadow (longer, softer, directional — as if lit from above-left)
    const shadowOff = 4;
    const shadowGrad = ctx.createLinearGradient(o.x + shadowOff, o.y + shadowOff, o.x + o.w + shadowOff + 3, o.y + o.h + shadowOff + 3);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(o.x + shadowOff, o.y + shadowOff, o.w + 3, o.h + 3);

    // Base body — slight color variation per pillar
    const bodyR = 30 + (hash % 8);
    const bodyG = 28 + (hash % 6);
    const bodyB = 42 + (hash % 10);
    ctx.fillStyle = `rgb(${bodyR}, ${bodyG}, ${bodyB})`;
    ctx.fillRect(o.x, o.y, o.w, o.h);

    // Stone brick lines (horizontal mortar)
    ctx.fillStyle = 'rgba(15, 12, 25, 0.3)';
    const brickH = 5;
    for (let by = o.y + brickH; by < o.y + o.h - 2; by += brickH) {
      ctx.fillRect(o.x, by, o.w, 1);
    }
    // Vertical mortar (offset per row)
    for (let by = o.y; by < o.y + o.h - 2; by += brickH) {
      const row = Math.floor((by - o.y) / brickH);
      const vOff = row % 2 === 0 ? o.w * 0.4 : o.w * 0.7;
      ctx.fillRect(o.x + vOff, by, 1, brickH);
    }

    // Top cap — lighter highlight
    ctx.fillStyle = C.COLORS.obstacleTop;
    ctx.fillRect(o.x, o.y, o.w, 3);
    // Top bevel highlight
    ctx.fillStyle = 'rgba(80, 75, 100, 0.3)';
    ctx.fillRect(o.x, o.y, o.w, 1);

    // Bottom edge — darker
    ctx.fillStyle = 'rgba(10, 8, 18, 0.4)';
    ctx.fillRect(o.x, o.y + o.h - 1, o.w, 1);

    // Left edge highlight (light source from left)
    ctx.fillStyle = 'rgba(60, 55, 80, 0.2)';
    ctx.fillRect(o.x, o.y + 3, 1, o.h - 4);

    // Right edge shadow
    ctx.fillStyle = 'rgba(10, 8, 18, 0.25)';
    ctx.fillRect(o.x + o.w - 1, o.y + 3, 1, o.h - 4);

    // Cracks — unique per pillar based on hash
    ctx.strokeStyle = 'rgba(12, 10, 20, 0.35)';
    ctx.lineWidth = 0.6;
    if (hash % 3 === 0) {
      // Diagonal crack from top-left
      ctx.beginPath();
      ctx.moveTo(o.x + 2, o.y + 4);
      ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.35);
      ctx.lineTo(o.x + o.w * 0.35, o.y + o.h * 0.5);
      ctx.stroke();
    }
    if (hash % 5 === 0) {
      // Horizontal crack mid-section
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.3, o.y + o.h * 0.6);
      ctx.lineTo(o.x + o.w * 0.8, o.y + o.h * 0.55);
      ctx.stroke();
    }
    if (hash % 7 === 0) {
      // Small chip/dent
      ctx.fillStyle = 'rgba(10, 8, 18, 0.3)';
      ctx.fillRect(o.x + o.w * 0.6, o.y + o.h * 0.3, 3, 2);
    }

    // Moss/lichen patches — green growth on stone
    if (hash % 4 < 2) {
      // Bottom moss (most common — moisture collects at base)
      ctx.fillStyle = 'rgba(25, 55, 30, 0.18)';
      const mossW = 4 + (hash % 5);
      const mossX = o.x + (hash % 3) * 2;
      ctx.fillRect(mossX, o.y + o.h - 4, mossW, 4);
      // Brighter spots
      ctx.fillStyle = 'rgba(35, 70, 35, 0.1)';
      ctx.fillRect(mossX + 1, o.y + o.h - 3, mossW * 0.6, 2);
    }
    if (hash % 6 === 0) {
      // Side moss (rarer)
      ctx.fillStyle = 'rgba(20, 50, 28, 0.15)';
      ctx.fillRect(o.x, o.y + o.h * 0.5, 3, 6);
    }
    if (hash % 9 === 0) {
      // Top moss patch (very rare — ancient pillar)
      ctx.fillStyle = 'rgba(22, 48, 25, 0.12)';
      ctx.fillRect(o.x + 2, o.y + 3, o.w - 4, 2);
    }

    // Small stone detail textures
    ctx.fillStyle = 'rgba(50, 45, 70, 0.15)';
    ctx.fillRect(o.x + 3, o.y + o.h * 0.4, 2, 1);
    if (hash % 2 === 0) {
      ctx.fillRect(o.x + o.w - 5, o.y + o.h * 0.7, 2, 1);
    }
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
  const visible = p.invincibleTime <= 0 || Math.floor(p.invincibleTime * 20) % 2 === 0;
  if (!visible) return;

  const x = p.x;
  const y = p.y;
  const isMoving = p.trail.length > 0 || p.isDashing;
  const breathe = Math.sin(time * 2.5) * 0.5;
  const bobY = isMoving ? Math.sin(time * 10) * 1.2 : breathe * 0.3;

  // === IDLE STATE (3+ seconds idle → look around, adjust hood) ===
  const idleTime = p.idleTime || 0;
  const isIdle = idleTime >= 3;
  // Idle cycle: 0-2s look left, 2-3s look right, 3-5s settle, 5-6s hood adjust, 6-8s breathe deep
  const idleCycle = isIdle ? (idleTime - 3) % 8 : 0;
  let idleLookX = 0;
  let idleLookY = 0;
  let idleHoodShift = 0;
  let idleDeepBreathe = 0;
  if (isIdle) {
    if (idleCycle < 2) {
      // Slow look left
      const t = idleCycle / 2;
      idleLookX = -Math.sin(t * Math.PI) * 1.2;
      idleLookY = Math.sin(t * Math.PI * 2) * 0.3;
    } else if (idleCycle < 3) {
      // Quick look right
      const t = (idleCycle - 2);
      idleLookX = Math.sin(t * Math.PI) * 1.5;
      idleLookY = -0.2;
    } else if (idleCycle < 5) {
      // Settle back to center
      const t = (idleCycle - 3) / 2;
      idleLookX = (1 - t) * 0.5;
    } else if (idleCycle < 6) {
      // Hood adjust — slight upward bob
      const t = (idleCycle - 5);
      idleHoodShift = Math.sin(t * Math.PI) * 1.5;
    } else {
      // Deep breathe
      const t = (idleCycle - 6) / 2;
      idleDeepBreathe = Math.sin(t * Math.PI) * 1.2;
    }
  }

  // === AMBIENT SOUL GLOW (brighter during XP collection) ===
  const xpGlow = (p.xpGlowTimer || 0) > 0;
  const glowPulse = xpGlow ? 30 + Math.sin(time * 4) * 6 : 22 + Math.sin(time * 1.8) * 4;
  const glowR = xpGlow ? 120 : 100;
  const glowG = xpGlow ? 255 : 180;
  const glowB = xpGlow ? 200 : 255;
  const glowAlpha1 = xpGlow ? 0.25 : 0.12;
  const glowAlpha2 = xpGlow ? 0.1 : 0.04;
  const soulGlow = ctx.createRadialGradient(x, y - 2, 0, x, y - 2, glowPulse);
  soulGlow.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, ${glowAlpha1})`);
  soulGlow.addColorStop(0.5, `rgba(${glowR}, ${glowG}, ${glowB}, ${glowAlpha2})`);
  soulGlow.addColorStop(1, `rgba(${glowR}, ${glowG}, ${glowB}, 0)`);
  ctx.fillStyle = soulGlow;
  ctx.fillRect(x - glowPulse, y - 2 - glowPulse, glowPulse * 2, glowPulse * 2);

  // === DASH TRAIL (afterimages) ===
  if (p.isDashing && p.trail.length > 0) {
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const alpha = (i / p.trail.length) * 0.35;
      const tx = Math.floor(t.x);
      const ty = Math.floor(t.y);
      ctx.globalAlpha = alpha;
      // Ghost silhouette
      ctx.fillStyle = '#3366cc';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 1, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ghost eyes
      ctx.fillStyle = `rgba(200, 230, 255, ${alpha})`;
      ctx.fillRect(tx - 3, ty - 5, 2, 2);
      ctx.fillRect(tx + 1, ty - 5, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // === DROP SHADOW ===
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 7, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y + bobY - idleDeepBreathe);

  // === CLOAK / BODY (flowing shape) ===
  const cloakSway = Math.sin(time * 3.5) * 1 + idleLookX * 0.3;
  const cloakSway2 = Math.cos(time * 2.8) * 0.7;

  // Cloak back layer (darker, wider)
  ctx.fillStyle = '#1a1a3a';
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-7 + cloakSway, 6);
  ctx.quadraticCurveTo(-4 + cloakSway2, 9, 0, 8);
  ctx.quadraticCurveTo(4 - cloakSway2, 9, 7 - cloakSway, 6);
  ctx.lineTo(6, -2);
  ctx.closePath();
  ctx.fill();

  // Cloak front layer (main color)
  ctx.fillStyle = '#222250';
  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(-6 + cloakSway * 0.7, 5);
  ctx.quadraticCurveTo(-3 + cloakSway2 * 0.5, 8, 0, 7);
  ctx.quadraticCurveTo(3 - cloakSway2 * 0.5, 8, 6 - cloakSway * 0.7, 5);
  ctx.lineTo(5, -3);
  ctx.closePath();
  ctx.fill();

  // Cloak wispy tails (animated tendrils at bottom)
  ctx.strokeStyle = 'rgba(30, 30, 70, 0.6)';
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    const tendrilX = i * 3;
    const wave = Math.sin(time * 4 + i * 2) * 2;
    ctx.beginPath();
    ctx.moveTo(tendrilX, 6);
    ctx.quadraticCurveTo(tendrilX + wave, 9, tendrilX + wave * 1.5, 11);
    ctx.stroke();
  }

  // === HANDHELD WEAPON (AAA Longsword with Ethereal Integration) ===
  const isMeleeAttacking = p.meleeAttacking;

  if (!isMeleeAttacking) {
    ctx.save();

    // Position comfortably in hand, or on back if truly idle for long
    const isRestingOnBack = p.idleTime > 12; // Increased threshold

    if (isRestingOnBack) {
      // Position on back, slightly angled
      ctx.translate(2, -2);
      ctx.rotate(-Math.PI * 0.75 + Math.sin(time * 2) * 0.05);
      drawLongsword(ctx, 20, 0, time); // Scaled down (24 -> 20)
    } else {
      // --- Ethereal Energy Hand (Side-Snapped Integration) ---
      // Force hand to a specific side (left or right) to prevent "middle" alignment
      const sideX = p.facing.x >= 0 ? 1 : -1;
      const handX = sideX * 10;
      const handY = -1 + (isMoving ? Math.sin(time * 12) * 1.5 : 0);

      // Hand aura pulse
      const pulse = 0.9 + Math.sin(time * 6) * 0.1;
      // Connect back to character center (0,0 because we are already translated to character core)
      drawEtherealHand(ctx, handX, handY, pulse, time, 0, 0);

      // Position sword in the ethereal hand
      ctx.translate(handX, handY);

      // Angle based on movement
      const restAngle = p.facing.x >= 0 ? Math.PI * 0.25 : Math.PI * 0.75;
      const moveAngle = p.facing.x >= 0 ? Math.PI * 0.45 : Math.PI * 0.55;
      ctx.rotate(isMoving ? moveAngle : restAngle);

      drawLongsword(ctx, 20, 0, time); // Scaled down further (24 -> 20)
    }

    ctx.restore();
  }

  // === HEAD (hood shape — Hollow Knight-like) ===
  const headShiftX = idleLookX;
  const headShiftY = -idleHoodShift;
  // Hood outer
  ctx.fillStyle = '#2a2a55';
  ctx.beginPath();
  ctx.moveTo(-6 + headShiftX, -3 + headShiftY);
  ctx.quadraticCurveTo(-7 + headShiftX, -9 + headShiftY, -3 + headShiftX, -12 + headShiftY);
  ctx.quadraticCurveTo(0 + headShiftX, -14 + breathe * 0.3 + headShiftY, 3 + headShiftX, -12 + headShiftY);
  ctx.quadraticCurveTo(7 + headShiftX, -9 + headShiftY, 6 + headShiftX, -3 + headShiftY);
  ctx.closePath();
  ctx.fill();

  // Hood inner shadow
  ctx.fillStyle = '#151530';
  ctx.beginPath();
  ctx.moveTo(-4 + headShiftX, -3 + headShiftY);
  ctx.quadraticCurveTo(-5 + headShiftX, -8 + headShiftY, -2 + headShiftX, -10 + headShiftY);
  ctx.quadraticCurveTo(0 + headShiftX, -11 + headShiftY, 2 + headShiftX, -10 + headShiftY);
  ctx.quadraticCurveTo(5 + headShiftX, -8 + headShiftY, 4 + headShiftX, -3 + headShiftY);
  ctx.closePath();
  ctx.fill();

  // === EYES (the signature — large, glowing, expressive) ===
  const eyeY = -6 + headShiftY;
  const eyeBaseX = headShiftX;
  const eyeSpread = 2.5;
  const blinkCycle = time % 4;
  // During idle, occasional double-blink
  const idleBlinkExtra = isIdle && (idleCycle > 2.8 && idleCycle < 2.85);
  const isBlinking = (blinkCycle > 3.85 && blinkCycle < 3.95) || idleBlinkExtra;
  // Idle squint when looking around
  const idleSquint = isIdle && (idleCycle < 3) ? 0.3 : 0;
  const eyeHeight = isBlinking ? 0.5 : 2.5 - idleSquint;

  // Eye glow backdrop (brighter during XP burst)
  const eyeGlowIntensity = xpGlow ? 0.6 + Math.sin(time * 6) * 0.2 : 0.3 + Math.sin(time * 3) * 0.1;
  const eyeGlow = ctx.createRadialGradient(eyeBaseX, eyeY, 0, eyeBaseX, eyeY, 8);
  eyeGlow.addColorStop(0, `rgba(120, 200, 255, ${eyeGlowIntensity})`);
  eyeGlow.addColorStop(1, 'rgba(120, 200, 255, 0)');
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(-8 + eyeBaseX, eyeY - 8, 16, 16);

  // Left eye
  ctx.fillStyle = '#ccefff';
  ctx.beginPath();
  ctx.ellipse(-eyeSpread + eyeBaseX, eyeY, 1.8, eyeHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(eyeSpread + eyeBaseX, eyeY, 1.8, eyeHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye pupils (follow facing direction, or idle look)
  if (!isBlinking) {
    const pupilOffX = isIdle ? idleLookX * 0.5 : p.facing.x * 0.6;
    const pupilOffY = isIdle ? idleLookY * 0.5 : p.facing.y * 0.4;
    ctx.fillStyle = '#4488cc';
    ctx.fillRect(-eyeSpread + eyeBaseX + pupilOffX - 0.5, eyeY + pupilOffY - 0.5, 1.2, 1.2);
    ctx.fillRect(eyeSpread + eyeBaseX + pupilOffX - 0.5, eyeY + pupilOffY - 0.5, 1.2, 1.2);
  }

  // Eye shine highlights
  if (!isBlinking) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-eyeSpread + eyeBaseX - 0.8, eyeY - 1.2, 0.8, 0.8);
    ctx.fillRect(eyeSpread + eyeBaseX - 0.8, eyeY - 1.2, 0.8, 0.8);
  }

  // === HORN/CROWN DETAIL (small distinctive silhouette feature) ===
  ctx.fillStyle = '#3a3a6a';
  // Left horn nub
  ctx.beginPath();
  ctx.moveTo(-3 + headShiftX, -12 + headShiftY);
  ctx.lineTo(-4.5 + headShiftX, -15 + headShiftY);
  ctx.lineTo(-2 + headShiftX, -13 + headShiftY);
  ctx.closePath();
  ctx.fill();
  // Right horn nub
  ctx.beginPath();
  ctx.moveTo(3 + headShiftX, -12 + headShiftY);
  ctx.lineTo(4.5 + headShiftX, -15 + headShiftY);
  ctx.lineTo(2 + headShiftX, -13 + headShiftY);
  ctx.closePath();
  ctx.fill();

  // === DASHING SPEED LINES ===
  if (p.isDashing) {
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const ly = -8 + i * 4;
      const lx = p.facing.x >= 0 ? -12 : 6;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - p.facing.x * 8, ly);
      ctx.stroke();
    }
  }

  ctx.restore();

  // === MELEE SWING (Professional Swordplay) ===
  if (p.meleeAttacking) {
    const range = C.MELEE_RANGE * p.areaMultiplier;

    // 3-Stage Animation Logic
    // Total duration is C.MELEE_COOLDOWN (0.25s)
    // T goes from 1.0 (start) to 0.0 (end)
    const t = 1 - (p.meleeTimer / C.MELEE_COOLDOWN);

    let swingProgress = 0;
    let bladeScale = 1.0;
    let handOffset = 0;

    // Phase 1: Anticipation (0% - 20%)
    if (t < 0.2) {
      const pt = t / 0.2;
      swingProgress = -pt * 0.15; // Slight pullback
      handOffset = pt * 2;
    }
    // Phase 2: Strike (20% - 60%)
    else if (t < 0.6) {
      const pt = (t - 0.2) / 0.4;
      // Explosive Cubic-Out for the strike
      swingProgress = -0.15 + (1.3 * (1 - Math.pow(1 - pt, 3)));
      bladeScale = 1.1 + Math.sin(pt * Math.PI) * 0.1; // Slight stretch for speed
    }
    // Phase 3: Recovery (60% - 100%)
    else {
      const pt = (t - 0.6) / 0.4;
      swingProgress = 1.15 + pt * 0.1; // Slow follow-through
      bladeScale = 1.0;
    }

    const startAngle = p.meleeAngle - C.MELEE_ARC / 2;
    const currentAngle = startAngle + C.MELEE_ARC * swingProgress;

    // --- AAA Motion Blur Trail ---
    if (t > 0.15 && t < 0.9) {
      const trailAlpha = Math.sin((t - 0.15) / 0.75 * Math.PI) * 0.5;

      // Multi-layered trail for volume
      for (let i = 0; i < 3; i++) {
        const layerRange = range + (i * 2);
        const grad = ctx.createRadialGradient(x, y, range * 0.4, x, y, layerRange);
        const alpha = trailAlpha / (i + 1);
        grad.addColorStop(0, 'rgba(135, 206, 250, 0)'); // Blue transparent
        grad.addColorStop(0.7, `rgba(100, 180, 255, ${alpha * 0.5})`); // Sky blue layer
        grad.addColorStop(0.9, `rgba(135, 206, 250, ${alpha})`); // Light blue core
        grad.addColorStop(1, 'rgba(135, 206, 250, 0)'); // Fade out to blue transparent

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, layerRange, startAngle, currentAngle);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- The Sword Rendering ---
    ctx.save();

    // Increased base offset during attack to stay outside the body
    const baseAttackRadius = 13;
    const sideX = Math.cos(p.meleeAngle) >= 0 ? 1 : -1;

    // Position of the Hand during attack - Side Snapped
    const handX = x + sideX * (baseAttackRadius + handOffset);
    const handY = y + Math.sin(currentAngle) * handOffset;

    // Draw Ethereal Hand during strike (connecting back to player center x,y)
    const pulse = 1.1 + Math.sin(time * 10) * 0.2;
    drawEtherealHand(ctx, handX, handY, pulse, time, x, y);

    ctx.translate(handX, handY);
    ctx.rotate(currentAngle);
    ctx.scale(bladeScale * 0.8, 1 / (bladeScale * 0.8)); // Scaled down 20% total (0.8 multiplier)

    drawLongsword(ctx, range, 1, time);

    ctx.restore();
  }
}

/** Draws a mystical ethereal hand */
function drawEtherealHand(ctx: CanvasRenderingContext2D, handX: number, handY: number, scale: number, time: number, coreX: number, coreY: number) {
  ctx.save();
  ctx.translate(handX, handY);

  // Energy connection thread back to the character core
  ctx.strokeStyle = 'rgba(150, 230, 255, 0.2)';
  ctx.setLineDash([2, 2]); // Dotted energy feel
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  // Relative coordinates back to core
  ctx.moveTo(coreX - handX, coreY - handY);
  ctx.lineTo(0, 0); // Hand center
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // Outer soft glow
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * scale);
  g.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
  g.addColorStop(0.5, 'rgba(50, 150, 255, 0.2)');
  g.addColorStop(1, 'rgba(0, 100, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2);
  ctx.fill();

  // "Finger" particles (procedural energy wisps)
  ctx.fillStyle = 'rgba(150, 230, 255, 0.6)';
  for (let i = 0; i < 3; i++) {
    const angle = (time * 5) + (i * Math.PI * 2 / 3);
    const rx = Math.cos(angle) * 3 * scale;
    const ry = Math.sin(angle) * 3 * scale;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Draws a professional-grade AAA longsword */
function drawLongsword(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
  // Increase proportions for a larger, more impactful weapon
  const hiltLen = 10;
  const guardW = 14;
  const bladeLen = length - hiltLen;

  // 1. Hilt (Thick leather wrapped with gold wire)
  ctx.fillStyle = '#1a0f08';
  ctx.fillRect(-hiltLen, -1.8, hiltLen, 3.6);

  // Leather wraps detail
  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const ox = -hiltLen + 1 + i * 1.8;
    ctx.beginPath();
    ctx.moveTo(ox, -1.8);
    ctx.lineTo(ox + 0.8, 1.8);
    ctx.stroke();
  }

  // 2. Heavy Weighted Pommel
  const pommelGrad = ctx.createRadialGradient(-hiltLen, 0, 0, -hiltLen, 0, 3);
  pommelGrad.addColorStop(0, '#ffcc33');
  pommelGrad.addColorStop(1, '#aa8833');
  ctx.fillStyle = pommelGrad;
  ctx.beginPath();
  ctx.arc(-hiltLen, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Pommel shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-hiltLen - 1, -1, 1, 0, Math.PI * 2);
  ctx.fill();

  // 3. Ornate Crossguard (Ornate Silver / Chrome)
  const silverGrad = ctx.createLinearGradient(0, -guardW / 2, 0, guardW / 2);
  silverGrad.addColorStop(0, '#555555');
  silverGrad.addColorStop(0.2, '#aaaaaa');
  silverGrad.addColorStop(0.5, '#ffffff'); // Center shine
  silverGrad.addColorStop(0.8, '#aaaaaa');
  silverGrad.addColorStop(1, '#444444');
  ctx.fillStyle = silverGrad;

  // Complex flared guard shape
  ctx.beginPath();
  ctx.moveTo(0, -guardW / 2);
  ctx.bezierCurveTo(-4, -guardW / 4, -4, guardW / 4, 0, guardW / 2);
  ctx.lineTo(3, guardW / 3);
  ctx.lineTo(3, -guardW / 3);
  ctx.closePath();
  ctx.fill();

  // Guard engravings
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 4. Central Magical Gem
  const gemPulse = 0.8 + Math.sin(time * 5) * 0.2;
  const gemGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.5);
  gemGrad.addColorStop(0, '#ffffff');
  gemGrad.addColorStop(0.3, '#33ccff');
  gemGrad.addColorStop(1, '#0044ff');
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 2 * gemPulse, 0, Math.PI * 2);
  ctx.fill();

  // Gem glow
  ctx.shadowBlur = 8 * gemPulse;
  ctx.shadowColor = '#3399ff';

  // 5. Elite Blade (Polished Mirror-Finish Steel)
  const bladeWidth = 2.8;
  const bladeGrad = ctx.createLinearGradient(0, -bladeWidth, 0, bladeWidth);
  bladeGrad.addColorStop(0, '#444444');
  bladeGrad.addColorStop(0.3, '#bbbbbb');
  bladeGrad.addColorStop(0.48, '#e0f0ff'); // Blue-ish edge highlight
  bladeGrad.addColorStop(0.52, '#e0f0ff'); // Blue-ish edge highlight
  bladeGrad.addColorStop(0.7, '#999999');
  bladeGrad.addColorStop(1, '#333333');

  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(3, -bladeWidth);
  ctx.lineTo(bladeLen - 8, -bladeWidth * 0.8);
  ctx.lineTo(bladeLen, 0); // Precision Point
  ctx.lineTo(bladeLen - 8, bladeWidth * 0.8);
  ctx.lineTo(3, bladeWidth);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0; // Reset shadow for rest of blade

  // 6. Deep Fuller (Central Groove)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(6, -0.6, bladeLen - 18, 1.2);

  // 7. Dynamic Blade Shimmer (Glint)
  const shineSpeed = isAttacking ? 20 : 4;
  const shinePos = (Math.sin(time * shineSpeed) * 0.5 + 0.5) * (bladeLen - 10) + 10;

  const g = ctx.createRadialGradient(shinePos, 0, 0, shinePos, 0, 12);
  g.addColorStop(0, 'rgba(135, 206, 250, 0.9)'); // Light Sky Blue
  g.addColorStop(0.2, 'rgba(100, 180, 255, 0.5)');
  g.addColorStop(1, 'rgba(100, 200, 255, 0)');

  // Glint shape
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(shinePos - 15, 0);
  ctx.lineTo(shinePos, -4);
  ctx.lineTo(shinePos + 15, 0);
  ctx.lineTo(shinePos, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 8. Blade Rim Light (Energy glow)
  ctx.strokeStyle = `rgba(150, 220, 255, ${0.1 + Math.sin(time * 2) * 0.05})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export function renderEnemy(ctx: CanvasRenderingContext2D, e: EnemyState, time: number) {
  if (e.spawnTimer > 0) {
    // Spawn animation - growing circle
    const progress = 1 - (e.spawnTimer / 0.4);
    ctx.fillStyle = `rgba(255, 100, 100, ${0.3 * (1 - progress)})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 15 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const x = Math.floor(e.x);
  const y = Math.floor(e.y);
  const s = e.width;
  const half = Math.floor(s / 2);

  // Apply wraith alpha
  if (e.type === 'wraith') {
    ctx.globalAlpha = e.phaseAlpha;
  }

  // Hit jitter / bulge
  if (e.flashTime > 0) {
    // No jitter or scaling as per user request ("nada de distorção ou mexida")
    // Just the flash effect (handlers below) is enough feedback
  }

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(x - half + 1, y + half - 1, s - 2, 2);

  if (e.flashTime > 0) {
    ctx.fillStyle = C.COLORS.white;
  } else {
    const colorMap: Record<string, string> = {
      chaser: C.COLORS.chaser, shooter: C.COLORS.shooter,
      tank: C.COLORS.tank, boss: C.COLORS.boss,
      wraith: C.COLORS.wraith, bomber: C.COLORS.bomber,
      swarm: C.COLORS.swarm, necromancer: C.COLORS.necromancer,
      stalker: C.COLORS.stalker, phantom: '#ff00ff',
      flash_hunter: C.COLORS.flashHunter, distortion: C.COLORS.distortion,
      flicker_fiend: C.COLORS.flickerFiend, warper: C.COLORS.warper,
      accelerator: C.COLORS.accelerator,
    };
    ctx.fillStyle = colorMap[e.type] || C.COLORS.chaser;
  }

  switch (e.type) {
    case 'chaser': {
      const bob = Math.sin(time * 8 + e.x) * 1;
      ctx.fillRect(x - half, y - half + 2 + bob, s, s - 2);
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.chaserDark;
      ctx.fillRect(x - half + 1, y - half + bob, s - 2, 3);
      // Claws
      ctx.fillRect(x - half - 2, y + half - 3 + bob, 2, 3);
      ctx.fillRect(x + half, y + half - 3 + bob, 2, 3);
      // Eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x - 3, y - half + 3 + bob, 2, 2);
      ctx.fillRect(x + 2, y - half + 3 + bob, 2, 2);
      break;
    }

    case 'shooter': {
      const float = Math.sin(time * 4 + e.y) * 2;
      ctx.beginPath();
      ctx.arc(x, y - 2 + float, half, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.shooterDark;
      ctx.fillRect(x - half, y + float, s, 4);
      for (let i = 0; i < s; i += 3) {
        ctx.fillRect(x - half + i, y + 3 + float, 2, (i % 2 === 0 ? 3 : 1));
      }
      // Eyes
      ctx.fillStyle = '#ff88ff';
      ctx.fillRect(x - 2, y - 4 + float, 2, 2);
      ctx.fillRect(x + 1, y - 4 + float, 2, 2);
      // Aura
      ctx.fillStyle = 'rgba(170, 68, 221, 0.15)';
      ctx.beginPath();
      ctx.arc(x, y + float, half + 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'tank': {
      ctx.fillRect(x - half, y - half, s, s);
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.tankDark;
      ctx.fillRect(x - half, y - half, s, 3);
      // Horns
      ctx.fillRect(x - half - 2, y - half - 3, 3, 4);
      ctx.fillRect(x + half - 1, y - half - 3, 3, 4);
      // Armor detail
      ctx.fillStyle = 'rgba(100, 120, 140, 0.3)';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      // Eyes
      ctx.fillStyle = e.aiState === 'charge' ? '#ff0000' : '#ff6600';
      ctx.fillRect(x - 4, y - 3, 3, 2);
      ctx.fillRect(x + 2, y - 3, 3, 2);
      // Charge indicator
      if (e.aiState === 'charge') {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
        ctx.fillRect(x - half - 3, y - half - 3, s + 6, s + 6);
      }
      break;
    }

    case 'wraith': {
      // Ghostly body
      const wFloat = Math.sin(time * 5 + e.x) * 2;
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.wraith;
      ctx.beginPath();
      ctx.arc(x, y - 1 + wFloat, half, 0, Math.PI * 2);
      ctx.fill();
      // Wispy tail
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.wraithDark;
      for (let i = 0; i < 3; i++) {
        const tx = x - 3 + i * 3 + Math.sin(time * 6 + i) * 2;
        const ty = y + half + i * 2 + wFloat;
        ctx.fillRect(tx, ty, 2, 3);
      }
      // Glowing eyes
      ctx.fillStyle = '#00ffcc';
      ctx.fillRect(x - 3, y - 3 + wFloat, 2, 2);
      ctx.fillRect(x + 2, y - 3 + wFloat, 2, 2);
      // Ghost aura
      ctx.fillStyle = C.COLORS.wraithGlow;
      ctx.beginPath();
      ctx.arc(x, y + wFloat, half + 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bomber': {
      const pulse = e.aiState === 'fuse' ? (Math.sin(time * 15) * 0.5 + 0.5) : 0;
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.bomber;
      // Round body
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
      // Fuse
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.bomberDark;
      ctx.fillRect(x - 1, y - half - 3, 2, 4);
      // Spark on fuse
      if (e.aiState === 'fuse') {
        ctx.fillStyle = `rgba(255, 255, 100, ${0.5 + pulse * 0.5})`;
        ctx.fillRect(x - 2, y - half - 4, 4, 3);
        // Warning glow
        ctx.fillStyle = `rgba(255, 136, 0, ${0.2 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, half + 8 + pulse * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x - 3, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
      break;
    }

    case 'swarm': {
      const buzz = Math.sin(time * 12 + e.x * 3 + e.y * 7);
      ctx.fillRect(x - half + buzz, y - half, s, s);
      // Wings
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.swarmDark;
      ctx.fillRect(x - half - 2 + buzz, y - 2, 2, 3);
      ctx.fillRect(x + half + buzz, y - 2, 2, 3);
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1 + buzz, y - 2, 1, 1);
      ctx.fillRect(x + 1 + buzz, y - 2, 1, 1);
      break;
    }

    case 'necromancer': {
      // Hooded dark figure with staff
      const nFloat = Math.sin(time * 3 + e.x) * 2;
      ctx.globalAlpha = 0.9;
      // Dark robe
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.necroDark;
      ctx.fillRect(x - half, y - half + nFloat, s, s + 3);
      // Hood
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#220044';
      ctx.beginPath();
      ctx.arc(x, y - half + 2 + nFloat, half, Math.PI, Math.PI * 2);
      ctx.fill();
      // Glowing eyes inside hood
      const eyePulse = Math.sin(time * 6) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(180, 50, 255, ${eyePulse})`;
      ctx.fillRect(x - 3, y - half + 4 + nFloat, 2, 2);
      ctx.fillRect(x + 2, y - half + 4 + nFloat, 2, 2);
      // Staff
      ctx.fillStyle = '#443322';
      ctx.fillRect(x + half + 1, y - half - 4 + nFloat, 2, s + 8);
      // Staff crystal
      ctx.fillStyle = `rgba(200, 100, 255, ${eyePulse})`;
      ctx.fillRect(x + half, y - half - 6 + nFloat, 4, 4);
      // Purple aura
      const aura = ctx.createRadialGradient(x, y + nFloat, 0, x, y + nFloat, half + 12);
      aura.addColorStop(0, `rgba(153, 51, 204, ${0.1 * eyePulse})`);
      aura.addColorStop(1, 'rgba(153, 51, 204, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(x - half - 12, y - half - 12 + nFloat, s + 24, s + 24);
      // Floating skulls orbiting
      for (let i = 0; i < 2; i++) {
        const orbitAngle = time * 2 + i * Math.PI;
        const ox = x + Math.cos(orbitAngle) * (half + 8);
        const oy = y + Math.sin(orbitAngle) * (half + 6) + nFloat;
        ctx.fillStyle = `rgba(200, 180, 160, ${0.4 * eyePulse})`;
        ctx.fillRect(ox - 2, oy - 2, 4, 4);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * eyePulse})`;
        ctx.fillRect(ox - 1, oy - 1, 1, 1);
        ctx.fillRect(ox + 1, oy - 1, 1, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'stalker': {
      // Nearly invisible predator
      ctx.globalAlpha = e.stealthAlpha;
      // Hunched dark body
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#111111';
      ctx.fillRect(x - half, y - half + 2, s, s - 2);
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#0a0a0a';
      ctx.fillRect(x - half - 1, y + 2, s + 2, 3);
      // Long arms/claws
      const clawExtend = e.lunging ? 4 : 2;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x - half - clawExtend, y, clawExtend, 2);
      ctx.fillRect(x + half, y, clawExtend, 2);
      // Glowing red eyes (only visible when close or lunging)
      if (e.stealthAlpha > 0.15 || e.lunging) {
        const redPulse = e.lunging ? 1 : Math.sin(time * 10) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${redPulse})`;
        ctx.fillRect(x - 3, y - half + 3, 2, 1);
        ctx.fillRect(x + 2, y - half + 3, 2, 1);
        // Red eye glow
        if (e.lunging) {
          const eyeGlow = ctx.createRadialGradient(x, y - half + 3, 0, x, y - half + 3, 10);
          eyeGlow.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
          eyeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = eyeGlow;
          ctx.fillRect(x - 10, y - half - 7, 20, 20);
        }
      }
      // Lunge trail
      if (e.lunging) {
        ctx.fillStyle = 'rgba(20, 0, 0, 0.3)';
        ctx.fillRect(x - e.vx * 15 - half, y - e.vy * 15 - half, s, s);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'phantom': {
      // Ghostly screaming phantom
      ctx.globalAlpha = e.stealthAlpha;
      const pFloat = Math.sin(time * 20 + e.x) * 3;
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#cc00ff';
      ctx.beginPath();
      ctx.arc(x, y + pFloat, half, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 3, y - 2 + pFloat, 2, 3);
      ctx.fillRect(x + 2, y - 2 + pFloat, 2, 3);
      ctx.fillRect(x - 2, y + 2 + pFloat, 4, 2);
      for (let i = 0; i < 3; i++) {
        const wispX = x - e.vx * (i * 8) + (Math.random() - 0.5) * 6;
        const wispY = y - e.vy * (i * 8) + (Math.random() - 0.5) * 6;
        ctx.fillStyle = `rgba(200, 0, 255, ${0.2 - i * 0.06})`;
        ctx.beginPath();
        ctx.arc(wispX, wispY, half - i, 0, Math.PI * 2);
        ctx.fill();
      }
      const screamPulse = Math.sin(time * 25) * 0.3 + 0.3;
      const aura = ctx.createRadialGradient(x, y + pFloat, 0, x, y + pFloat, half + 15);
      aura.addColorStop(0, `rgba(255, 0, 200, ${screamPulse})`);
      aura.addColorStop(1, 'rgba(255, 0, 200, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(x - half - 15, y - half - 15 + pFloat, s + 30, s + 30);
      ctx.globalAlpha = 1;
      break;
    }

    case 'flash_hunter': {
      // Blinding white figure that appears in flashes
      ctx.globalAlpha = e.stealthAlpha;
      if (e.stealthAlpha > 0.5) {
        // Bright flash effect on appear
        const flashGlow = ctx.createRadialGradient(x, y, 0, x, y, half + 20);
        flashGlow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        flashGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        flashGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = flashGlow;
        ctx.fillRect(x - half - 20, y - half - 20, s + 40, s + 40);
        // Sharp angular body
        ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#eeeeff';
        ctx.beginPath();
        ctx.moveTo(x, y - half - 2);
        ctx.lineTo(x + half + 1, y + half);
        ctx.lineTo(x - half - 1, y + half);
        ctx.closePath();
        ctx.fill();
        // Piercing eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 3, y - 1, 2, 2);
        ctx.fillRect(x + 2, y - 1, 2, 2);
        // Speed lines behind
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const lx = x - e.vx * (8 + i * 6);
          const ly = y - e.vy * (8 + i * 6) + (i - 1.5) * 3;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - e.vx * 12, ly - e.vy * 12);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'distortion': {
      // Glitchy, distorted dark mass
      ctx.globalAlpha = e.stealthAlpha;
      const glitchOffset = Math.sin(time * 30) * 3;
      const glitchOffset2 = Math.cos(time * 25) * 2;
      // Distortion aura - pulsing dark ring
      const distPulse = Math.sin(time * 4) * 0.3 + 0.5;
      const dAura = ctx.createRadialGradient(x, y, half, x, y, half + 18);
      dAura.addColorStop(0, `rgba(100, 0, 150, ${distPulse * 0.4})`);
      dAura.addColorStop(1, 'rgba(100, 0, 150, 0)');
      ctx.fillStyle = dAura;
      ctx.fillRect(x - half - 18, y - half - 18, s + 36, s + 36);
      // Glitched body - offset layers for CRT-like effect
      ctx.fillStyle = `rgba(80, 0, 120, 0.4)`;
      ctx.fillRect(x - half + glitchOffset, y - half, s, s);
      ctx.fillStyle = `rgba(120, 0, 60, 0.4)`;
      ctx.fillRect(x - half - glitchOffset2, y - half + 1, s, s);
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#440066';
      ctx.fillRect(x - half, y - half, s, s);
      // Scan lines
      for (let i = 0; i < s; i += 3) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + Math.sin(time * 20 + i) * 0.1})`;
        ctx.fillRect(x - half, y - half + i, s, 1);
      }
      // Glowing void eyes
      ctx.fillStyle = `rgba(200, 0, 255, ${0.8 + Math.sin(time * 6) * 0.2})`;
      ctx.fillRect(x - 4, y - 3, 3, 3);
      ctx.fillRect(x + 2, y - 3, 3, 3);
      ctx.globalAlpha = 1;
      break;
    }

    case 'flicker_fiend': {
      // Only render when visible (stealthAlpha > 0.5)
      if (e.stealthAlpha < 0.5) break;
      // Red, crackling entity
      const flickPulse = Math.sin(time * 20) * 0.3 + 0.7;
      // Electric aura
      ctx.fillStyle = `rgba(255, 50, 0, ${flickPulse * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, half + 6, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.flickerFiend;
      ctx.fillRect(x - half, y - half, s, s);
      // Static/glitch overlay
      for (let i = 0; i < 4; i++) {
        const gx = x - half + Math.random() * s;
        const gy = y - half + Math.random() * s;
        ctx.fillStyle = `rgba(255, 200, 0, ${0.3 + Math.random() * 0.3})`;
        ctx.fillRect(gx, gy, 2, 1);
      }
      // Eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x - 3, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
      break;
    }

    case 'warper': {
      // Blue ethereal entity that fades between teleports
      ctx.globalAlpha = e.stealthAlpha;
      // Teleport rings
      const ringAlpha = (1 - e.stealthAlpha) * 0.5;
      if (ringAlpha > 0.05) {
        ctx.strokeStyle = `rgba(0, 80, 200, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, half + 10 + (1 - e.stealthAlpha) * 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Body
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.warper;
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
      // Inner glow
      const wGlow = ctx.createRadialGradient(x, y, 0, x, y, half);
      wGlow.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
      wGlow.addColorStop(1, 'rgba(0, 40, 100, 0)');
      ctx.fillStyle = wGlow;
      ctx.fillRect(x - half, y - half, s, s);
      // Eyes
      ctx.fillStyle = '#88ccff';
      ctx.fillRect(x - 3, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
      ctx.globalAlpha = 1;
      break;
    }

    case 'accelerator': {
      // Ember-like entity that glows brighter when accelerating
      ctx.globalAlpha = Math.max(0.3, e.stealthAlpha);
      const accelGlow = e.stealthAlpha; // 1 = in light/fast, 0.3 = slow/dark
      // Flame trail when fast
      if (accelGlow > 0.8) {
        for (let i = 0; i < 3; i++) {
          const tx = x + (Math.random() - 0.5) * 8;
          const ty = y + half + i * 3;
          ctx.fillStyle = `rgba(255, ${120 + Math.floor(Math.random() * 80)}, 0, ${0.3 - i * 0.08})`;
          ctx.fillRect(tx - 2, ty, 4, 3);
        }
        // Bright glow
        const ag = ctx.createRadialGradient(x, y, 0, x, y, half + 12);
        ag.addColorStop(0, 'rgba(255, 170, 0, 0.3)');
        ag.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = ag;
        ctx.fillRect(x - half - 12, y - half - 12, s + 24, s + 24);
      }
      // Body
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.accelerator;
      ctx.beginPath();
      ctx.moveTo(x, y - half - 2);
      ctx.lineTo(x + half + 2, y + 2);
      ctx.lineTo(x, y + half + 2);
      ctx.lineTo(x - half - 2, y + 2);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = accelGlow > 0.8 ? '#ffffff' : '#ff6600';
      ctx.fillRect(x - 3, y - 1, 2, 2);
      ctx.fillRect(x + 2, y - 1, 2, 2);
      ctx.globalAlpha = 1;
      break;
    }

    case 'boss': {
      const breathe = Math.sin(time * 2) * 1;
      // Import floor from bosses module
      const bossFloor = (window as any).__bossFloor || 1;

      switch (bossFloor) {
        case 2: {
          // O CAÇADOR — sleek orange predator with speed lines
          const dashTrail = Math.sin(time * 12) * 2;
          // Speed lines behind
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = `rgba(255, ${100 + i * 30}, 0, ${0.2 - i * 0.04})`;
            ctx.fillRect(x - half - 8 - i * 6 + dashTrail, y - 2 + i, 6, 2);
          }
          // Body — angular and sharp
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#cc5500';
          ctx.beginPath();
          ctx.moveTo(x, y - half - 3 + breathe);
          ctx.lineTo(x + half + 3, y + breathe);
          ctx.lineTo(x + half - 2, y + half + breathe);
          ctx.lineTo(x - half + 2, y + half + breathe);
          ctx.lineTo(x - half - 3, y + breathe);
          ctx.closePath();
          ctx.fill();
          // Eyes — orange glowing
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(x - 5, y - 3 + breathe, 3, 3);
          ctx.fillRect(x + 3, y - 3 + breathe, 3, 3);
          // Glow
          ctx.fillStyle = 'rgba(255, 120, 0, 0.1)';
          ctx.beginPath();
          ctx.arc(x, y + breathe, half + 12, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 3: {
          // O INVOCADOR — dark hooded with purple energy
          const nFloat = Math.sin(time * 3) * 2;
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#330055';
          ctx.fillRect(x - half, y - half + nFloat, s, s + 4);
          // Hood
          ctx.beginPath();
          ctx.arc(x, y - half + 3 + nFloat, half, Math.PI, Math.PI * 2);
          ctx.fill();
          // Staff
          ctx.fillStyle = '#443322';
          ctx.fillRect(x + half + 2, y - half - 6 + nFloat, 2, s + 12);
          // Staff crystal
          const pulse = Math.sin(time * 5) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(200, 100, 255, ${pulse})`;
          ctx.fillRect(x + half + 1, y - half - 8 + nFloat, 4, 4);
          // Eyes
          ctx.fillStyle = `rgba(200, 100, 255, ${pulse})`;
          ctx.fillRect(x - 4, y - half + 5 + nFloat, 2, 2);
          ctx.fillRect(x + 3, y - half + 5 + nFloat, 2, 2);
          // Purple aura with orbiting skulls
          for (let i = 0; i < 3; i++) {
            const oa = time * 2.5 + i * (Math.PI * 2 / 3);
            const ox = x + Math.cos(oa) * (half + 10);
            const oy = y + Math.sin(oa) * (half + 8) + nFloat;
            ctx.fillStyle = `rgba(200, 100, 255, ${0.4 * pulse})`;
            ctx.beginPath();
            ctx.arc(ox, oy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 4: {
          // O FANTASMA — ghostly transparent, phasing
          const gFloat = Math.sin(time * 6) * 3;
          ctx.globalAlpha = e.phaseAlpha || 0.6;
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#00aa88';
          ctx.beginPath();
          ctx.arc(x, y + gFloat, half, 0, Math.PI * 2);
          ctx.fill();
          // Wispy tendrils below
          for (let i = 0; i < 4; i++) {
            const wx = x - 6 + i * 4 + Math.sin(time * 5 + i * 2) * 3;
            const wy = y + half + i * 3 + gFloat;
            ctx.fillStyle = `rgba(0, 200, 180, ${0.3 - i * 0.06})`;
            ctx.fillRect(wx, wy, 3, 4);
          }
          // Eyes — piercing cyan
          ctx.fillStyle = '#44ffdd';
          ctx.fillRect(x - 4, y - 3 + gFloat, 3, 2);
          ctx.fillRect(x + 2, y - 3 + gFloat, 3, 2);
          // Phase rings
          ctx.strokeStyle = `rgba(0, 255, 220, ${0.2 * (e.phaseAlpha || 0.6)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y + gFloat, half + 8 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 5: {
          // O DESTRUIDOR — massive hulking form
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#884400';
          // Huge body
          ctx.fillRect(x - half - 3, y - half + breathe, s + 6, s);
          // Shoulders
          ctx.fillRect(x - half - 6, y - half + 3 + breathe, 4, s - 6);
          ctx.fillRect(x + half + 2, y - half + 3 + breathe, 4, s - 6);
          // Head
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#663300';
          ctx.fillRect(x - 5, y - half - 4 + breathe, 10, 6);
          // Eyes — fiery
          ctx.fillStyle = e.aiState === 'charge' ? '#ff0000' : '#ff8800';
          ctx.fillRect(x - 4, y - half - 2 + breathe, 3, 2);
          ctx.fillRect(x + 2, y - half - 2 + breathe, 3, 2);
          // Impact aura
          if (e.aiState === 'charge') {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(x, y + breathe, half + 15, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 6: {
          // O PESADELO — shifting amorphous horror
          // Multiple overlapping forms
          for (let i = 0; i < 3; i++) {
            const ox = Math.sin(time * 3 + i * 2) * 3;
            const oy = Math.cos(time * 2.5 + i * 1.5) * 2;
            ctx.fillStyle = `rgba(${100 - i * 20}, 0, ${20 + i * 10}, ${0.5 - i * 0.1})`;
            ctx.beginPath();
            ctx.arc(x + ox, y + oy + breathe, half - i, 0, Math.PI * 2);
            ctx.fill();
          }
          // Main body
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#660022';
          ctx.beginPath();
          ctx.arc(x, y + breathe, half, 0, Math.PI * 2);
          ctx.fill();
          // Multiple glowing eyes
          for (let i = 0; i < 4; i++) {
            const ea = time * 1.5 + i * Math.PI / 2;
            const er = half * 0.4;
            const ex = x + Math.cos(ea) * er;
            const ey = y + Math.sin(ea) * er * 0.6 + breathe;
            ctx.fillStyle = `rgba(255, 0, 30, ${0.6 + Math.sin(time * 8 + i) * 0.3})`;
            ctx.fillRect(ex - 1, ey - 1, 3, 2);
          }
          // Horror tendrils
          for (let i = 0; i < 6; i++) {
            const ta = (i / 6) * Math.PI * 2 + time * 0.8;
            const tLen = half + 5 + Math.sin(time * 2 + i) * 5;
            ctx.strokeStyle = `rgba(120, 0, 30, 0.4)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + breathe);
            ctx.lineTo(x + Math.cos(ta) * tLen, y + Math.sin(ta) * tLen + breathe);
            ctx.stroke();
          }
          // Dark aura
          ctx.fillStyle = 'rgba(100, 0, 20, 0.12)';
          ctx.beginPath();
          ctx.arc(x, y + breathe, half + 18, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default: {
          // Floor 1: SOMBRA FAMINTA — original design
          ctx.fillRect(x - half, y - half + 3 + breathe, s, s - 3);
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.bossDark;
          ctx.fillRect(x - half + 2, y - half + breathe, s - 4, 5);
          // Horns
          ctx.fillStyle = C.COLORS.bossAccent;
          ctx.fillRect(x - half - 3, y - half - 5 + breathe, 4, 7);
          ctx.fillRect(x + half, y - half - 5 + breathe, 4, 7);
          break;
        }
      }
      break;
    }
  }

  // Reset alpha for wraith
  if (e.type === 'wraith') ctx.globalAlpha = 1;

  // HP bar
  if (e.hp < e.maxHp) {
    const barW_hp = Math.max(s + 4, 12);
    const barH_hp = 2;
    const bx = x - barW_hp / 2;
    const by = y - half - 7;
    ctx.fillStyle = C.COLORS.hpBg;
    ctx.fillRect(bx, by, barW_hp, barH_hp);
    ctx.fillStyle = e.hp / e.maxHp > 0.3 ? C.COLORS.hpFill : '#ff6600';
    ctx.fillRect(bx, by, barW_hp * (e.hp / e.maxHp), barH_hp);
  }
}

export function renderAlchemist(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // --- BASE SHADOW ---
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Floating bob effect
  const bob = Math.sin(time * 1.5) * 2;
  const ay = y + bob;

  // --- ROBE & BODY (Teal/Deep Emerald) ---
  // Outer Robe/Cloak
  ctx.fillStyle = '#1a3c34';
  ctx.beginPath();
  ctx.moveTo(x - 8, ay - 6);
  ctx.lineTo(x + 8, ay - 6);
  ctx.lineTo(x + 12, ay + 10);
  ctx.lineTo(x - 12, ay + 10);
  ctx.fill();

  // Alchemy Apron (Leather/Brown)
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 5, ay - 2, 10, 12);

  // --- BELT & UTILITIES ---
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(x - 9, ay + 3, 18, 2); // Belt

  // Small hanging vials on the belt
  const vialColors = ['#ff5555', '#55ff88', '#5588ff'];
  for (let i = 0; i < 3; i++) {
    const vx = x - 6 + i * 6;
    const vy = ay + 5 + Math.sin(time * 3 + i) * 0.5;
    ctx.fillStyle = '#111111'; // Cork
    ctx.fillRect(vx - 1, vy, 2, 1);
    ctx.fillStyle = vialColors[i];
    ctx.globalAlpha = 0.7 + Math.sin(time * 4 + i) * 0.3;
    ctx.fillRect(vx - 2, vy + 1, 4, 4);
    ctx.globalAlpha = 1;
  }

  // Large side bag
  ctx.fillStyle = '#5c4033';
  ctx.beginPath();
  ctx.roundRect(x + 6, ay + 4, 6, 5, 2);
  ctx.fill();

  // --- ARMS & POTION ANIMATION ---
  // She's hunched, holding a flask with both hands
  const handX = x + Math.cos(time * 2) * 2;
  const handY = ay + 2 + Math.sin(time * 2) * 1;

  // Flask (Glass Texture)
  const flaskSize = 5;
  const grad = ctx.createRadialGradient(handX, handY, 0, handX, handY, flaskSize + 5);
  grad.addColorStop(0, 'rgba(100, 255, 100, 0.4)');
  grad.addColorStop(1, 'rgba(100, 255, 100, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(handX, handY, flaskSize + 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#aaffaa'; // Liquid
  ctx.beginPath();
  ctx.arc(handX, handY, flaskSize, 0, Math.PI * 2);
  ctx.fill();

  // Flask highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(handX, handY, flaskSize, -1, 1);
  ctx.stroke();

  // Rising noxious steam
  if (Math.random() < 0.2) {
    const steamX = handX + (Math.random() - 0.5) * 8;
    const steamY = handY - 5 - Math.random() * 10;
    ctx.fillStyle = `rgba(150, 255, 150, ${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(steamX, steamY, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- HEAD & DISTINCT HAT (The Silhueta) ---
  // Neck/Hunch
  ctx.fillStyle = '#2d4d44';
  ctx.beginPath();
  ctx.arc(x, ay - 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Wide Alchemist Hat (Asymmetric pointed look)
  ctx.fillStyle = '#0a1a15';
  // Brim
  ctx.beginPath();
  ctx.ellipse(x, ay - 11, 14, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Pointy top (relaxed/droopy)
  ctx.beginPath();
  ctx.moveTo(x - 8, ay - 12);
  ctx.lineTo(x + 8, ay - 12);
  ctx.quadraticCurveTo(x + 2, ay - 18, x - 12, ay - 24); // Drooping point to the left
  ctx.lineTo(x - 2, ay - 15);
  ctx.fill();

  // Eyes (Glowing Amber/Cyan)
  const eyePulse = Math.sin(time * 4) * 0.2 + 0.8;
  ctx.fillStyle = `rgba(255, 170, 0, ${eyePulse})`;
  ctx.fillRect(x - 4, ay - 10, 2, 1);
  ctx.fillRect(x + 2, ay - 10, 2, 1);

  // --- AMBIENT EFFECT ---
  // Subtle glowing particles around her
  for (let i = 0; i < 3; i++) {
    const ang = time * 0.5 + i * (Math.PI * 2 / 3);
    const px = x + Math.cos(ang) * 18;
    const py = ay + Math.sin(ang * 2) * 10;
    ctx.fillStyle = `rgba(150, 255, 220, ${0.15 * eyePulse})`;
    ctx.beginPath();
    ctx.arc(px, py, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderProjectile(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
  // Trail
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const alpha = (i / p.trail.length) * 0.4;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.isPlayerOwned ? C.COLORS.projPlayer : C.COLORS.projEnemy;
    const s = p.size * (i / p.trail.length);
    ctx.fillRect(Math.floor(t.x - s / 2), Math.floor(t.y - s / 2), Math.ceil(s), Math.ceil(s));
  }
  ctx.globalAlpha = 1;

  // Main projectile
  ctx.fillStyle = p.isPlayerOwned ? C.COLORS.projPlayer : C.COLORS.projEnemy;
  ctx.fillRect(
    Math.floor(p.x - p.size / 2),
    Math.floor(p.y - p.size / 2),
    p.size, p.size
  );
  // Glow
  ctx.fillStyle = p.isPlayerOwned ? 'rgba(102, 204, 255, 0.25)' : 'rgba(255, 85, 85, 0.25)';
  const glowSize = p.size + 2 + Math.sin(time * 10) * 1;
  ctx.fillRect(
    Math.floor(p.x - glowSize / 2),
    Math.floor(p.y - glowSize / 2),
    Math.ceil(glowSize), Math.ceil(glowSize)
  );
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    if (p.type === 'text' && p.text) {
      ctx.globalAlpha = alpha;
      ctx.font = `500 ${p.size}px ${C.HUD_FONT}`;
      ctx.textAlign = 'left';
      drawHudText(ctx, p.text, Math.floor(p.x), Math.floor(p.y), p.color, 0.5);
      ctx.globalAlpha = 1;
    } else if (p.type === 'shockwave' && p.radius !== undefined) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.floor(p.x), Math.floor(p.y), p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'ghost') {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'soul') {
      // Soul collection: glowing blue energy orb
      ctx.globalAlpha = alpha * 0.85;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      glow.addColorStop(0, p.color);
      glow.addColorStop(0.5, p.color.replace(')', ', 0.4)').replace('hsl', 'hsla'));
      glow.addColorStop(1, 'rgba(60, 120, 220, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#aaddff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'fog') {
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
      ctx.globalAlpha = 1;
    }
  }
}

export function renderLighting(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, vp: Viewport, isVendorRoom: boolean = false) {
  const brightness = getBrightness(); // Range [-0.5, 0.5]

  // Dynamic FOV: Shrink the light radius further if brightness is very low
  // When brightness starts going below -0.2, we close the field of vision
  let effectiveRadius = radius;
  if (brightness < -0.2) {
    const radiusFactor = Math.max(0.4, 1 + (brightness + 0.2) * 2); // At -0.5, radius is 40%
    effectiveRadius *= radiusFactor;
  }

  if (isVendorRoom) {
    // Vendor room: very bright, warm light
    // Scale the ambient shadow opacity based on brightness
    const baseAlpha = 0.4;
    const alphaScale = Math.max(0, 1 - (brightness + 0.5)); // +0.5 brightness -> alpha 0
    const finalAlpha = baseAlpha * alphaScale;

    const gradient = ctx.createRadialGradient(px, py, effectiveRadius * 0.5, px, py, effectiveRadius * 1.5);
    gradient.addColorStop(0, 'rgba(5, 3, 10, 0)');
    gradient.addColorStop(0.6, `rgba(5, 3, 10, ${finalAlpha * 0.25})`);
    gradient.addColorStop(1, `rgba(5, 3, 10, ${finalAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
    return;
  }

  // Standard room lighting
  // Base darkness alphas at key stops
  // Map brightness [-0.5, 0.5] to a multiplier that reduces shadow intensity
  // CAP: Never let darknessMult go below 0.6 (ensures 60% darkness / 40% visibility max)
  const darknessMult = Math.max(0.6, 1 - (brightness + 0.1) * 1.5);

  const gradient = ctx.createRadialGradient(px, py, effectiveRadius * 0.15, px, py, effectiveRadius);
  gradient.addColorStop(0, 'rgba(5, 3, 10, 0)');
  gradient.addColorStop(0.3, `rgba(5, 3, 10, ${0.3 * darknessMult})`);
  gradient.addColorStop(0.5, `rgba(5, 3, 10, ${0.65 * darknessMult})`);
  gradient.addColorStop(0.7, `rgba(5, 3, 10, ${0.88 * darknessMult})`);
  gradient.addColorStop(1, `rgba(5, 3, 10, ${0.97 * darknessMult})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
}

export function renderHUD(ctx: CanvasRenderingContext2D, player: PlayerState, dungeon: DungeonMap, time: number, enemyCount: number, tutorialTimer: number, isMobile: boolean = false, vp: Viewport = { gox: 0, goy: 0, rw: C.dims.gw, rh: C.dims.gh }) {
  // Mobile scale factor for bigger, readable text
  const ms = isMobile ? 1.7 : 1; // mobile scale
  // Viewport edges in game-translated coordinates
  const visLeft = -vp.gox;
  const visTop = -vp.goy;
  const visRight = vp.rw - vp.gox;
  const visBottom = vp.rh - vp.goy;

  // --- Player HP & Resources ---
  const hpW = Math.round(100 * ms);
  const hpH = Math.round(10 * ms);
  const hpX = visLeft + 6;
  const hpY = visTop + 6;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(hpX, hpY, hpW, hpH);
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpX, hpY, hpW, hpH);

  // Fill
  const hpPct = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = hpPct > 0.3 ? C.COLORS.hpFill : '#ff4400';
  ctx.fillRect(hpX + 1, hpY + 1, Math.round((hpW - 2) * hpPct), hpH - 2);

  // Text
  ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'left';
  drawHudText(ctx, `${Math.ceil(player.hp)}/${player.maxHp}`, hpX + 2, hpY + Math.round(hpH * 0.75), '#ffffff');

  // --- Potions ---
  const potY = hpY + hpH + 5;
  for (let i = 0; i < player.maxPotions; i++) {
    const px = visLeft + 6 + i * 14;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(px, potY, 12, 12);
    ctx.strokeStyle = '#555555';
    ctx.strokeRect(px, potY, 12, 12);

    if (i < player.potions) {
      // Potion liquid
      ctx.fillStyle = '#55ff55';
      ctx.fillRect(px + 3, potY + 4, 6, 6);
      ctx.fillRect(px + 4, potY + 3, 4, 1);
      // Shine
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(px + 4, potY + 5, 2, 2);
      ctx.globalAlpha = 1;
    } else {
      // Empty slot
      ctx.fillStyle = '#333333';
      ctx.font = '9px monospace';
      ctx.fillText('x', px + 3, potY + 9);
    }
  }

  // --- XP Bar ---
  const xpY = potY + 16;
  const xpH = Math.round(5 * ms);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(visLeft + 6, xpY, hpW, xpH + 4);
  ctx.fillStyle = C.COLORS.xpBg;
  ctx.fillRect(visLeft + 8, xpY + 2, hpW - 4, xpH);
  ctx.fillStyle = C.COLORS.xpFill;
  ctx.fillRect(visLeft + 8, xpY + 2, (hpW - 4) * (player.xp / player.xpToNext), xpH);
  ctx.fillStyle = '#88ffaa';
  ctx.font = `500 ${Math.round(8 * ms)}px ${C.HUD_FONT}`;
  ctx.fillText('XP', visLeft + 9, xpY + 2 + Math.round(xpH * 0.8));

  // --- Soul Counter (next to level) ---
  const lvlX = hpW + 14;
  const soulW = Math.round(70 * ms);
  const soulH = Math.round(20 * ms);
  ctx.fillStyle = 'rgba(10, 15, 35, 0.85)';
  ctx.fillRect(lvlX, hpY, soulW, soulH);
  ctx.strokeStyle = 'rgba(80, 140, 220, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlX, hpY, soulW, soulH);
  // Soul crystal icon — draw a small diamond shape
  const scx = lvlX + 10;
  const scy = hpY + soulH / 2;
  const scSize = Math.round(4 * ms);
  ctx.fillStyle = '#5599dd';
  ctx.beginPath();
  ctx.moveTo(scx, scy - scSize);
  ctx.lineTo(scx + scSize * 0.7, scy);
  ctx.lineTo(scx, scy + scSize);
  ctx.lineTo(scx - scSize * 0.7, scy);
  ctx.closePath();
  ctx.fill();
  // Inner bright core
  ctx.fillStyle = '#88ccff';
  ctx.beginPath();
  ctx.moveTo(scx, scy - scSize * 0.5);
  ctx.lineTo(scx + scSize * 0.35, scy);
  ctx.lineTo(scx, scy + scSize * 0.5);
  ctx.lineTo(scx - scSize * 0.35, scy);
  ctx.closePath();
  ctx.fill();
  // Soul count
  ctx.font = `600 ${Math.round(10 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'left';
  drawHudText(ctx, `${player.souls}`, scx + scSize + 4, hpY + Math.round(soulH * 0.7), '#88ccff');

  // --- Level Badge ---
  const lvlBadgeX = lvlX + soulW + 4;
  const lvlW = Math.round(44 * ms);
  const lvlH = Math.round(20 * ms);
  ctx.fillStyle = 'rgba(20, 20, 60, 0.85)';
  ctx.fillRect(lvlBadgeX, hpY, lvlW, lvlH);
  ctx.strokeStyle = '#5599ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlBadgeX, hpY, lvlW, lvlH);
  ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'left';
  drawHudText(ctx, `Nv.${player.level}`, lvlBadgeX + 4, hpY + Math.round(lvlH * 0.7), '#aaccff');

  // --- Floor indicator (top-right) ---
  const floorW = Math.round(84 * ms);
  const floorH = Math.round(18 * ms);
  const biome = getBiome(dungeon.floor);

  // Biome name (small, above floor)
  ctx.font = `600 ${Math.round(7 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'right';
  drawHudText(ctx, biome.name.toUpperCase(), visRight - 6, hpY - 2, biome.accent);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(visRight - floorW - 6, hpY, floorW, floorH);
  ctx.strokeStyle = '#aa8833';
  ctx.lineWidth = 1;
  ctx.strokeRect(visRight - floorW - 6, hpY, floorW, floorH);
  ctx.font = `500 ${Math.round(12 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'left';
  drawHudText(ctx, `Andar ${dungeon.floor}`, visRight - floorW - 2, hpY + Math.round(floorH * 0.72), '#ffddaa');

  // --- Enemy counter ---
  const ecY = hpY + floorH + 2;
  const ecH = Math.round(16 * ms);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(visRight - floorW - 6, ecY, floorW, ecH);
  if (enemyCount > 0) {
    ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
    ctx.textAlign = 'left';
    drawHudText(ctx, `${enemyCount} inimigos`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75), '#ff6644');
  } else {
    ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
    ctx.textAlign = 'left';
    drawHudText(ctx, `Sala limpa!`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75), '#44ff66');
  }

  // --- Objective text (center top, big and clear) ---
  const room = getCurrentRoom(dungeon);
  ctx.textAlign = 'center';
  const objFontSize = Math.round(isMobile ? 16 : 12);
  const objBarH = Math.round(isMobile ? 26 : 18);
  if (enemyCount > 0) {
    const objText = room.isBossRoom ? 'DERROTE O BOSS!' :
      room.type === 'trap' ? '⚠ CUIDADO COM O CHÃO ⚠' :
        room.type === 'treasure' ? 'PROTEJA O TESOURO!' : 'Elimine todos os inimigos!';
    const objColor = room.isBossRoom ? '#ff4444' : room.type === 'trap' ? '#ff6644' : '#ffcc44';
    const objW = Math.round(240 * ms);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(C.dims.gw / 2 - objW / 2, 4, objW, objBarH);
    ctx.font = `500 ${objFontSize}px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    drawHudText(ctx, objText, C.dims.gw / 2, 4 + Math.round(objBarH * 0.75), objColor);
  } else if (room.cleared) {
    const pulse = Math.sin(time * 5) * 0.3 + 0.7;
    if (room.type === 'shrine' && !room.shrineUsed) {
      const boxW = Math.round(280 * ms);
      ctx.fillStyle = `rgba(40, 20, 60, ${0.8 * pulse})`;
      ctx.fillRect(C.dims.gw / 2 - boxW / 2, 2, boxW, objBarH + 4);
      ctx.fillStyle = `rgba(180, 130, 255, ${pulse})`;
      ctx.font = `500 ${objFontSize}px ${C.HUD_FONT}`;
      ctx.fillText(isMobile ? 'ANDE ATÉ O SANTUÁRIO' : 'ANDE ATÉ O SANTUÁRIO (risco/recompensa)', C.dims.gw / 2, 2 + Math.round((objBarH + 4) * 0.72));
    } else if (room.type === 'treasure' && !room.treasureCollected) {
      const boxW = Math.round(240 * ms);
      ctx.fillStyle = `rgba(60, 40, 0, ${0.8 * pulse})`;
      ctx.fillRect(C.dims.gw / 2 - boxW / 2, 2, boxW, objBarH + 4);
      ctx.fillStyle = `rgba(255, 200, 50, ${pulse})`;
      ctx.font = `500 ${objFontSize}px ${C.HUD_FONT}`;
      ctx.fillText('ANDE ATÉ O BAÚ PARA COLETAR', C.dims.gw / 2, 2 + Math.round((objBarH + 4) * 0.72));
    } else {
      const boxW = Math.round(320 * ms);
      ctx.fillStyle = `rgba(0, 60, 0, ${0.8 * pulse})`;
      ctx.fillRect(C.dims.gw / 2 - boxW / 2, 2, boxW, objBarH + 4);
      ctx.strokeStyle = `rgba(50, 255, 100, ${0.6 * pulse})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(C.dims.gw / 2 - boxW / 2, 2, boxW, objBarH + 4);
      ctx.fillStyle = `rgba(100, 255, 100, ${pulse})`;
      ctx.font = `500 ${Math.round(objFontSize * 1.05)}px ${C.HUD_FONT}`;
      ctx.fillText(isMobile ? '⬆ PORTA VERDE PARA AVANÇAR ⬆' : '⬆ ANDE ATÉ A PORTA VERDE PARA AVANÇAR ⬆', C.dims.gw / 2, 2 + Math.round((objBarH + 4) * 0.72));
    }
  }
  ctx.textAlign = 'left';

  // --- Dash cooldown ---
  if (!isMobile) {
    const dashReady = player.dashCooldown <= 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(6, 30, 50, 14);
    ctx.fillStyle = dashReady ? '#44aaff' : '#333355';
    ctx.font = `500 9px ${C.HUD_FONT}`;
    ctx.fillText(dashReady ? '[F] Dash' : '[F] ...', 10, 40);
    if (!dashReady) {
      const pct = 1 - (player.dashCooldown / C.PLAYER_DASH_COOLDOWN);
      ctx.fillStyle = '#2255aa';
      ctx.fillRect(6, 43, 50 * pct, 2);
    }
  } else {
    // Mobile: show dash cooldown bar below XP
    const dashReady = player.dashCooldown <= 0;
    if (!dashReady) {
      const dashBarY = xpY + xpH + 6;
      const pct = 1 - (player.dashCooldown / C.PLAYER_DASH_COOLDOWN);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(hpX, dashBarY, Math.round(60 * ms), Math.round(4 * ms));
      ctx.fillStyle = '#2255aa';
      ctx.fillRect(hpX, dashBarY, Math.round(60 * ms) * pct, Math.round(4 * ms));
    }
  }

  // --- Upgrade icons (bottom-left) ---
  const iconSize = Math.round(10 * ms);
  const iconY = visBottom - Math.round(18 * ms);
  for (let i = 0; i < Math.min(player.upgrades.length, 16); i++) {
    ctx.fillStyle = 'rgba(30, 30, 50, 0.7)';
    ctx.fillRect(visLeft + 6 + i * (iconSize + 2), iconY, iconSize, iconSize);
    ctx.fillStyle = C.COLORS.common;
    ctx.fillRect(visLeft + 7 + i * (iconSize + 2), iconY + 1, iconSize - 2, iconSize - 2);
  }

  // --- Minimap ---
  // On mobile landscape, position minimap at bottom-left to avoid button overlap
  renderMinimap(ctx, dungeon, isMobile, vp);

  // --- Time ---
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
  ctx.font = `${Math.round(8 * ms)}px ${C.HUD_FONT}`;
  const timeX = isMobile ? visLeft + 6 : visRight - 40;
  const timeY = isMobile ? visBottom - Math.round(22 * ms) : visBottom - 6;
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, timeX, timeY);

  // Tutorial overlay removed — menu now explains controls

  // --- Bottom control hints (desktop only) ---
  if (!isMobile && tutorialTimer <= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(visLeft, visBottom - 14, vp.rw, 14);
    ctx.fillStyle = 'rgba(180, 180, 200, 0.5)';
    ctx.font = `8px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WASD: Mover  │  Clique: Atacar  │  Clique Dir: Projétil  │  F: Dash', C.dims.gw / 2, visBottom - 4);
    ctx.textAlign = 'left';
  }
}

function renderMinimap(ctx: CanvasRenderingContext2D, dungeon: DungeonMap, isMobile: boolean = false, vp: Viewport = { gox: 0, goy: 0, rw: C.dims.gw, rh: C.dims.gh }) {
  const cellSize = 18;
  const gap = 8;
  const connW = 5;
  const step = cellSize + gap;
  const visRight = vp.rw - vp.gox;
  const visBottom = vp.rh - vp.goy;
  const visLeft = -vp.gox;

  // Find bounds of the dungeon grid
  let minGX = Infinity, maxGX = -Infinity, minGY = Infinity, maxGY = -Infinity;
  for (const room of dungeon.rooms.values()) {
    if (room.gridX < minGX) minGX = room.gridX;
    if (room.gridX > maxGX) maxGX = room.gridX;
    if (room.gridY < minGY) minGY = room.gridY;
    if (room.gridY > maxGY) maxGY = room.gridY;
  }
  const cols = maxGX - minGX + 1;
  const rows = maxGY - minGY + 1;
  const mapW = cols * step - gap;
  const mapH = rows * step - gap;
  const pad = 8;
  const ox = isMobile ? visLeft + pad + 6 : visRight - mapW - pad - 8;
  const oy = visBottom - mapH - pad - (isMobile ? 42 : 28);

  // Background panel — brightness-reactive
  const brightness = getBrightness();
  const mapDarkness = Math.max(0.7, 1 - (brightness + 0.5) * 0.4);
  ctx.fillStyle = `rgba(20, 22, 35, ${0.92 * mapDarkness})`;
  const panelX = ox - pad;
  const panelY = oy - pad - 16;
  const panelW = mapW + pad * 2;
  const panelH = mapH + pad * 2 + 16;
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 130, 180, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 5);
  ctx.stroke();

  // Title — bigger, brighter
  ctx.fillStyle = 'rgba(200, 205, 230, 0.85)';
  ctx.font = `600 9px ${C.HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`MAPA — ANDAR ${dungeon.floor}`, panelX + panelW / 2, panelY + 12);
  ctx.textAlign = 'left';

  // Draw corridors (connections between rooms) — brighter
  ctx.lineWidth = connW;
  ctx.lineCap = 'round';
  for (const [, room] of dungeon.rooms) {
    const rx = ox + (room.gridX - minGX) * step + cellSize / 2;
    const ry = oy + (room.gridY - minGY) * step + cellSize / 2;
    const visited = room.visited;

    if (room.doors.east && dungeon.rooms.has(roomKey(room.gridX + 1, room.gridY))) {
      const neighbor = dungeon.rooms.get(roomKey(room.gridX + 1, room.gridY))!;
      const show = visited || neighbor.visited;
      if (show) {
        const both = visited && neighbor.visited;
        ctx.strokeStyle = both ? 'rgba(100, 110, 150, 0.8)' : 'rgba(70, 75, 100, 0.4)';
        ctx.beginPath();
        ctx.moveTo(rx + cellSize / 2, ry);
        ctx.lineTo(rx + cellSize / 2 + gap, ry);
        ctx.stroke();
      }
    }
    if (room.doors.south && dungeon.rooms.has(roomKey(room.gridX, room.gridY + 1))) {
      const neighbor = dungeon.rooms.get(roomKey(room.gridX, room.gridY + 1))!;
      const show = visited || neighbor.visited;
      if (show) {
        const both = visited && neighbor.visited;
        ctx.strokeStyle = both ? 'rgba(100, 110, 150, 0.8)' : 'rgba(70, 75, 100, 0.4)';
        ctx.beginPath();
        ctx.moveTo(rx, ry + cellSize / 2);
        ctx.lineTo(rx, ry + cellSize / 2 + gap);
        ctx.stroke();
      }
    }
  }
  ctx.lineCap = 'butt';

  // Draw rooms — brighter fills and clearer borders
  for (const [key, room] of dungeon.rooms) {
    const isCurrent = key === dungeon.currentRoomKey;
    const rx = ox + (room.gridX - minGX) * step;
    const ry = oy + (room.gridY - minGY) * step;
    const cx = rx + cellSize / 2;
    const cy = ry + cellSize / 2;

    if (!room.visited) {
      // Adjacent-to-visited rooms: brighter fog of war
      let adjacentVisited = false;
      const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
      for (const d of dirs) {
        const nk = roomKey(room.gridX + d.dx, room.gridY + d.dy);
        const nr = dungeon.rooms.get(nk);
        if (nr && nr.visited) { adjacentVisited = true; break; }
      }
      if (adjacentVisited) {
        ctx.strokeStyle = 'rgba(130, 135, 170, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(160, 165, 200, 0.5)';
        ctx.font = `600 10px ${C.HUD_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', cx, cy + 4);
        ctx.textAlign = 'left';
      }
      continue;
    }

    // Room fill color — much brighter and more distinct
    let fillColor: string;
    let borderColor: string;
    if (isCurrent) {
      fillColor = 'rgba(90, 150, 255, 0.7)';
      borderColor = 'rgba(140, 190, 255, 1)';
    } else if (room.isBossRoom) {
      fillColor = room.cleared ? 'rgba(140, 60, 60, 0.6)' : 'rgba(220, 70, 70, 0.65)';
      borderColor = 'rgba(255, 110, 110, 0.9)';
    } else if (room.type === 'treasure') {
      fillColor = room.treasureCollected ? 'rgba(120, 100, 50, 0.5)' : 'rgba(230, 195, 60, 0.6)';
      borderColor = 'rgba(255, 225, 80, 0.9)';
    } else if (room.type === 'shrine') {
      fillColor = room.shrineUsed ? 'rgba(80, 50, 100, 0.5)' : 'rgba(160, 90, 230, 0.6)';
      borderColor = 'rgba(200, 140, 255, 0.9)';
    } else if (room.type === 'vendor') {
      fillColor = 'rgba(70, 160, 110, 0.6)';
      borderColor = 'rgba(120, 240, 170, 0.9)';
    } else if (room.type === 'trap') {
      fillColor = room.trapTriggered ? 'rgba(110, 50, 50, 0.5)' : 'rgba(220, 80, 60, 0.55)';
      borderColor = 'rgba(255, 130, 100, 0.8)';
    } else if (room.cleared) {
      fillColor = 'rgba(60, 130, 75, 0.6)';
      borderColor = 'rgba(100, 200, 120, 0.7)';
    } else {
      fillColor = 'rgba(85, 90, 120, 0.6)';
      borderColor = 'rgba(140, 145, 180, 0.7)';
    }

    // Fill
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    roundRect(ctx, rx, ry, cellSize, cellSize, 3);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isCurrent ? 2.5 : 1.5;
    ctx.beginPath();
    roundRect(ctx, rx, ry, cellSize, cellSize, 3);
    ctx.stroke();

    // Room icon — bigger and clearer
    ctx.textAlign = 'center';
    ctx.font = `600 10px ${C.HUD_FONT}`;
    if (isCurrent) {
      // Player dot (pulsing)
      const pulse = Math.sin(Date.now() / 200) * 2 + 4;
      ctx.fillStyle = 'rgba(170, 210, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (room.isBossRoom) {
      ctx.fillStyle = room.cleared ? 'rgba(220, 130, 130, 0.6)' : 'rgba(255, 120, 100, 1)';
      ctx.fillText('💀', cx, cy + 4);
    } else if (room.type === 'treasure') {
      ctx.fillStyle = 'rgba(255, 230, 100, 1)';
      ctx.fillText(room.treasureCollected ? '·' : '◆', cx, cy + 4);
    } else if (room.type === 'shrine') {
      ctx.fillStyle = 'rgba(200, 150, 255, 1)';
      ctx.fillText(room.shrineUsed ? '·' : '✦', cx, cy + 4);
    } else if (room.type === 'vendor') {
      ctx.fillStyle = 'rgba(130, 255, 200, 1)';
      ctx.fillText('$', cx, cy + 4);
    } else if (room.type === 'trap') {
      ctx.fillStyle = 'rgba(255, 130, 90, 1)';
      ctx.fillText(room.trapTriggered ? '·' : '⚠', cx, cy + 4);
    } else if (room.cleared) {
      ctx.fillStyle = 'rgba(130, 220, 145, 0.8)';
      ctx.fillText('✓', cx, cy + 4);
    }
    ctx.textAlign = 'left';
  }

  // Legend — bigger, brighter, easier to read
  const legendY = panelY + panelH + 4;
  ctx.font = `500 7px ${C.HUD_FONT}`;
  const legends = [
    { color: 'rgba(120, 170, 255, 0.95)', label: 'VOCÊ' },
    { color: 'rgba(100, 200, 120, 0.95)', label: 'LIMPA' },
    { color: 'rgba(255, 110, 110, 0.95)', label: 'BOSS' },
    { color: 'rgba(255, 225, 80, 0.95)', label: 'TESOURO' },
    { color: 'rgba(120, 240, 170, 0.95)', label: 'LOJA' },
  ];
  let lx = panelX;
  for (const l of legends) {
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, legendY, 6, 6);
    ctx.fillStyle = 'rgba(190, 195, 220, 0.8)';
    ctx.fillText(l.label, lx + 8, legendY + 6);
    lx += ctx.measureText(l.label).width + 14;
  }
}

// Helper for rounded rectangles
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

export function applyScreenEffects(ctx: CanvasRenderingContext2D, effects: ScreenEffect[], vp: Viewport) {
  for (const fx of effects) {
    if (fx.type === 'flash' && fx.color) {
      const alpha = (fx.timer / fx.duration) * 0.35;
      ctx.fillStyle = fx.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
    }
  }
}

export function getShakeOffset(effects: ScreenEffect[]): { x: number; y: number } {
  let x = 0, y = 0;
  for (const fx of effects) {
    if (fx.type === 'shake') {
      const intensity = fx.intensity * (fx.timer / fx.duration);
      x += (Math.random() - 0.5) * intensity * 2;
      y += (Math.random() - 0.5) * intensity * 2;
    }
  }
  return { x: Math.round(x), y: Math.round(y) };
}

// ============ HIDDEN TRAP RENDERING ============

export function renderHiddenTraps(ctx: CanvasRenderingContext2D, traps: HiddenTrap[], time: number) {
  for (const trap of traps) {
    if (trap.triggered) {
      // Show activated trap mark
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, C.TILE_SIZE * 0.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // RED tile hint — clearly different but player must still pay attention
    const tileX = trap.x - C.TILE_SIZE / 2;
    const tileY = trap.y - C.TILE_SIZE / 2;

    // Dark red tile overlay
    ctx.fillStyle = 'rgba(120, 20, 20, 0.25)';
    ctx.fillRect(tileX, tileY, C.TILE_SIZE, C.TILE_SIZE);

    // Subtle red border
    ctx.strokeStyle = 'rgba(180, 30, 30, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(tileX + 1, tileY + 1, C.TILE_SIZE - 2, C.TILE_SIZE - 2);

    // Small red crack/mark
    const seed = trap.hintSeed;
    const markType = Math.floor(seed) % 3;
    ctx.strokeStyle = 'rgba(150, 30, 30, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    if (markType === 0) {
      ctx.moveTo(trap.x - 4, trap.y - 3);
      ctx.lineTo(trap.x + 3, trap.y + 4);
    } else if (markType === 1) {
      ctx.moveTo(trap.x - 3, trap.y);
      ctx.lineTo(trap.x + 4, trap.y + 1);
    } else {
      ctx.moveTo(trap.x, trap.y - 4);
      ctx.lineTo(trap.x + 1, trap.y + 4);
    }
    ctx.stroke();
  }
}

// ============ TRAP EFFECT OVERLAYS ============

export function renderTrapEffectOverlay(
  ctx: CanvasRenderingContext2D,
  time: number,
  panicTimer: number,
  lightsOutTimer: number,
  doorsLockedTimer: number,
  vp: Viewport,
) {
  const fx = -vp.gox;
  const fy = -vp.goy;
  const fw = vp.rw;
  const fh = vp.rh;
  // Panic effect — distortion, flashing, chaos
  if (panicTimer > 0) {
    const intensity = Math.min(1, panicTimer / 2);
    // Red/purple flashing
    const flash = Math.sin(time * 25) * 0.15 * intensity;
    ctx.fillStyle = `rgba(200, 0, 50, ${Math.abs(flash)})`;
    ctx.fillRect(fx, fy, fw, fh);
    // Chromatic aberration simulation
    const offset = Math.sin(time * 30) * 3 * intensity;
    ctx.fillStyle = `rgba(0, 255, 0, ${0.03 * intensity})`;
    ctx.fillRect(fx + offset, fy, fw, fh);
    ctx.fillStyle = `rgba(255, 0, 255, ${0.03 * intensity})`;
    ctx.fillRect(fx - offset, fy, fw, fh);
    // Scan lines
    for (let y = fy; y < fy + fh; y += 4) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 * intensity * (Math.sin(y + time * 50) > 0 ? 1 : 0)})`;
      ctx.fillRect(fx, y, fw, 2);
    }
  }

  // Lights out — near total darkness overlay
  if (lightsOutTimer > 0) {
    const alpha = Math.min(0.95, lightsOutTimer > 1 ? 0.95 : lightsOutTimer * 0.95);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // Doors locked indicator
  if (doorsLockedTimer > 0) {
    const pulse = Math.sin(time * 6) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, C.dims.gw - 4, C.dims.gh - 4);
  }
}
