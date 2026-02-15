import { PlayerState, EnemyState, ProjectileState, Particle, DungeonMap, DungeonRoom, Obstacle, ScreenEffect, Viewport } from './types';
import { HiddenTrap } from './traps';
import * as C from './constants';

// Render dungeon atmosphere in the viewport margins (beyond the 640x400 game area)
// This fills the "black bars" with stone wall textures so the arena feels immersive
export function renderViewportMargins(ctx: CanvasRenderingContext2D, time: number, vp: Viewport) {
  const { gox, goy, rw, rh } = vp;
  const ts = C.TILE_SIZE;
  
  // Calculate tile range that covers the full viewport (in game-translated coords)
  const startCol = Math.floor(-gox / ts) - 1;
  const endCol = Math.ceil((rw - gox) / ts) + 1;
  const startRow = Math.floor(-goy / ts) - 1;
  const endRow = Math.ceil((rh - goy) / ts) + 1;
  
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      // Skip tiles that are inside the game area (those are rendered by renderFloor)
      if (row >= 0 && row < C.dims.rr && col >= 0 && col < C.dims.rc) continue;
      
      const x = col * ts;
      const y = row * ts;
      
      // Stone wall texture with variation
      const hash = ((row * 7 + col * 13) & 0xFF);
      const darkness = 0.6 + (hash % 10) * 0.02;
      const r = Math.floor(14 * darkness);
      const g = Math.floor(14 * darkness);
      const b = Math.floor(22 * darkness);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, ts, ts);
      
      // Stone brick lines
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = 'rgba(30, 30, 48, 0.4)';
        ctx.fillRect(x, y, ts, 1);
        ctx.fillRect(x, y, 1, ts);
      }
      
      // Random cracks
      if (hash % 11 === 0) {
        ctx.fillStyle = 'rgba(8, 8, 15, 0.5)';
        ctx.fillRect(x + 3, y + 5, 4, 1);
      }
      if (hash % 13 === 0) {
        ctx.fillStyle = 'rgba(8, 8, 15, 0.4)';
        ctx.fillRect(x + 8, y + 3, 1, 5);
      }
      
      // Occasional moss
      if (hash % 29 === 0) {
        ctx.fillStyle = 'rgba(20, 40, 20, 0.15)';
        ctx.fillRect(x + 2, y + ts - 4, 6, 3);
      }
    }
  }
}
import { roomKey, getCurrentRoom } from './dungeon';

export function renderFloor(ctx: CanvasRenderingContext2D, time: number) {
  for (let row = 0; row < C.dims.rr; row++) {
    for (let col = 0; col < C.dims.rc; col++) {
      const x = col * C.TILE_SIZE;
      const y = row * C.TILE_SIZE;
      const isEdge = row === 0 || row === C.dims.rr - 1 || col === 0 || col === C.dims.rc - 1;
      if (isEdge) {
        ctx.fillStyle = C.COLORS.wall;
        ctx.fillRect(x, y, C.TILE_SIZE, C.TILE_SIZE);
        ctx.fillStyle = C.COLORS.wallTop;
        ctx.fillRect(x, y, C.TILE_SIZE, 3);
        ctx.fillStyle = C.COLORS.wallEdge;
        ctx.fillRect(x, y + C.TILE_SIZE - 1, C.TILE_SIZE, 1);
        if ((row + col) % 3 === 0) {
          ctx.fillStyle = 'rgba(40, 40, 70, 0.5)';
          ctx.fillRect(x + 4, y + 5, 2, 2);
        }
        if ((row + col) % 5 === 0) {
          ctx.fillStyle = 'rgba(20, 20, 35, 0.5)';
          ctx.fillRect(x + 10, y + 8, 3, 1);
        }
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? C.COLORS.floor1 : C.COLORS.floor2;
        ctx.fillRect(x, y, C.TILE_SIZE, C.TILE_SIZE);
        // Floor cracks and blood splatters
        if ((row * 7 + col * 13) % 17 === 0) {
          ctx.fillStyle = 'rgba(25, 25, 35, 0.3)';
          ctx.fillRect(x + 3, y + 3, 2, 1);
        }
        if ((row * 11 + col * 3) % 23 === 0) {
          ctx.fillStyle = 'rgba(80, 20, 20, 0.1)';
          ctx.fillRect(x + 2, y + 5, 5, 5);
        }
        // Occasional bones
        if ((row * 17 + col * 11) % 37 === 0) {
          ctx.fillStyle = 'rgba(180, 170, 150, 0.12)';
          ctx.fillRect(x + 6, y + 8, 6, 2);
          ctx.fillRect(x + 8, y + 6, 2, 6);
        }
      }
    }
  }

  // Wall torches - dynamically placed along room edges
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
  for (const t of torchPositions) {
    // Torch light glow
    const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 25);
    g.addColorStop(0, `rgba(255, 150, 50, ${0.15 * flicker})`);
    g.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(t.x - 25, t.y - 25, 50, 50);
    // Torch body
    ctx.fillStyle = '#553311';
    ctx.fillRect(t.x - 1, t.y - 3, 3, 6);
    // Flame
    ctx.fillStyle = `rgba(255, ${140 + Math.floor(flicker * 40)}, 30, ${0.8 * flicker})`;
    ctx.fillRect(t.x - 1, t.y - 5, 3, 3);
    ctx.fillStyle = `rgba(255, 255, 100, ${0.5 * flicker})`;
    ctx.fillRect(t.x, t.y - 6, 1, 2);
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
        if (dir === 'north') { ctx.moveTo(cx, cy - arrowSize); ctx.lineTo(cx - arrowSize, cy + arrowSize/2); ctx.lineTo(cx + arrowSize, cy + arrowSize/2); }
        else if (dir === 'south') { ctx.moveTo(cx, cy + arrowSize); ctx.lineTo(cx - arrowSize, cy - arrowSize/2); ctx.lineTo(cx + arrowSize, cy - arrowSize/2); }
        else if (dir === 'west') { ctx.moveTo(cx - arrowSize, cy); ctx.lineTo(cx + arrowSize/2, cy - arrowSize); ctx.lineTo(cx + arrowSize/2, cy + arrowSize); }
        else { ctx.moveTo(cx + arrowSize, cy); ctx.lineTo(cx - arrowSize/2, cy - arrowSize); ctx.lineTo(cx - arrowSize/2, cy + arrowSize); }
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
        if (dir === 'north') { ctx.moveTo(cx, cy - arrowSize); ctx.lineTo(cx - arrowSize, cy + arrowSize/2); ctx.lineTo(cx + arrowSize, cy + arrowSize/2); }
        else if (dir === 'south') { ctx.moveTo(cx, cy + arrowSize); ctx.lineTo(cx - arrowSize, cy - arrowSize/2); ctx.lineTo(cx + arrowSize, cy - arrowSize/2); }
        else if (dir === 'west') { ctx.moveTo(cx - arrowSize, cy); ctx.lineTo(cx + arrowSize/2, cy - arrowSize); ctx.lineTo(cx + arrowSize/2, cy + arrowSize); }
        else { ctx.moveTo(cx + arrowSize, cy); ctx.lineTo(cx - arrowSize/2, cy - arrowSize); ctx.lineTo(cx - arrowSize/2, cy + arrowSize); }
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
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(o.x + 2, o.y + 2, o.w, o.h);
    // Body
    ctx.fillStyle = C.COLORS.obstacle;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = C.COLORS.obstacleTop;
    ctx.fillRect(o.x, o.y, o.w, 3);
    // Detail
    ctx.fillStyle = 'rgba(40, 40, 65, 0.4)';
    ctx.fillRect(o.x + 3, o.y + 5, 2, 2);
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
  const visible = p.invincibleTime <= 0 || Math.floor(p.invincibleTime * 20) % 2 === 0;
  if (!visible) return;

  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
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

  // === MELEE SWING (outside translate) ===
  if (p.meleeAttacking) {
    const range = C.MELEE_RANGE * p.areaMultiplier;
    const swingProgress = 1 - (p.meleeTimer / 0.15);
    const startAngle = p.meleeAngle - C.MELEE_ARC / 2;
    const currentAngle = startAngle + C.MELEE_ARC * swingProgress;

    // Slash arc glow
    const slashAlpha = 0.6 * (1 - swingProgress);
    ctx.strokeStyle = `rgba(150, 210, 255, ${slashAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, range, startAngle, currentAngle);
    ctx.stroke();

    // Inner bright line
    ctx.strokeStyle = `rgba(220, 240, 255, ${slashAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, range - 2, startAngle, currentAngle);
    ctx.stroke();

    // Slash fill
    ctx.fillStyle = `rgba(85, 153, 255, ${0.25 * (1 - swingProgress)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, startAngle, currentAngle);
    ctx.closePath();
    ctx.fill();

    // Tip spark
    const tipX = x + Math.cos(currentAngle) * range;
    const tipY = y + Math.sin(currentAngle) * range;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
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
          // Wings
          ctx.fillStyle = C.COLORS.bossDark;
          ctx.fillRect(x - half - 6, y - 4 + breathe, 5, 8);
          ctx.fillRect(x + half + 1, y - 4 + breathe, 5, 8);
          // Eyes
          ctx.fillStyle = e.aiState === 'attack' ? '#ff0000' : '#ffff00';
          ctx.fillRect(x - 6, y - 4 + breathe, 4, 3);
          ctx.fillRect(x + 3, y - 4 + breathe, 4, 3);
          // Mouth
          ctx.fillStyle = C.COLORS.bossDark;
          ctx.fillRect(x - 4, y + 3 + breathe, 8, 2);
          break;
        }
      }
      // Boss aura
      ctx.fillStyle = 'rgba(255, 50, 50, 0.08)';
      ctx.beginPath();
      ctx.arc(x, y + breathe, half + 15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  // Reset alpha for wraith
  if (e.type === 'wraith') ctx.globalAlpha = 1;

  // HP bar
  if (e.hp < e.maxHp) {
    const barW = Math.max(s + 4, 12);
    const barH = 2;
    const bx = x - barW / 2;
    const by = y - half - 7;
    ctx.fillStyle = C.COLORS.hpBg;
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = e.hp / e.maxHp > 0.3 ? C.COLORS.hpFill : '#ff6600';
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
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
      // Black outline for contrast
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(p.text, Math.floor(p.x), Math.floor(p.y));
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, Math.floor(p.x), Math.floor(p.y));
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
  if (isVendorRoom) {
    // Vendor room: very bright, warm light
    const gradient = ctx.createRadialGradient(px, py, radius * 0.5, px, py, radius * 1.5);
    gradient.addColorStop(0, 'rgba(5, 3, 10, 0)');
    gradient.addColorStop(0.6, 'rgba(5, 3, 10, 0.1)');
    gradient.addColorStop(1, 'rgba(5, 3, 10, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
    return;
  }
  const gradient = ctx.createRadialGradient(px, py, radius * 0.15, px, py, radius);
  gradient.addColorStop(0, 'rgba(5, 3, 10, 0)');
  gradient.addColorStop(0.3, 'rgba(5, 3, 10, 0.3)');
  gradient.addColorStop(0.5, 'rgba(5, 3, 10, 0.65)');
  gradient.addColorStop(0.7, 'rgba(5, 3, 10, 0.88)');
  gradient.addColorStop(1, 'rgba(5, 3, 10, 0.97)');
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

  // --- HP Bar (top-left) ---
  const hpW = Math.round(100 * ms);
  const hpH = Math.round(10 * ms);
  const hpX = visLeft + 6;
  const hpY = visTop + 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(hpX, hpY, hpW + 4, hpH + 4);
  ctx.fillStyle = C.COLORS.hpBg;
  ctx.fillRect(hpX + 2, hpY + 2, hpW, hpH);
  const hpPct = player.hp / player.maxHp;
  ctx.fillStyle = hpPct > 0.3 ? C.COLORS.hpFill : '#ff6600';
  ctx.fillRect(hpX + 2, hpY + 2, hpW * hpPct, hpH);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpX + 2, hpY + 2, hpW, hpH);
  ctx.fillStyle = C.COLORS.white;
  ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(`${player.hp}/${player.maxHp}`, hpX + 5, hpY + 2 + Math.round(hpH * 0.75));
  ctx.fillText(`${player.hp}/${player.maxHp}`, hpX + 5, hpY + 2 + Math.round(hpH * 0.75));

  // --- XP Bar ---
  const xpY = hpY + hpH + 6;
  const xpH = Math.round(5 * ms);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(hpX, xpY, hpW + 4, xpH + 4);
  ctx.fillStyle = C.COLORS.xpBg;
  ctx.fillRect(hpX + 2, xpY + 2, hpW, xpH);
  ctx.fillStyle = C.COLORS.xpFill;
  ctx.fillRect(hpX + 2, xpY + 2, hpW * (player.xp / player.xpToNext), xpH);
  ctx.fillStyle = '#88ffaa';
  ctx.font = `500 ${Math.round(8 * ms)}px ${C.HUD_FONT}`;
  ctx.fillText('XP', hpX + 3, xpY + 2 + Math.round(xpH * 0.8));

  // --- Level Badge ---
  const lvlX = hpW + 14;
  const lvlW = Math.round(44 * ms);
  const lvlH = Math.round(20 * ms);
  ctx.fillStyle = 'rgba(20, 20, 60, 0.85)';
  ctx.fillRect(lvlX, hpY, lvlW, lvlH);
  ctx.strokeStyle = '#5599ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlX, hpY, lvlW, lvlH);
  ctx.fillStyle = '#aaccff';
  ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
  ctx.fillText(`Nv.${player.level}`, lvlX + 4, hpY + Math.round(lvlH * 0.7));

  // --- Floor indicator (top-right) ---
  const floorW = Math.round(84 * ms);
  const floorH = Math.round(18 * ms);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(visRight - floorW - 6, hpY, floorW, floorH);
  ctx.strokeStyle = '#aa8833';
  ctx.lineWidth = 1;
  ctx.strokeRect(visRight - floorW - 6, hpY, floorW, floorH);
  ctx.font = `500 ${Math.round(12 * ms)}px ${C.HUD_FONT}`;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(`Andar ${dungeon.floor}`, visRight - floorW - 2, hpY + Math.round(floorH * 0.72));
  ctx.fillStyle = '#ffddaa';
  ctx.fillText(`Andar ${dungeon.floor}`, visRight - floorW - 2, hpY + Math.round(floorH * 0.72));

  // --- Enemy counter ---
  const ecY = hpY + floorH + 2;
  const ecH = Math.round(16 * ms);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(visRight - floorW - 6, ecY, floorW, ecH);
  if (enemyCount > 0) {
    ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(`${enemyCount} inimigos`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75));
    ctx.fillStyle = '#ff6644';
    ctx.fillText(`${enemyCount} inimigos`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75));
  } else {
    ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(`Sala limpa!`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75));
    ctx.fillStyle = '#44ff66';
    ctx.fillText(`Sala limpa!`, visRight - floorW - 2, ecY + Math.round(ecH * 0.75));
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
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(objText, C.dims.gw / 2, 4 + Math.round(objBarH * 0.75));
    ctx.fillStyle = objColor;
    ctx.fillText(objText, C.dims.gw / 2, 4 + Math.round(objBarH * 0.75));
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
  const cellSize = 14;
  const gap = 6;
  const connW = 4; // corridor width
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
  const pad = 6;
  // On mobile landscape, move minimap to bottom-left to avoid button overlap
  const ox = isMobile ? visLeft + pad + 6 : visRight - mapW - pad - 6;
  const oy = visBottom - mapH - pad - (isMobile ? 38 : 22);

  // Background panel
  ctx.fillStyle = 'rgba(5, 5, 15, 0.82)';
  const panelX = ox - pad;
  const panelY = oy - pad - 12;
  const panelW = mapW + pad * 2;
  const panelH = mapH + pad * 2 + 12;
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 80, 120, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 4);
  ctx.stroke();

  // Title
  ctx.fillStyle = 'rgba(160, 160, 200, 0.7)';
  ctx.font = `500 7px ${C.HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`ANDAR ${dungeon.floor}`, panelX + panelW / 2, panelY + 9);
  ctx.textAlign = 'left';

  // Draw corridors first (connections between rooms)
  ctx.lineWidth = connW;
  for (const [, room] of dungeon.rooms) {
    const rx = ox + (room.gridX - minGX) * step + cellSize / 2;
    const ry = oy + (room.gridY - minGY) * step + cellSize / 2;
    const visited = room.visited;
    ctx.strokeStyle = visited ? 'rgba(60, 60, 90, 0.7)' : 'rgba(40, 40, 60, 0.3)';

    if (room.doors.east && dungeon.rooms.has(roomKey(room.gridX + 1, room.gridY))) {
      const neighbor = dungeon.rooms.get(roomKey(room.gridX + 1, room.gridY))!;
      const show = visited || neighbor.visited;
      if (show) {
        ctx.strokeStyle = (visited && neighbor.visited) ? 'rgba(60, 60, 90, 0.7)' : 'rgba(40, 40, 60, 0.3)';
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
        ctx.strokeStyle = (visited && neighbor.visited) ? 'rgba(60, 60, 90, 0.7)' : 'rgba(40, 40, 60, 0.3)';
        ctx.beginPath();
        ctx.moveTo(rx, ry + cellSize / 2);
        ctx.lineTo(rx, ry + cellSize / 2 + gap);
        ctx.stroke();
      }
    }
  }

  // Draw rooms
  for (const [key, room] of dungeon.rooms) {
    const isCurrent = key === dungeon.currentRoomKey;
    const rx = ox + (room.gridX - minGX) * step;
    const ry = oy + (room.gridY - minGY) * step;
    const cx = rx + cellSize / 2;
    const cy = ry + cellSize / 2;

    if (!room.visited) {
      // Show adjacent-to-visited rooms as dim outlines (fog of war reveal)
      let adjacentVisited = false;
      const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
      for (const d of dirs) {
        const nk = roomKey(room.gridX + d.dx, room.gridY + d.dy);
        const nr = dungeon.rooms.get(nk);
        if (nr && nr.visited) { adjacentVisited = true; break; }
      }
      if (adjacentVisited) {
        ctx.strokeStyle = 'rgba(80, 80, 110, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);
        ctx.setLineDash([]);
        // Question mark
        ctx.fillStyle = 'rgba(120, 120, 160, 0.4)';
        ctx.font = `500 8px ${C.HUD_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', cx, cy + 3);
        ctx.textAlign = 'left';
      }
      continue;
    }

    // Room fill color based on type & status
    let fillColor: string;
    let borderColor: string;
    if (isCurrent) {
      fillColor = 'rgba(85, 153, 255, 0.55)';
      borderColor = 'rgba(120, 180, 255, 0.9)';
    } else if (room.isBossRoom) {
      fillColor = room.cleared ? 'rgba(100, 40, 40, 0.5)' : 'rgba(200, 50, 50, 0.45)';
      borderColor = 'rgba(255, 80, 80, 0.7)';
    } else if (room.type === 'treasure') {
      fillColor = room.treasureCollected ? 'rgba(80, 70, 30, 0.4)' : 'rgba(200, 170, 50, 0.45)';
      borderColor = 'rgba(255, 210, 60, 0.7)';
    } else if (room.type === 'shrine') {
      fillColor = room.shrineUsed ? 'rgba(50, 30, 70, 0.4)' : 'rgba(130, 60, 200, 0.45)';
      borderColor = 'rgba(170, 100, 255, 0.7)';
    } else if (room.type === 'vendor') {
      fillColor = 'rgba(60, 120, 80, 0.45)';
      borderColor = 'rgba(100, 220, 140, 0.7)';
    } else if (room.type === 'trap') {
      fillColor = room.trapTriggered ? 'rgba(80, 30, 30, 0.4)' : 'rgba(200, 60, 50, 0.4)';
      borderColor = 'rgba(255, 100, 80, 0.6)';
    } else if (room.cleared) {
      fillColor = 'rgba(40, 80, 45, 0.45)';
      borderColor = 'rgba(70, 140, 80, 0.5)';
    } else {
      fillColor = 'rgba(60, 60, 80, 0.45)';
      borderColor = 'rgba(100, 100, 130, 0.5)';
    }

    // Fill
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    roundRect(ctx, rx, ry, cellSize, cellSize, 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.beginPath();
    roundRect(ctx, rx, ry, cellSize, cellSize, 2);
    ctx.stroke();

    // Room icon
    ctx.textAlign = 'center';
    ctx.font = `8px ${C.HUD_FONT}`;
    if (isCurrent) {
      // Player dot (pulsing)
      const pulse = Math.sin(Date.now() / 200) * 1.5 + 3.5;
      ctx.fillStyle = 'rgba(150, 200, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (room.isBossRoom) {
      ctx.fillStyle = room.cleared ? 'rgba(200, 100, 100, 0.5)' : 'rgba(255, 100, 80, 0.9)';
      ctx.fillText('💀', cx, cy + 3);
    } else if (room.type === 'treasure') {
      ctx.fillStyle = 'rgba(255, 220, 80, 0.9)';
      ctx.fillText(room.treasureCollected ? '·' : '◆', cx, cy + 3);
    } else if (room.type === 'shrine') {
      ctx.fillStyle = 'rgba(180, 120, 255, 0.9)';
      ctx.fillText(room.shrineUsed ? '·' : '✦', cx, cy + 3);
    } else if (room.type === 'vendor') {
      ctx.fillStyle = 'rgba(100, 255, 180, 0.9)';
      ctx.fillText('$', cx, cy + 3);
    } else if (room.type === 'trap') {
      ctx.fillStyle = 'rgba(255, 100, 70, 0.9)';
      ctx.fillText(room.trapTriggered ? '·' : '⚠', cx, cy + 3);
    } else if (room.cleared) {
      // Checkmark for cleared
      ctx.fillStyle = 'rgba(100, 200, 110, 0.6)';
      ctx.fillText('✓', cx, cy + 3);
    }
    ctx.textAlign = 'left';
  }

  // Legend at the bottom of the panel
  const legendY = panelY + panelH + 2;
  ctx.font = `5px ${C.HUD_FONT}`;
  const legends = [
    { color: 'rgba(85, 153, 255, 0.8)', label: 'VOCÊ' },
    { color: 'rgba(70, 140, 80, 0.8)', label: 'LIMPA' },
    { color: 'rgba(255, 80, 80, 0.8)', label: 'BOSS' },
    { color: 'rgba(255, 210, 60, 0.8)', label: 'TESOURO' },
    { color: 'rgba(100, 220, 140, 0.8)', label: 'LOJA' },
  ];
  let lx = panelX;
  for (const l of legends) {
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, legendY, 4, 4);
    ctx.fillStyle = 'rgba(150, 150, 180, 0.6)';
    ctx.fillText(l.label, lx + 6, legendY + 4);
    lx += ctx.measureText(l.label).width + 10;
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
