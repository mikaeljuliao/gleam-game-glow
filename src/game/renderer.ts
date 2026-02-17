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
    const activeStep = p.activeComboStep || 1;
    const isFinalHit = activeStep === 4;
    const isHeavyHit = activeStep === 3;

    // Total duration (Matches p.meleeTimer initialization in player.tryMelee)
    const duration = C.MELEE_COOLDOWN * (isFinalHit ? 1.5 : 1.0);
    const t = 1 - (p.meleeTimer / duration);

    // Dynamic Arc based on combo step
    const arcMult = isFinalHit ? 2.5 : (isHeavyHit ? 1.4 : 1.0);
    const activeArc = C.MELEE_ARC * arcMult;

    // 4-Hit Combo Directional Logic
    // Step 1: Forward Slash (Right to Left)
    // Step 2: Backhand Slash (Left to Right)
    // Step 3: Overhead Smash
    // Step 4: Full Sweep (Vortex)

    let swingProgress = 0;
    let bladeScale = 1.0;
    let handOffset = 0;

    // Phase 1: Anticipation (0% - 20%)
    if (t < 0.2) {
      const pt = t / 0.2;
      swingProgress = -pt * 0.15; // Pullback
      handOffset = pt * 2;
    }
    // Phase 2: Strike (20% - 60%)
    else if (t < 0.6) {
      const pt = (t - 0.2) / 0.4;
      const ease = isFinalHit ? (1 - Math.pow(1 - pt, 4)) : (1 - Math.pow(1 - pt, 3));
      swingProgress = -0.15 + (1.3 * ease);
      bladeScale = (isFinalHit ? 1.3 : 1.1) + Math.sin(pt * Math.PI) * 0.2;
    }
    // Phase 3: Recovery (60% - 100%)
    else {
      const pt = (t - 0.6) / 0.4;
      swingProgress = 1.15 + pt * 0.1;
      bladeScale = 1.0;
    }

    // Directional orientation
    let startAngle = p.meleeAngle - activeArc / 2;
    let currentAngle = startAngle + activeArc * swingProgress;

    if (activeStep === 2) {
      // Step 2: Reverse direction
      startAngle = p.meleeAngle + activeArc / 2;
      currentAngle = startAngle - activeArc * swingProgress;
    }

    // --- AAA Motion Blur Trail ---
    if (t > 0.15 && t < 0.9) {
      const trailAlpha = Math.sin((t - 0.15) / 0.75 * Math.PI) * (isFinalHit ? 0.8 : 0.5);

      // Multi-layered trail for volume
      const layers = isFinalHit ? 5 : 3;
      for (let i = 0; i < layers; i++) {
        const layerRange = range + (i * (isFinalHit ? 4 : 2));
        const grad = ctx.createRadialGradient(x, y, range * 0.3, x, y, layerRange);
        const alpha = trailAlpha / (i + 1);

        // Color variation per step
        let colorCore = 'rgba(135, 206, 250,';
        if (isFinalHit) colorCore = 'rgba(255, 100, 100,'; // Red/Pink for finisher
        else if (isHeavyHit) colorCore = 'rgba(255, 200, 100,'; // Gold for heavy

        grad.addColorStop(0, `${colorCore} 0)`);
        grad.addColorStop(0.7, `${colorCore} ${alpha * 0.5})`);
        grad.addColorStop(0.9, `${colorCore} ${alpha})`);
        grad.addColorStop(1, `${colorCore} 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (activeStep === 2) {
          ctx.arc(x, y, layerRange, startAngle, currentAngle, true);
        } else {
          ctx.arc(x, y, layerRange, startAngle, currentAngle);
        }
        ctx.closePath();
        ctx.fill();

        // Extra finisher sparks
        if (isFinalHit && Math.random() < 0.3) {
          const sparkAngle = startAngle + (currentAngle - startAngle) * Math.random();
          const sparkDist = range * (0.8 + Math.random() * 0.4);
          ctx.fillStyle = '#ffaaaa';
          ctx.fillRect(x + Math.cos(sparkAngle) * sparkDist, y + Math.sin(sparkAngle) * sparkDist, 2, 2);
        }
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
      // ═══ UMBRAL PROWLER - O Predador de Seda Negra ═══
      const prowl = Math.sin(time * 12) * 2;
      const tailFlow = Math.sin(time * 6) * 5;

      // SLEEK SILHOUETTE (Elongated body)
      const cColor = e.flashTime > 0 ? C.COLORS.white : '#0a0a0a';
      ctx.fillStyle = cColor;

      // Main Torso (Elegant teardrop shape)
      ctx.beginPath();
      ctx.moveTo(x - half - 4, y + prowl);
      ctx.quadraticCurveTo(x, y - half - 2 + prowl, x + half + 4, y + prowl);
      ctx.quadraticCurveTo(x, y + half + 2 + prowl, x - half - 4, y + prowl);
      ctx.fill();

      // BLADE LIMBS (4 Sharp, elegant legs)
      ctx.strokeStyle = '#220000';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        // Legs
        ctx.beginPath();
        ctx.moveTo(x + (side * 4), y + prowl);
        ctx.lineTo(x + (side * 8), y + half + 6 + prowl);
        ctx.stroke();
      }

      // ELEGANT TAIL (Wispy shadow)
      ctx.strokeStyle = 'rgba(60, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.moveTo(x - half, y + prowl);
      ctx.bezierCurveTo(x - half - 10, y + prowl - 5, x - half - 5, y + prowl + 10, x - half - 15, y + prowl + tailFlow);
      ctx.stroke();

      // THE KILLING EYE (Single sharp red glint)
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(x + half + 1, y + prowl - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye glint aura
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(x + half + 1, y + prowl - 1, 4, 0, Math.PI * 2);
      ctx.fill();

      break;
    }

    case 'shooter': {
      // ═══ ARCANE SENTINEL - Relíquia Flutuante Elegante ═══
      const float = Math.sin(time * 4) * 5;
      const innerSpin = time * 2;
      const pulsing = Math.sin(time * 6) * 0.2 + 0.8;

      // 1. GOLDEN ORBITAL RINGS (Clean circular geometry)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const ringScale = i === 0 ? 1 : 0.7;
        ctx.beginPath();
        ctx.ellipse(x, y + float, half + 8, (half + 8) * 0.4, innerSpin * (i === 0 ? 1 : -1), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. THE FLOATING CROWN / SHARDS
      ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + innerSpin;
        const sx = x + Math.cos(ang) * (half + 2);
        const sy = y + Math.sin(ang) * (half + 2) * 0.5 + float;

        ctx.beginPath();
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx + 2, sy);
        ctx.lineTo(sx, sy + 3);
        ctx.lineTo(sx - 2, sy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(sx - 0.5, sy - 0.5, 1, 1);
        ctx.fillStyle = '#111';
      }

      // 3. SAPPHIRE CORE (Main Body)
      const coreGrad = ctx.createRadialGradient(x, y + float, 0, x, y + float, half);
      coreGrad.addColorStop(0, e.flashTime > 0 ? C.COLORS.white : '#88ccff');
      coreGrad.addColorStop(1, e.flashTime > 0 ? C.COLORS.white : '#1a0033');
      ctx.fillStyle = coreGrad;

      // Unique refined shape: Sharp diamond
      ctx.beginPath();
      ctx.moveTo(x, y - half - 4 + float);
      ctx.lineTo(x + half, y + float);
      ctx.lineTo(x, y + half + 4 + float);
      ctx.lineTo(x - half, y + float);
      ctx.closePath();
      ctx.fill();

      // 4. INNER ENERGY (Horizontal slit eye)
      ctx.fillStyle = `rgba(255, 255, 255, ${pulsing})`;
      ctx.fillRect(x - 3, y - 0.5 + float, 6, 1);

      break;
    }

    case 'tank': {
      // ═══ ROYAL SENTINEL - O Guardião Imponente ═══
      const sway = Math.sin(time * 3) * 1;
      const charge = e.aiState === 'charge';
      const power = charge ? Math.sin(time * 20) * 0.3 + 0.7 : 0.4;

      // 1. DARK STEEL CHASSIS (Clean plate armor)
      const armorColor = e.flashTime > 0 ? C.COLORS.white : '#1a1a1a';
      ctx.fillStyle = armorColor;

      // Main heavy body (U-shape armor)
      ctx.beginPath();
      ctx.moveTo(x - half - 4, y + half);
      ctx.lineTo(x - half - 4, y - half + 8);
      ctx.quadraticCurveTo(x, y - half - 8 + sway, x + half + 4, y - half + 8);
      ctx.lineTo(x + half + 4, y + half);
      ctx.closePath();
      ctx.fill();

      // 2. GOLDEN FILIGREE (Elegant strategic detail)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - half + 2, y);
      ctx.lineTo(x + half - 2, y);
      ctx.stroke();

      // 3. ROYAL KITE SHIELD (Frontal presence)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(x + half - 2, y - half + 5 + sway);
      ctx.lineTo(x + half + 10, y - half + 5 + sway);
      ctx.lineTo(x + half + 8, y + half + 5 + sway);
      ctx.lineTo(x + half - 2, y + half + 2 + sway);
      ctx.closePath();
      ctx.fill();

      // Shield Crest (Gold diamond)
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(x + half + 4, y + sway);
      ctx.lineTo(x + half + 6, y + 2 + sway);
      ctx.lineTo(x + half + 4, y + 4 + sway);
      ctx.lineTo(x + half + 2, y + 2 + sway);
      ctx.closePath();
      ctx.fill();

      // 4. DIVINE PRESENCE (Charge effects - elegant sparks)
      if (charge) {
        ctx.strokeStyle = `rgba(255, 200, 0, ${power})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, half + 15, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. HELMET SLIT (Menacing visor)
      ctx.fillStyle = charge ? '#ff0000' : '#ffd700';
      ctx.fillRect(x - 4, y - half + 4 + sway, 8, 2);

      break;
    }

    case 'wraith': {
      // ═══ ETHEREAL SPECTER - Espectro dimensional ═══
      const wFloat = Math.sin(time * 5 + e.x) * 3;
      const phasePulse = Math.sin(time * 4) * 0.3 + 0.7;
      const phaseShift = e.aiState === 'teleport' ? e.phaseAlpha : 1;

      ctx.globalAlpha = phaseShift;

      // Dimensional rift effect (when teleporting)
      if (e.aiState === 'teleport' && e.phaseAlpha < 0.5) {
        for (let i = 0; i < 5; i++) {
          const riftAngle = (i / 5) * Math.PI * 2 + time * 4;
          const riftDist = 8 + (0.5 - e.phaseAlpha) * 20;
          const rx = x + Math.cos(riftAngle) * riftDist;
          const ry = y + Math.sin(riftAngle) * riftDist + wFloat;

          ctx.strokeStyle = `rgba(0, 255, 220, ${0.6 - e.phaseAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + wFloat);
          ctx.lineTo(rx, ry);
          ctx.stroke();
        }

        // Portal ring
        ctx.strokeStyle = `rgba(0, 200, 200, ${0.8 - e.phaseAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y + wFloat, 15 + (0.5 - e.phaseAlpha) * 15, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Outer spectral aura (multiple layers)
      for (let layer = 0; layer < 3; layer++) {
        const layerOffset = layer * 4;
        const layerAlpha = (0.15 - layer * 0.04) * phasePulse;
        ctx.fillStyle = `rgba(0, 220, 200, ${layerAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y + wFloat, half + 10 + layerOffset, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spectral rings orbiting
      for (let i = 0; i < 3; i++) {
        const ringAngle = time * 3 + i * (Math.PI * 2 / 3);
        const ringRadius = half + 8 + Math.sin(time * 2 + i) * 2;
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 * phasePulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ringAngle) * 3, y + Math.sin(ringAngle) * 2 + wFloat, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main ethereal body (translucent core)
      const bodyGrad = ctx.createRadialGradient(x, y + wFloat, 0, x, y + wFloat, half + 2);
      bodyGrad.addColorStop(0, e.flashTime > 0 ? C.COLORS.white : 'rgba(150, 255, 255, 0.9)');
      bodyGrad.addColorStop(0.5, e.flashTime > 0 ? C.COLORS.white : C.COLORS.wraith);
      bodyGrad.addColorStop(1, e.flashTime > 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 200, 200, 0.2)');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(x, y + wFloat, half + 1, 0, Math.PI * 2);
      ctx.fill();

      // Inner etheric glow (pulsating core)
      const innerGlow = ctx.createRadialGradient(x, y + wFloat, 0, x, y + wFloat, half * 0.6);
      innerGlow.addColorStop(0, `rgba(200, 255, 255, ${phasePulse * 0.8})`);
      innerGlow.addColorStop(0.7, `rgba(100, 255, 255, ${phasePulse * 0.4})`);
      innerGlow.addColorStop(1, 'rgba(0, 200, 200, 0)');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(x, y + wFloat, half * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Spectral chains/tendrils flowing down
      ctx.strokeStyle = e.flashTime > 0 ? C.COLORS.white : C.COLORS.wraithDark;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const tendrilX = x - 8 + i * 4;
        const tendrilLength = 8 + i * 1.5;
        const wave = Math.sin(time * 6 + i * 0.5) * 2;

        ctx.globalAlpha = phaseShift * (1 - i * 0.15);
        ctx.beginPath();
        ctx.moveTo(tendrilX, y + half + wFloat);
        ctx.quadraticCurveTo(
          tendrilX + wave, y + half + wFloat + tendrilLength / 2,
          tendrilX + wave * 2, y + half + wFloat + tendrilLength
        );
        ctx.stroke();
      }

      ctx.globalAlpha = phaseShift;

      // Haunting eyes (piercing cyan glow)
      const eyePulse = Math.sin(time * 8) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(0, 255, 255, ${eyePulse})`;
      ctx.fillRect(x - 4, y - 2 + wFloat, 2, 3);
      ctx.fillRect(x + 3, y - 2 + wFloat, 2, 3);

      // Eye glow aura
      ctx.fillStyle = `rgba(0, 255, 220, ${eyePulse * 0.4})`;
      ctx.fillRect(x - 6, y - 3 + wFloat, 6, 5);
      ctx.fillRect(x + 1, y - 3 + wFloat, 6, 5);

      // Ethereal particles drifting
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.3) {
          const px = x + (Math.random() - 0.5) * (s + 10);
          const py = y + wFloat + (Math.random() - 0.5) * (s + 10);
          ctx.fillStyle = `rgba(0, ${200 + Math.random() * 55}, 220, ${0.4 + Math.random() * 0.4})`;
          ctx.fillRect(px, py, 1, 1);
        }
      }

      ctx.globalAlpha = 1;
      break;
    }

    case 'bomber': {
      // ═══ OBSIDIAN HEART - O Núcleo de Magia Instável ═══
      const active = e.aiState === 'fuse';
      const float = Math.sin(time * 5) * 2;
      const pulsing = active ? Math.sin(time * 25) * 0.4 + 0.6 : 0.4;
      const crack = active ? (1 - e.fuseTimer / 1.5) : 0;

      // 1. DARK ENERGY LEAK (Aura)
      if (active) {
        ctx.fillStyle = `rgba(100, 0, 255, ${0.15 * pulsing})`;
        ctx.beginPath();
        ctx.arc(x, y + float, half + 10 + crack * 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. FLOATING OBSIDIAN SHELL (Shattered look)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#080010';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + time * 0.5;
        const dist = 6 + crack * 8;
        const ox = x + Math.cos(ang) * dist;
        const oy = y + Math.sin(ang) * dist + float;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(4, -2);
        ctx.lineTo(2, 6);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 3. THE UNSTABLE CORE (Energy orb)
      const coreGrad = ctx.createRadialGradient(x, y + float, 0, x, y + float, half - 2);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, active ? '#ff00ff' : '#4400aa');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y + float, half - 2, 0, Math.PI * 2);
      ctx.fill();

      break;
    }

    case 'swarm': {
      // ═══ RAZOR WASP - Predador Aéreo Bio-Mecânico ═══
      const hover = Math.sin(time * 10) * 3;
      const wingBeat = Math.sin(time * 40);

      // DOUBLE CRYSTAL WINGS
      ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
      // Left Wings
      ctx.beginPath();
      ctx.ellipse(x - 4, y + hover, 12, 4 + wingBeat * 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Right Wings
      ctx.beginPath();
      ctx.ellipse(x + 4, y + hover, 12, 4 + wingBeat * 3, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // SHARP SEGMENTED BODY
      const bodyColor = e.flashTime > 0 ? C.COLORS.white : '#ffd700';
      ctx.fillStyle = bodyColor;

      // Abdomen (Spear shape)
      ctx.beginPath();
      ctx.moveTo(x, y + hover - 2);
      ctx.lineTo(x - 4, y + hover + 10);
      ctx.lineTo(x, y + hover + 14); // The Stinger point
      ctx.lineTo(x + 4, y + hover + 10);
      ctx.closePath();
      ctx.fill();

      // Venom markings
      ctx.fillStyle = '#111111';
      ctx.fillRect(x - 3, y + hover + 4, 6, 1.5);
      ctx.fillRect(x - 2, y + hover + 8, 4, 1.5);
    }

    case 'wraith': {
      // ═══ LOST SOUL - Espectro Dimensional ═══
      const float = Math.sin(time * 4) * 5;
      const alpha = e.phaseAlpha;
      ctx.globalAlpha = alpha;

      // Mist Trail
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(0, 255, 200, ${(0.2 - i * 0.04) * alpha})`;
        ctx.beginPath();
        ctx.arc(x - e.vx * i * 3, y + float + 5 + i * 4, half - i, 0, Math.PI * 2);
        ctx.fill();
      }

      // ETHEREAL BODY (Wispy)
      const wColor = e.flashTime > 0 ? C.COLORS.white : 'rgba(0, 255, 200, 0.6)';
      ctx.fillStyle = wColor;
      ctx.beginPath();
      ctx.moveTo(x, y - half + float);
      ctx.quadraticCurveTo(x + half + 2, y + float, x, y + half + 6 + float);
      ctx.quadraticCurveTo(x - half - 2, y + float, x, y - half + float);
      ctx.fill();

      // Hollow Eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(x - 3, y - 2 + float, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 3, y - 2 + float, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      break;
    }

    case 'stalker': {
      // ═══ SHADOW ASSASSIN - Predador de Lâminas ═══
      const crouch = Math.sin(time * 6) * 1;
      const lunge = e.lunging ? 5 : 0;
      ctx.globalAlpha = e.stealthAlpha;

      // HUNCHED SILHOUETTE
      const sColor = e.flashTime > 0 ? C.COLORS.white : '#111111';
      ctx.fillStyle = sColor;

      // Left Scythe Arm
      ctx.beginPath();
      ctx.moveTo(x - 2, y + crouch);
      ctx.quadraticCurveTo(x - half - 8 - lunge, y - half + crouch, x - half - 12 - lunge, y + half + crouch);
      ctx.lineTo(x - half - 6, y + half + 2 + crouch);
      ctx.fill();

      // Right Scythe Arm
      ctx.beginPath();
      ctx.moveTo(x + 2, y + crouch);
      ctx.quadraticCurveTo(x + half + 8 + lunge, y - half + crouch, x + half + 12 + lunge, y + half + crouch);
      ctx.lineTo(x + half + 6, y + half + 2 + crouch);
      ctx.fill();

      // Torso
      ctx.beginPath();
      ctx.moveTo(x - 5, y + half + crouch);
      ctx.lineTo(x + 5, y + half + crouch);
      ctx.lineTo(x, y - half + crouch);
      ctx.closePath();
      ctx.fill();

      // Red Kill-Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x - 2, y - half + 4 + crouch, 1, 1);
      ctx.fillRect(x + 1, y - half + 4 + crouch, 1, 1);

      ctx.globalAlpha = 1;
      break;
    }

    case 'phantom': {
      // ═══ WAILING BANSHEE - O Grito do Desespero ═══
      const wail = Math.sin(time * 20) * 2;
      ctx.globalAlpha = e.stealthAlpha;

      // Ghostly Wisps
      ctx.fillStyle = 'rgba(200, 100, 255, 0.3)';
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + time;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * (half + 4), y + Math.sin(ang) * (half + 4), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // SOUL MASS (Flowing)
      const pColor = e.flashTime > 0 ? C.COLORS.white : 'rgba(255, 100, 255, 0.7)';
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.moveTo(x, y - half - 5);
      ctx.bezierCurveTo(x + half + 10, y, x + half, y + half + 10, x, y + half + 15);
      ctx.bezierCurveTo(x - half, y + half + 10, x - half - 10, y, x, y - half - 5);
      ctx.fill();

      // The Agonized Face
      ctx.fillStyle = '#000000';
      // Eyes
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Screaming Mouth
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 2, 5 + wail, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      break;
    }

    case 'flash_hunter': {
      // ═══ LIGHT PRISM - O Caçador de Cristais ═══
      const spin = time * 4;
      ctx.globalAlpha = e.stealthAlpha;

      // CRYSTALLINE STRUCTURE (Hexagonal)
      const fColor = e.flashTime > 0 ? C.COLORS.white : '#ffffff';
      ctx.fillStyle = fColor;
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = spin + (i * Math.PI / 3);
        const px = x + Math.cos(ang) * half;
        const py = y + Math.sin(ang) * half;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // INNER CORE
      ctx.fillStyle = '#00ccff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      break;
    }

    case 'distortion': {
      // ═══ VOID MIRROR - O Fragmento da Realidade ═══
      ctx.globalAlpha = e.stealthAlpha;
      const float = Math.sin(time * 4) * 5;

      // 1. DISTORTION HALO
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y + float, half + 10, 0, Math.PI * 2);
      ctx.stroke();

      // 2. SHATTERED DARK GLASS (Clean geometric shards)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#050010';
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + time;
        const dist = 5 + Math.sin(time * 2 + i) * 3;
        const sx = x + Math.cos(ang) * dist;
        const sy = y + Math.sin(ang) * dist + float;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang + time);
        ctx.beginPath();
        ctx.moveTo(-3, -5);
        ctx.lineTo(3, 0);
        ctx.lineTo(-3, 5);
        ctx.closePath();
        ctx.fill();

        // Mirror rim light
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      }

      // 3. THE VOID EYE (Single magenta slit)
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(x - 4, y - 1 + float, 8, 2);

      ctx.globalAlpha = 1;
      break;
    }

    case 'flicker_fiend': {
      // ═══ ABYSSAL WRAITH - O Ser Entre Quadros ═══
      if (e.stealthAlpha < 0.5) break;
      const opacity = 0.4 + Math.sin(time * 30) * 0.3;

      // 1. GHOSTLY SILHOUETTE (Contrast-heavy)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : `rgba(10, 0, 20, ${opacity})`;

      // Clean diamond body
      ctx.beginPath();
      ctx.moveTo(x, y - half - 10);
      ctx.lineTo(x + half + 2, y);
      ctx.lineTo(x, y + half + 10);
      ctx.lineTo(x - half - 2, y);
      ctx.closePath();
      ctx.fill();

      // 2. SHADOW FLICKER (Refined arcs of shadow)
      ctx.strokeStyle = `rgba(255, 0, 50, ${opacity * 0.5})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const offset = Math.sin(time * 40 + i) * 10;
        ctx.beginPath();
        ctx.arc(x + offset, y, half + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. PIERCING EYES (Steady yellow intensity)
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x - 3, y - 4, 1.5, 5);
      ctx.fillRect(x + 1.5, y - 4, 1.5, 5);

      break;
    }

    case 'warper': {
      // ═══ RIFT WALKER - Místico do Espaço-Tempo ═══
      ctx.globalAlpha = e.stealthAlpha;
      const float = Math.sin(time * 5) * 3;
      const portal = (1 - e.stealthAlpha);

      // Galaxy Shroud (Aura)
      const gGrad = ctx.createRadialGradient(x, y + float, 0, x, y + float, half + 15);
      gGrad.addColorStop(0, 'rgba(0, 50, 200, 0.4)');
      gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(x, y + float, half + 15, 0, Math.PI * 2);
      ctx.fill();

      // RIFT CLOAK (Flowing)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#001a33';
      ctx.beginPath();
      ctx.moveTo(x - half, y - half + float);
      ctx.quadraticCurveTo(x, y - half - 5 + float, x + half, y - half + float);
      ctx.lineTo(x + half + 4, y + half + float);
      ctx.lineTo(x - half - 4, y + half + float);
      ctx.closePath();
      ctx.fill();

      // CRYSTAL MASK
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.moveTo(x, y - half + 2 + float);
      ctx.lineTo(x + 4, y - half + 8 + float);
      ctx.lineTo(x, y - half + 12 + float);
      ctx.lineTo(x - 4, y - half + 8 + float);
      ctx.closePath();
      ctx.fill();

      // Teleport Rings
      if (portal > 0.1) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${portal})`;
        ctx.beginPath();
        ctx.arc(x, y + float, half + 5 + portal * 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      break;
    }

    case 'accelerator': {
      // ═══ SPIRIT COMET - Bólido de Energia Espectral ═══
      ctx.globalAlpha = Math.max(0.3, e.stealthAlpha);
      const accel = e.stealthAlpha;
      const stretch = accel > 0.8 ? 15 : 0;

      // 1. SPECTRAL TRAIL (Graceful fire)
      if (accel > 0.7) {
        const tGrad = ctx.createLinearGradient(x - half - stretch, y, x + half, y);
        tGrad.addColorStop(0, 'rgba(255, 100, 0, 0)');
        tGrad.addColorStop(1, 'rgba(255, 200, 0, 0.4)');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(x - half - 20 - stretch, y);
        ctx.lineTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.closePath();
        ctx.fill();
      }

      // 2. SLEEK AERODYNAMIC CORE (Needle shape)
      const hColor = e.flashTime > 0 ? C.COLORS.white : '#1a0000';
      ctx.fillStyle = hColor;
      ctx.beginPath();
      ctx.moveTo(x + half + 8, y);
      ctx.lineTo(x - half - 4 - stretch, y - half + 2);
      ctx.lineTo(x - half - 4 - stretch, y + half - 2);
      ctx.closePath();
      ctx.fill();

      // Golden Trim
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. PILOT'S GAZE (Steady white slit)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 2, y - 0.5, 6, 1);

      ctx.globalAlpha = 1;
      break;
    }

    case 'boss': {
      const breathe = Math.sin(time * 2) * 1;
      // Import floor from bosses module
      const bossFloor = (window as any).__bossFloor || 1;

      switch (bossFloor) {
        case 2: {
          // ═══ CELESTIAL GOLDEN HUNTER - O Caçador Divino ═══
          const float = Math.sin(time * 3) * 4;
          const spearPulse = Math.sin(time * 10) * 0.2 + 0.8;
          const capeMotion = Math.sin(time * 5) * 5;
          const powerLevel = Math.sin(time * 2) * 0.2 + 0.8;

          // Divine Golden Aura
          const divineGlow = ctx.createRadialGradient(x, y + float, 0, x, y + float, half + 30);
          divineGlow.addColorStop(0, `rgba(255, 215, 0, ${0.3 * powerLevel})`);
          divineGlow.addColorStop(0.5, `rgba(255, 150, 0, 0.1)`);
          divineGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
          ctx.fillStyle = divineGlow;
          ctx.fillRect(x - half - 30, y - half - 30 + float, s + 60, s + 60);

          // Ethereal Cape (Flowing energy)
          ctx.fillStyle = 'rgba(255, 180, 0, 0.4)';
          ctx.beginPath();
          ctx.moveTo(x - 2, y - half + float);
          ctx.bezierCurveTo(x - 15 - capeMotion, y + half + float, x - 5, y + half + 20 + float, x - 20, y + half + 25 + float);
          ctx.lineTo(x + 5, y + half + 10 + float);
          ctx.closePath();
          ctx.fill();

          // Body Structure - Agile Warrior Silhouette (Less Boxy)
          const armorColor = e.flashTime > 0 ? C.COLORS.white : '#e6b800';
          ctx.fillStyle = armorColor;

          // Torso (Curved armor)
          ctx.beginPath();
          ctx.moveTo(x, y - half + float);
          ctx.quadraticCurveTo(x + 8, y - half + 10 + float, x + 4, y + half - 2 + float);
          ctx.lineTo(x - 4, y + half - 2 + float);
          ctx.quadraticCurveTo(x - 8, y - half + 10 + float, x, y - half + float);
          ctx.fill();

          // Pauldrons (Shoulder pads)
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#ffcc00';
          ctx.beginPath();
          ctx.ellipse(x - 6, y - half + 5 + float, 5, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 6, y - half + 5 + float, 5, 3, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Helmet / Head
          ctx.fillStyle = armorColor;
          ctx.beginPath();
          ctx.ellipse(x, y - half - 2 + float, 5, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Energy Crest (Plume)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.moveTo(x, y - half - 8 + float);
          ctx.quadraticCurveTo(x + 10, y - half - 15 + float, x + 2, y - half - 4 + float);
          ctx.fill();

          // Eyes of Light
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 3, y - half + 1 + float, 2, 2);
          ctx.fillRect(x + 1, y - half + 1 + float, 2, 2);

          // ═══ THE GOLDEN ENERGY SPEAR ═══
          const spearX = x + 12;
          const spearY = y + float;
          const spearLen = 45;

          // Spear shadow/glow
          ctx.strokeStyle = `rgba(255, 200, 0, ${0.4 * spearPulse})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(spearX, spearY - spearLen / 2);
          ctx.lineTo(spearX, spearY + spearLen / 2);
          ctx.stroke();

          // Main Spear Shaft
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(spearX, spearY - spearLen / 2);
          ctx.lineTo(spearX, spearY + spearLen / 2);
          ctx.stroke();

          // Spear Tip (Energy blade)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(spearX, spearY - spearLen / 2 - 10);
          ctx.lineTo(spearX + 4, spearY - spearLen / 2);
          ctx.lineTo(spearX - 4, spearY - spearLen / 2);
          ctx.closePath();
          ctx.fill();

          // Sparking energy around spear
          for (let i = 0; i < 3; i++) {
            const sx = spearX + (Math.random() - 0.5) * 10;
            const sy = spearY - spearLen / 2 + Math.random() * spearLen;
            ctx.fillStyle = '#fffae6';
            ctx.fillRect(sx, sy, 2, 2);
          }

          // Floating shards of light
          for (let i = 0; i < 5; i++) {
            const ang = (time * 2 + i) % (Math.PI * 2);
            const dist = half + 15 + Math.sin(time + i) * 5;
            const px = x + Math.cos(ang) * dist;
            const py = y + Math.sin(ang) * dist + float;
            ctx.fillStyle = `rgba(255, 255, 200, ${0.6})`;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(time + i);
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
          }

          break;
        }
        case 3: {
          // ═══ THE SOUL SOVEREIGN (THE INVOKER) ═══
          const float = Math.sin(time * 3) * 6;
          const power = Math.sin(time * 5) * 0.2 + 0.8;
          const pulse = Math.sin(time * 2) * 0.3 + 0.7;
          const magicSpin = time * 1.5;

          // 1. DARK ENERGY VORTEX (Center presence)
          const vortexGrad = ctx.createRadialGradient(x, y + float, 0, x, y + float, half + 20);
          vortexGrad.addColorStop(0, `rgba(80, 0, 160, ${0.4 * power})`);
          vortexGrad.addColorStop(0.5, `rgba(40, 0, 80, ${0.2 * pulse})`);
          vortexGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = vortexGrad;
          ctx.beginPath();
          ctx.arc(x, y + float, half + 45, 0, Math.PI * 2);
          ctx.fill();

          // 2. MYSTICAL AURA (Invoker presence)
          ctx.save();
          ctx.translate(x, y + float);
          for (let i = 0; i < 4; i++) {
            const rot = magicSpin + (i * Math.PI / 2);
            ctx.rotate(rot);
            const grad = ctx.createLinearGradient(0, 0, 0, half + 40);
            grad.addColorStop(0, `rgba(120, 40, 255, ${0.35 * pulse})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.quadraticCurveTo(0, half + 50, 14, 0);
            ctx.fill();
          }
          ctx.restore();

          // 3. REGAL SILHOUETTE (Intercalating Black and Purple)
          const hoodColor = e.flashTime > 0 ? C.COLORS.white : '#05000a';
          const robeColor = e.flashTime > 0 ? C.COLORS.white : '#1a0033'; // Dark purple instead of pure black
          ctx.fillStyle = robeColor;

          // More Elegant Hood and Tapered Robes
          ctx.beginPath();
          ctx.moveTo(x - half - 10, y + half + 25 + float);
          ctx.quadraticCurveTo(x - half - 18, y - half + float, x, y - half - 35 + float);
          ctx.quadraticCurveTo(x + half + 18, y - half + float, x + half + 10, y + half + 25 + float);
          ctx.quadraticCurveTo(x, y + half + 20 + float, x - half - 10, y + half + 25 + float);
          ctx.fill();

          // Inner Hood (Deep black for mystery)
          ctx.fillStyle = hoodColor;
          ctx.beginPath();
          ctx.moveTo(x - 12, y - half + 5 + float);
          ctx.quadraticCurveTo(x, y - half - 25 + float, x + 12, y - half + 5 + float);
          ctx.lineTo(x, y - half + 15 + float);
          ctx.closePath();
          ctx.fill();

          // Inner Robe Flow (Vibrant purple shadow folds)
          ctx.strokeStyle = `rgba(180, 50, 255, ${0.6 * pulse})`;
          ctx.lineWidth = 1.5;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * 5, y - half + 10 + float);
            ctx.quadraticCurveTo(x + i * 12, y + half + 15 + float, x + i * 8, y + half + 40 + float);
            ctx.stroke();
          }

          // 4. SHOULDER MANTLE (Purple-Gold Contrast)
          ctx.strokeStyle = `rgba(220, 180, 255, ${0.7 * pulse})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x - half - 15, y + float);
          ctx.quadraticCurveTo(x, y - 22 + float, x + half + 15, y + float);
          ctx.stroke();

          // 5. THE CROWN OF COMMAND (Controlled shards)
          ctx.fillStyle = `rgba(200, 100, 255, ${power})`;
          for (let i = 0; i < 6; i++) {
            const shardAng = (i / 6) * Math.PI - Math.PI;
            const dist = 26 + Math.sin(time * 3 + i) * 6;
            const sx = x + Math.cos(shardAng) * dist;
            const sy = y - half - 22 + Math.sin(shardAng) * 12 + float;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(shardAng + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();

            // Shard glow (Purple)
            ctx.fillStyle = `rgba(220, 150, 255, ${0.4 * power})`;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 6. FLOATING SOUL RUNES (Vibrant Purple)
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(180, 100, 255, ${0.8 * pulse})`;
          const runes = ['Ω', '†', '∆', 'Ψ', 'Ϙ', 'Ѫ'];
          for (let i = 0; i < runes.length; i++) {
            const rAng = -magicSpin * 0.8 + (i * Math.PI * 2 / runes.length);
            const rx = x + Math.cos(rAng) * (half + 45);
            const ry = y + Math.sin(rAng) * 30 + float;
            ctx.fillText(runes[i], rx, ry);

            // Rune glow aura (Purple)
            ctx.fillStyle = `rgba(150, 50, 255, ${0.15 * pulse})`;
            ctx.beginPath();
            ctx.arc(rx, ry - 3, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(180, 100, 255, ${0.8 * pulse})`;
          }

          // 7. THE COLD GAZE (Eerie White-Purple)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 7, y - half - 5 + float, 2, 10);
          ctx.fillRect(x + 5, y - half - 5 + float, 2, 10);

          // Eye glow (Purple)
          const eyeG = ctx.createRadialGradient(x, y - half + float, 0, x, y - half + float, 20);
          eyeG.addColorStop(0, `rgba(180, 50, 255, ${0.3 * pulse})`);
          eyeG.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = eyeG;
          ctx.fillRect(x - 20, y - half - 15 + float, 40, 30);

          // 8. SOUL ORBS (Orbital control)
          for (let i = 0; i < 3; i++) {
            const orbAng = magicSpin + (i * Math.PI * 2 / 3);
            const orbitRadX = half + 55;
            const orbitRadY = 20;
            const ox = x + Math.cos(orbAng) * orbitRadX;
            const oy = y + Math.sin(orbAng) * orbitRadY + float;

            // Orb Core (Vibrant Purple)
            const orbG = ctx.createRadialGradient(ox, oy, 0, ox, oy, 8);
            orbG.addColorStop(0, '#ffffff');
            orbG.addColorStop(0.3, `rgba(200, 50, 255, ${power})`);
            orbG.addColorStop(1, 'rgba(80, 0, 120, 0)');
            ctx.fillStyle = orbG;
            ctx.beginPath();
            ctx.arc(ox, oy, 7 + Math.sin(time * 10 + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Energy Trail (Purple)
            ctx.strokeStyle = `rgba(150, 50, 255, ${0.25 * power})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(x, y + float);
            ctx.stroke();
            ctx.setLineDash([]);

            // Purple shadow particles
            if (Math.random() < 0.4) {
              ctx.fillStyle = 'rgba(100, 0, 200, 0.7)';
              ctx.fillRect(ox + (Math.random() - 0.5) * 8, oy + Math.random() * 12, 2, 2);
            }
          }

          break;
        }
        case 4: {
          // O FANTASMA — SPECTRAL REAPER (Ceifador das Almas)
          const gFloat = Math.sin(time * 6 + e.x) * 4;
          const deathPulse = Math.sin(time * 4) * 0.3 + 0.7;
          const reap = Math.sin(time * 3) * 0.4;

          ctx.globalAlpha = 0.95;

          // Death realm aura (portal to afterlife)
          for (let layer = 0; layer < 5; layer++) {
            const realmSize = half + 24 + layer * 6;
            const realmAlpha = (0.18 - layer * 0.03) * deathPulse;
            const realmGrad = ctx.createRadialGradient(x, y + gFloat, half, x, y + gFloat, realmSize);
            realmGrad.addColorStop(0, `rgba(0, 180, 150, ${realmAlpha})`);
            realmGrad.addColorStop(0.6, `rgba(0, 120, 100, ${realmAlpha * 0.6})`);
            realmGrad.addColorStop(1, 'rgba(0, 80, 70, 0)');
            ctx.fillStyle = realmGrad;
            ctx.fillRect(x - realmSize, y - realmSize + gFloat, realmSize * 2, realmSize * 2);
          }

          // Soul vortex (spirits being reaped)
          for (let i = 0; i < 10; i++) {
            const soulAngle = time * 3 + (i * Math.PI * 2 / 10);
            const soulRadius = half + 12 + Math.sin(time * 5 + i) * 3;
            const sx = x + Math.cos(soulAngle) * soulRadius;
            const sy = y + Math.sin(soulAngle) * (soulRadius * 0.5) + gFloat;
            ctx.fillStyle = `rgba(100, 255, 230, ${0.4 * deathPulse})`;
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
          }

          // Flowing spectral robes (death shroud)
          ctx.fillStyle = e.flashTime > 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 170, 150, 0.7)';
          ctx.beginPath();
          ctx.moveTo(x - half - 3, y - half + gFloat);
          ctx.lineTo(x + half + 3, y - half + gFloat);
          ctx.quadraticCurveTo(x + half + 5, y + gFloat, x + half + 4, y + half + 7 + gFloat);
          ctx.lineTo(x - half - 4, y + half + 7 + gFloat);
          ctx.quadraticCurveTo(x - half - 5, y + gFloat, x - half - 3, y - half + gFloat);
          ctx.fill();

          // Robe ethereal wisps (flowing tendrils)
          ctx.strokeStyle = e.flashTime > 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 200, 180, 0.5)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const wx = x - 9 + i * 3.5 + Math.sin(time * 5 + i * 0.8) * 4;
            const tendrilLength = 10 + i * 1.5;
            ctx.beginPath();
            ctx.moveTo(wx, y + half + gFloat);
            ctx.quadraticCurveTo(
              wx + Math.sin(time * 6 + i) * 3, y + half + gFloat + tendrilLength / 2,
              wx + Math.sin(time * 4 + i) * 5, y + half + gFloat + tendrilLength
            );
            ctx.stroke();
          }

          // Main spectral body (translucent)
          const bodyGrad = ctx.createRadialGradient(x, y + gFloat, 0, x, y + gFloat, half + 1);
          bodyGrad.addColorStop(0, e.flashTime > 0 ? C.COLORS.white : 'rgba(120, 255, 240, 0.8)');
          bodyGrad.addColorStop(0.6, e.flashTime > 0 ? C.COLORS.white : 'rgba(0, 200, 180, 0.6)');
          bodyGrad.addColorStop(1, 'rgba(0, 150, 140, 0.3)');
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.arc(x, y + gFloat, half + 1, 0, Math.PI * 2);
          ctx.fill();

          // Hooded skull (grim reaper)
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : 'rgba(0, 100, 90, 0.9)';
          ctx.beginPath();
          ctx.arc(x, y - half + 2 + gFloat, half + 1, Math.PI * 0.9, Math.PI * 2.1);
          ctx.fill();

          // Deep void within hood
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(x - half + 2, y - half + 2 + gFloat, s - 4, 6);

          // Haunting cyan eyes (death stare)
          ctx.fillStyle = `rgba(100, 255, 255, ${deathPulse})`;
          ctx.fillRect(x - 5, y - half + 4 + gFloat, 3, 3);
          ctx.fillRect(x + 3, y - half + 4 + gFloat, 3, 3);

          ctx.fillStyle = `rgba(0, 255, 220, ${deathPulse * 0.7})`;
          ctx.fillRect(x - 7, y - half + 3 + gFloat, 7, 5);
          ctx.fillRect(x + 1, y - half + 3 + gFloat, 7, 5);

          // MASSIVE SCYTHE (signature weapon)
          const scytheHandle = s + 18;
          const scytheX = x - half - 8;

          // Scythe handle (long staff)
          ctx.fillStyle = '#0a2020';
          ctx.fillRect(scytheX, y - half - 8 + gFloat + reap, 3, scytheHandle);

          // Handle decorations
          ctx.fillStyle = '#1a4040';
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(scytheX - 1, y - half - 6 + i * 5 + gFloat, 5, 2);
          }

          // Scythe blade (curved death blade)
          const bladeY = y - half - 10 + gFloat + reap;
          ctx.fillStyle = `rgba(50, 200, 180, ${deathPulse * 0.9})`;

          // Outer blade glow
          ctx.beginPath();
          ctx.moveTo(scytheX + 1.5, bladeY);
          ctx.quadraticCurveTo(scytheX + 15, bladeY - 8, scytheX + 20, bladeY - 6);
          ctx.quadraticCurveTo(scytheX + 16, bladeY - 3, scytheX + 1.5, bladeY + 2);
          ctx.fill();

          // Inner blade (sharper)
          ctx.fillStyle = `rgba(150, 255, 240, ${deathPulse})`;
          ctx.beginPath();
          ctx.moveTo(scytheX + 1.5, bladeY);
          ctx.quadraticCurveTo(scytheX + 14, bladeY - 7, scytheX + 18, bladeY - 5);
          ctx.quadraticCurveTo(scytheX + 15, bladeY - 2, scytheX + 1.5, bladeY + 1);
          ctx.fill();

          // Blade edge highlight (deadly)
          ctx.strokeStyle = `rgba(200, 255, 255, ${deathPulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(scytheX + 18, bladeY - 5);
          ctx.lineTo(scytheX + 19, bladeY - 4);
          ctx.stroke();

          // Soul particles around scythe
          for (let i = 0; i < 5; i++) {
            const px = scytheX + 10 + (Math.random() - 0.5) * 12;
            const py = bladeY + (Math.random() - 0.5) * 8;
            ctx.fillStyle = `rgba(100, 255, 230, ${0.5 + Math.random() * 0.5})`;
            ctx.fillRect(px, py, 1.5, 1.5);
          }

          // Phase rings (dimensional presence)
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = `rgba(0, 255, 220, ${(0.25 - i * 0.06) * deathPulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y + gFloat, half + 10 + i * 6 + Math.sin(time * 4 - i) * 3, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.globalAlpha = 1;
          break;
        }
        case 5: {
          // ═══ VOID-IRON DREADNOUGHT - O Destruidor de Mundos ═══
          const titanPower = Math.sin(time * 3.5) * 0.3 + 0.7;
          const charge = e.aiState === 'charge';
          const slam = Math.sin(time * 10) * (charge ? 2 : 0.5);
          const corePulse = Math.sin(time * 8) * 0.3 + 0.7;

          // Industrial War Aura
          for (let layer = 0; layer < 5; layer++) {
            const auraSize = half + 25 + layer * 8;
            const auraAlpha = (0.15 - layer * 0.03) * titanPower;
            const ironGrad = ctx.createRadialGradient(x, y + breathe, 0, x, y + breathe, auraSize);
            ironGrad.addColorStop(0, `rgba(100, 50, 0, ${auraAlpha})`);
            ironGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = ironGrad;
            ctx.fillRect(x - auraSize, y - auraSize + breathe, auraSize * 2, auraSize * 2);
          }

          // EXHAUST PIPES (Vapor/Sparks)
          ctx.fillStyle = '#222222';
          // Left Pipe
          ctx.fillRect(x - half - 10, y - half - 5 + breathe, 6, 15);
          // Right Pipe
          ctx.fillRect(x + half + 4, y - half - 5 + breathe, 6, 15);

          // Sparks from pipes
          for (let i = 0; i < 6; i++) {
            const sx = x - half - 7 + (Math.random() - 0.5) * 4;
            const sy = y - half - 10 + breathe - (time * 20 + i * 10) % 30;
            ctx.fillStyle = `rgba(255, 100, 0, ${Math.random()})`;
            ctx.fillRect(sx, sy, 2, 2);
          }

          // ASYMMETRICAL TITAN SILHOUETTE
          const plateColor = e.flashTime > 0 ? C.COLORS.white : '#333333';
          const jointColor = '#1a1a1a';
          ctx.fillStyle = plateColor;

          // Waist (Thin center)
          ctx.fillRect(x - 6, y + 2 + breathe, 12, 10);

          // Massive Torso / Chest Plate (Hexagonal)
          ctx.beginPath();
          ctx.moveTo(x - 12, y - half + 5 + breathe);
          ctx.lineTo(x + 12, y - half + 5 + breathe);
          ctx.lineTo(x + 18, y + 2 + breathe);
          ctx.lineTo(x - 18, y + 2 + breathe);
          ctx.closePath();
          ctx.fill();

          // HUGE PAULDRONS (Shoulders)
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#444444';
          // Right Pauldron (The Heavy Arm)
          ctx.beginPath();
          ctx.arc(x + 18, y - half + 5 + breathe, 12, 0, Math.PI * 2);
          ctx.fill();
          // Left Pauldron
          ctx.beginPath();
          ctx.arc(x - 18, y - half + 5 + breathe, 10, 0, Math.PI * 2);
          ctx.fill();

          // pauldrons trim
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 2;
          ctx.stroke();

          // THE NUCLEAR FUSION CORE
          const coreGlow = ctx.createRadialGradient(x, y - 5 + breathe, 0, x, y - 5 + breathe, 10);
          coreGlow.addColorStop(0, `rgba(0, 200, 255, ${corePulse})`);
          coreGlow.addColorStop(0.5, `rgba(0, 100, 255, 0.5)`);
          coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = coreGlow;
          ctx.beginPath();
          ctx.arc(x, y - 5 + breathe, 8, 0, Math.PI * 2);
          ctx.fill();
          // Core center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y - 5 + breathe, 3 * corePulse, 0, Math.PI * 2);
          ctx.fill();

          // Mechanical Arms
          ctx.fillStyle = jointColor;
          // Right Crushing Arm
          ctx.fillRect(x + 22, y - half + 10 + breathe + slam, 8, 25);
          ctx.fillStyle = plateColor;
          ctx.fillRect(x + 20, y - half + 30 + breathe + slam, 12, 10); // Massive Fist

          // Left Support Arm
          ctx.fillStyle = jointColor;
          ctx.fillRect(x - 28, y - half + 10 + breathe, 8, 20);
          ctx.fillStyle = plateColor;
          ctx.beginPath(); // Shield Arm
          ctx.moveTo(x - 32, y - half + 20 + breathe);
          ctx.lineTo(x - 18, y - half + 20 + breathe);
          ctx.lineTo(x - 20, y - half + 40 + breathe);
          ctx.lineTo(x - 30, y - half + 40 + breathe);
          ctx.closePath();
          ctx.fill();

          // HEAD - Armored visor
          ctx.fillStyle = '#222222';
          ctx.beginPath();
          ctx.ellipse(x, y - half - 5 + breathe + slam, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Visor Light
          ctx.fillStyle = charge ? '#ff0000' : '#00ccff';
          ctx.fillRect(x - 4, y - half - 6 + breathe + slam, 8, 2);

          // Leg Stance (Mechanical legs)
          ctx.fillStyle = jointColor;
          ctx.fillRect(x - 12, y + 12 + breathe, 6, 12);
          ctx.fillRect(x + 6, y + 12 + breathe, 6, 12);
          ctx.fillStyle = plateColor;
          ctx.fillRect(x - 15, y + 20 + breathe, 8, 5);
          ctx.fillRect(x + 7, y + 20 + breathe, 8, 5);

          break;
        }
        case 6: {
          // ═══ THE VOID SINGULARITY - O Pesadelo Final ═══
          const madness = Math.sin(time * 4) * 0.3 + 0.7;
          const shiftX = Math.sin(time * 2) * 5;
          const shiftY = Math.cos(time * 3) * 5;

          // Event Horizon Aura (Deep Space Distortion)
          for (let layer = 0; layer < 6; layer++) {
            const auraSize = half + 30 + layer * 10;
            const auraAlpha = (0.25 - layer * 0.04) * madness;
            const voidGrad = ctx.createRadialGradient(x + shiftX, y + shiftY + breathe, 0, x + shiftX, y + shiftY + breathe, auraSize);
            voidGrad.addColorStop(0, `rgba(20, 0, 40, ${auraAlpha})`);
            voidGrad.addColorStop(0.7, `rgba(10, 0, 20, ${auraAlpha * 0.5})`);
            voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = voidGrad;
            ctx.beginPath();
            ctx.arc(x + shiftX, y + shiftY + breathe, auraSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // REALITY SHARDS (Floating crystalline fragments)
          for (let i = 0; i < 10; i++) {
            const orbitAngle = time * 1.5 + i * (Math.PI * 2 / 10);
            const orbitRad = s + 10 + Math.sin(time * 3 + i) * 10;
            const sx = x + Math.cos(orbitAngle) * orbitRad;
            const sy = y + Math.sin(orbitAngle) * orbitRad * 0.5 + breathe;

            ctx.fillStyle = i % 2 === 0 ? 'rgba(100, 0, 255, 0.6)' : 'rgba(255, 0, 100, 0.6)';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 5);
            ctx.lineTo(sx + 3, sy);
            ctx.lineTo(sx, sy + 5);
            ctx.lineTo(sx - 3, sy);
            ctx.closePath();
            ctx.fill();
          }

          // WRITHING DARK TENTACLES (More organic limbs)
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time;
            const length = s + 15 + Math.sin(time * 4 + i) * 10;
            const controlX = x + Math.cos(angle + 0.5) * (length / 2);
            const controlY = y + Math.sin(angle + 0.5) * (length / 2) + breathe;
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length + breathe;

            ctx.strokeStyle = `rgba(40, 0, 60, ${0.8 * madness})`;
            ctx.lineWidth = 4 - (i % 3);
            ctx.beginPath();
            ctx.moveTo(x + shiftX, y + shiftY + breathe);
            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            ctx.stroke();

            // Scurrying eyes on tentacles
            if (i % 3 === 0) {
              ctx.fillStyle = `rgba(255, 0, 50, ${madness})`;
              ctx.beginPath();
              ctx.arc(controlX, controlY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // THE SINGULARITY CORE (The Black Hole)
          const coreSize = half + 5;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x + shiftX, y + shiftY + breathe, coreSize, 0, Math.PI * 2);
          ctx.fill();

          // White Light Ring (Accretion Disk)
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * madness})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x + shiftX, y + shiftY + breathe, coreSize + 2, time * 2, time * 2 + Math.PI * 1.5);
          ctx.stroke();

          // ═══ MANY EYES OF THE VOID ═══
          for (let i = 0; i < 6; i++) {
            const eyeAng = time * 0.8 + i * (Math.PI / 3);
            const eyeDist = coreSize * 0.6;
            const ex = x + shiftX + Math.cos(eyeAng) * eyeDist;
            const ey = y + shiftY + Math.sin(eyeAng) * eyeDist + breathe;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(ex, ey, 3, 1.5, eyeAng, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(ex, ey, 1, 0, Math.PI * 2);
            ctx.fill();
          }

          // Final Void Resonance
          for (let i = 0; i < 3; i++) {
            const rSize = s + i * 15 + Math.sin(time * 5) * 5;
            ctx.strokeStyle = `rgba(150, 0, 255, ${0.15 - i * 0.05})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + shiftX, y + shiftY + breathe, rSize, 0, Math.PI * 2);
            ctx.stroke();
          }

          break;
        }
        default: {
          // Floor 1: SOMBRA FAMINTA — DEMONIC COLOSSUS
          // A powerful beastial silhouette that breaks the boxy look with curves and asymmetry
          const shadowPulse = Math.sin(time * 3) * 0.3 + 0.7;
          const roar = Math.sin(time * 8) * (e.flashTime > 0 ? 2 : 0.8);
          const beastFloat = breathe + roar * 0.5;

          // 1. VOID AZURE AURA
          for (let layer = 0; layer < 6; layer++) {
            const auraSize = half + 30 + layer * 10;
            const auraAlpha = (0.24 - layer * 0.04) * shadowPulse;
            const darkAura = ctx.createRadialGradient(x, y + beastFloat, half, x, y + beastFloat, auraSize);
            darkAura.addColorStop(0, `rgba(20, 60, 180, ${auraAlpha})`);
            darkAura.addColorStop(0.6, `rgba(10, 20, 80, ${auraAlpha * 0.5})`);
            darkAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = darkAura;
            ctx.beginPath();
            ctx.arc(x, y + beastFloat, auraSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. SHADOW TENDRILS (Breaking the bottom flat edge)
          ctx.strokeStyle = '#00081a';
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const tx = x - half + (i * s / 7);
            const ty = y + half + beastFloat;
            const tLen = 12 + Math.sin(time * 5 + i) * 8;
            ctx.beginPath();
            ctx.moveTo(tx, ty - 5);
            ctx.quadraticCurveTo(tx + Math.sin(time * 4 + i) * 10, ty + tLen / 2, tx, ty + tLen);
            ctx.stroke();
          }

          // 3. HUNTER'S HUNCHED BODY (Organic & Powerful - Deep Blue)
          const bodyColor = e.flashTime > 0 ? C.COLORS.white : '#00051a';
          ctx.fillStyle = bodyColor;

          ctx.beginPath();
          // Drawing a more beastial, hunched silhouette
          ctx.moveTo(x - half - 8, y + half + 5 + beastFloat); // Bottom left
          ctx.quadraticCurveTo(x - half - 15, y, x - half, y - half - 5 + beastFloat); // Left side to shoulder
          ctx.quadraticCurveTo(x, y - half - 20 + beastFloat, x + half + 5, y - half + beastFloat); // Hunch to right shoulder
          ctx.quadraticCurveTo(x + half + 12, y + half, x + half + 2, y + half + 5 + beastFloat); // Right side to bottom
          ctx.bezierCurveTo(x, y + half + 15 + beastFloat, x - half, y + half + 10 + beastFloat, x - half - 8, y + half + 5 + beastFloat);
          ctx.fill();

          // 4. SCARRED ARMOR PLATES (Asymmetric Blue Armor)
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#081a33';

          // Main Chest Plate (Jagged)
          ctx.beginPath();
          ctx.moveTo(x - 12, y - 5 + beastFloat);
          ctx.lineTo(x + 8, y - 8 + beastFloat);
          ctx.lineTo(x + 15, y + 10 + beastFloat);
          ctx.lineTo(x - 6, y + 15 + beastFloat);
          ctx.closePath();
          ctx.fill();

          // Armor Detail (Azure Core in chest)
          const coreG = ctx.createRadialGradient(x + 2, y + 5 + beastFloat, 0, x + 2, y + 5 + beastFloat, 8);
          coreG.addColorStop(0, `rgba(0, 150, 255, ${shadowPulse})`);
          coreG.addColorStop(1, 'rgba(0, 20, 80, 0)');
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(x + 2, y + 5 + beastFloat, 6, 0, Math.PI * 2);
          ctx.fill();

          // 5. ASYMMETRIC HORNS (Dark Metallic Blue)
          ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#1a2433';

          // Left Horn (Large, curved upwards)
          ctx.beginPath();
          ctx.moveTo(x - 10, y - half - 10 + beastFloat);
          ctx.quadraticCurveTo(x - 25, y - half - 25 + beastFloat, x - 15, y - half - 45 + beastFloat);
          ctx.quadraticCurveTo(x - 5, y - half - 25 + beastFloat, x - 2, y - half - 12 + beastFloat);
          ctx.fill();

          // Right Horn (Broken, jagged stub)
          ctx.beginPath();
          ctx.moveTo(x + 8, y - half - 8 + beastFloat);
          ctx.lineTo(x + 20, y - half - 15 + beastFloat);
          ctx.lineTo(x + 15, y - half - 5 + beastFloat);
          ctx.lineTo(x + 10, y - half + 2 + beastFloat);
          ctx.closePath();
          ctx.fill();

          // 6. THE COLD GAZE (Eerie Light Blue eyes)
          const eyeH = 2 + Math.sin(time * 12) * 1;
          ctx.fillStyle = '#00ccff';
          // Large main eyes
          ctx.beginPath();
          ctx.ellipse(x - 8, y - half + 5 + beastFloat, 5, eyeH, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 6, y - half + 4 + beastFloat, 4, eyeH, -0.1, 0, Math.PI * 2);
          ctx.fill();

          // Pupils (White/Cyan)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 9, y - half + 4 + beastFloat, 2, eyeH);
          ctx.fillRect(x + 5, y - half + 3 + beastFloat, 1.5, eyeH);

          // 7. BESTIAL JAW (Darkened blue teeth)
          ctx.fillStyle = '#00081a';
          ctx.beginPath();
          ctx.moveTo(x - 12, y + half + beastFloat + roar * 2);
          ctx.lineTo(x + 10, y + half + 2 + beastFloat + roar * 2);
          ctx.lineTo(x, y + half + 12 + beastFloat + roar * 2);
          ctx.closePath();
          ctx.fill();

          // Teeth glint
          ctx.fillStyle = '#ccdeff';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x - 6 + i * 5, y + half + 2 + beastFloat + roar * 2, 1.5, 3);
          }

          // 8. BLUE MIST & SPARKS
          if (Math.random() < 0.8) {
            const ex = x + (Math.random() - 0.5) * s * 1.5;
            const ey = y + (Math.random() - 0.5) * s + beastFloat;
            ctx.fillStyle = `rgba(100, 200, 255, ${0.4})`;
            ctx.fillRect(ex, ey, 2, 2);
          }

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
