import { PlayerState, EnemyState, ProjectileState, Particle, DungeonMap, DungeonRoom, Obstacle, ScreenEffect, Viewport, WeaponType, Portal, EssenceCore } from './types';
import { HiddenTrap } from './traps';
import * as C from './constants';
import { getBrightness } from './brightness';
import { getBiome, Biome } from './biomes';
import { roomKey, getCurrentRoom } from './dungeon';

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
  const biome = getBiome(floor);

  // 1. FILL BACKGROUND
  ctx.fillStyle = biome.bgLayer2;
  ctx.fillRect(-gox, -goy, rw, rh);

  // 2. PARALLAX LAYER 2 (Furthest)
  ctx.fillStyle = biome.bgLayer1;
  const p2x = (-gox * 0.2) % 400;
  const p2y = (-goy * 0.2) % 400;

  for (let i = -1; i < Math.ceil(rw / 400) + 1; i++) {
    const x = i * 400 + p2x - gox;
    if (biome.theme === 'crystal') {
      // Sharp ice stalagmite silhouettes — NOT water, but frozen spires
      for (let s = 0; s < 6; s++) {
        const sx = x + s * 68 + ((s * 31) % 40);
        const sh = 60 + (s * 47) % 80;
        ctx.beginPath();
        ctx.moveTo(sx, rh - goy);
        ctx.lineTo(sx + 14, rh - goy - sh);
        ctx.lineTo(sx + 6, rh - goy - sh + 10);
        ctx.lineTo(sx + 26, rh - goy - sh);
        ctx.lineTo(sx + 34, rh - goy);
        ctx.fill();
      }
    } else if (biome.theme === 'volcano') {
      // Volcanic ridges
      ctx.beginPath();
      ctx.moveTo(x, rh - goy);
      ctx.quadraticCurveTo(x + 200, rh - goy - 200, x + 400, rh - goy);
      ctx.fill();
    } else {
      // Forest silhouettes
      ctx.fillRect(x + 50, rh - goy - 120, 30, 120);
      ctx.beginPath();
      ctx.arc(x + 65, rh - goy - 120, 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. PARALLAX LAYER 1 (Walls / Pillars)
  const ts = C.TILE_SIZE;
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

      // Main structural walls
      ctx.fillStyle = biome.wall;
      ctx.globalAlpha = 0.95 + (hash % 10) * 0.005;
      ctx.fillRect(x, y, ts, ts);
      ctx.globalAlpha = 1.0;

      // Vertical Pillar Details
      if (col % 6 === 0) {
        ctx.fillStyle = biome.wallTop;
        ctx.fillRect(x + 4, y, ts - 8, ts);
        ctx.fillStyle = biome.wallDetail;
        ctx.fillRect(x + 5, y, 1, ts);
      }

      // Biome decorative noise
      if (hash % 15 === 0) {
        ctx.fillStyle = biome.detail;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x + ts / 2, y + ts / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // ICE BIOME: Stalactite sprite on top-border wall rows
      if (biome.theme === 'crystal' && row < 0 && hash % 4 === 0) {
        const icicle = getSprite('/sprits-cenario-6.png');
        if (icicle.complete && icicle.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 + (hash % 10) * 0.03;
          ctx.drawImage(icicle, x - 2, y, ts + 4, ts * 1.5);
          ctx.restore();
        }
      }
    }
  }

  // 4. GOD RAYS (Volumetric Light)
  const rayAlpha = 0.05 + Math.sin(time * 0.4) * 0.02;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const rX = ((time * 20 + i * 250) % (rw + 400)) - 200 - gox;
    const rayGrad = ctx.createLinearGradient(rX, -goy, rX + 150, rh - goy);
    rayGrad.addColorStop(0, biome.rays.replace('0.1', rayAlpha.toString()));
    rayGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rX, -goy);
    ctx.lineTo(rX + 80, -goy);
    ctx.lineTo(rX + 250, rh - goy);
    ctx.lineTo(rX + 150, rh - goy);
    ctx.fill();
  }
  ctx.restore();

  // 5. ATMOSPHERIC FOG
  const fogGrad = ctx.createRadialGradient(C.dims.gw / 2, C.dims.gh / 2, 250, C.dims.gw / 2, C.dims.gh / 2, 700);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(1, biome.fog);
  ctx.fillStyle = fogGrad;
  ctx.fillRect(-gox, -goy, rw, rh);
}
// ── Floor Tile Sprite Cache ─────────────────────────────────
const _floorTileCache: Record<string, HTMLImageElement> = {};
function getFloorTile(src: string): HTMLImageElement {
  if (!_floorTileCache[src]) {
    const img = new Image();
    img.src = src;
    _floorTileCache[src] = img;
  }
  return _floorTileCache[src];
}

// Pre-load all floor tiles on module init
getFloorTile('/title.png');
getFloorTile('/title-2.png');
getFloorTile('/title-gelo.png');

export function renderFloor(ctx: CanvasRenderingContext2D, time: number, floor = 1) {
  const biome = getBiome(floor);
  const ts = C.TILE_SIZE;

  // Select tile set based on biome
  const isIce = biome.theme === 'crystal';

  // Tile variants — seamless repetition with subtle variation
  const tileA = isIce ? getFloorTile('/title-gelo.png') : getFloorTile('/title.png');
  const tileB = getFloorTile('/title-2.png'); // variation tile (used for all biomes)

  // Render each grid cell
  for (let row = 0; row < C.dims.rr; row++) {
    for (let col = 0; col < C.dims.rc; col++) {
      const x = col * ts;
      const y = row * ts;
      const isEdge = row === 0 || row === C.dims.rr - 1 || col === 0 || col === C.dims.rc - 1;

      if (isEdge) {
        // ── WALLS ─────────────────────────────────────────────
        ctx.fillStyle = biome.wall;
        ctx.fillRect(x, y, ts, ts);

        // Top wall architectural face
        if (row === 0) {
          ctx.fillStyle = biome.wallTop;
          ctx.fillRect(x, y, ts, 12);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(x, y, ts, 1);
          // Wall detail accent line
          ctx.fillStyle = biome.accentGlow.replace(/[\d.]+\)$/, '0.12)');
          ctx.fillRect(x, y + 11, ts, 1);
        }

        // Bottom wall — baseboard shadow
        if (row === C.dims.rr - 1) {
          const bounce = ctx.createLinearGradient(x, y + ts - 6, x, y + ts);
          bounce.addColorStop(0, 'rgba(0,0,0,0)');
          bounce.addColorStop(1, 'rgba(0,0,0,0.35)');
          ctx.fillStyle = bounce;
          ctx.fillRect(x, y + ts - 6, ts, 6);
        }

        // Side walls — subtle depth shading
        if (col === 0 || col === C.dims.rc - 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x, y, ts, ts);
        }

      } else {
        // ── FLOOR TILES (sprite-based) ─────────────────────────
        // Deterministic variation: creates a pseudo-random but stable pattern
        const hash = (col * 17 + row * 31 + col * row * 7) % 100;

        // Choose tile variant — ~25% chance of alt tile for subtle variation
        const useAltTile = (!isIce) && (hash < 25);
        const tile = useAltTile ? tileB : tileA;

        if (tile.complete && tile.naturalWidth > 0) {
          // Draw tile sprite — each tile covers exactly TILE_SIZE px
          // Slight alpha darkening toward center for fake depth
          const distFromEdge = Math.min(row, col, C.dims.rr - 1 - row, C.dims.rc - 1 - col);
          const depthAlpha = Math.max(0, 1 - distFromEdge * 0.012);

          ctx.save();
          // Very subtle alpha variation for depth (outermost tiles = slightly darker)
          if (depthAlpha < 0.95) {
            ctx.globalAlpha = 0.88 + depthAlpha * 0.12;
          }
          ctx.drawImage(tile, x, y, ts, ts);
          ctx.restore();
        } else {
          // Fallback while sprites load
          ctx.fillStyle = biome.floor;
          ctx.fillRect(x, y, ts, ts);
        }

        // Volcano biome: animated lava crack overlay on top of tile
        if (biome.theme === 'volcano' && hash % 17 === 0) {
          const glow = (Math.sin(time * 3 + hash) * 0.5 + 0.5);
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.shadowBlur = 4 * glow;
          ctx.shadowColor = '#ff3300';
          ctx.strokeStyle = `rgba(255, 80, 0, ${0.3 + glow * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 3);
          ctx.lineTo(x + ts - 3, y + ts - 2);
          ctx.stroke();
          ctx.restore();
        }

        // Forest biome: subtle fallen leaf overlay
        if (biome.theme === 'forest' && hash % 11 === 0) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = hash % 3 === 0 ? '#1a3a1a' : '#2a5a27';
          ctx.beginPath();
          ctx.ellipse(x + ts / 2, y + ts / 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // ── ROW SHADOW (top wall casting down onto floor) ──────────
  const shadowGrad = ctx.createLinearGradient(0, ts, 0, ts * 3);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.30)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.00)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(ts, ts, C.dims.gw - ts * 2, ts * 2);

  // ── TORCHES ────────────────────────────────────────────────
  const torchPositions: { x: number; y: number }[] = [];
  for (let col = 4; col < C.dims.rc; col += 8) {
    torchPositions.push({ x: col * C.TILE_SIZE, y: C.TILE_SIZE });
    torchPositions.push({ x: col * C.TILE_SIZE, y: C.dims.gh - C.TILE_SIZE });
  }
  for (let row = 5; row < C.dims.rr; row += 5) {
    torchPositions.push({ x: C.TILE_SIZE, y: row * C.TILE_SIZE });
    torchPositions.push({ x: C.dims.gw - C.TILE_SIZE, y: row * C.TILE_SIZE });
  }

  const flicker = Math.sin(time * 8) * 0.1 + 0.9;
  for (let ti = 0; ti < torchPositions.length; ti++) {
    const t = torchPositions[ti];
    const localFlicker = flicker * (1 + Math.sin(time * 10 + ti) * 0.1);

    // Glow pool on floor
    const glowR = 70;
    const floorGlow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, glowR);
    const glowIntensity = (0.1 + 0.08 * localFlicker).toFixed(3);
    floorGlow.addColorStop(0, biome.accentGlow.replace(/[\d.]+\)$/, `${glowIntensity})`));
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(t.x - glowR, t.y - glowR, glowR * 2, glowR * 2);

    // Procedural flame
    ctx.fillStyle = biome.accent;
    ctx.shadowBlur = 10;
    ctx.shadowColor = biome.accent;
    ctx.beginPath();
    const fSway = Math.sin(time * 12 + ti) * 2;
    ctx.moveTo(t.x - 2 + fSway * 0.5, t.y);
    ctx.quadraticCurveTo(t.x + fSway, t.y - 10, t.x + fSway * 0.2, t.y);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Handle
    ctx.fillStyle = biome.wallDetail;
    ctx.fillRect(t.x - 1, t.y - 2, 2, 10);
  }
}



/**
 * Render a Dimensional Rift (Fenda Dimensional) Door visual
 * This replaces the standard door sprite but maintains same logic.
 */
function renderDimensionalFissure(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, isOpen: boolean, color: string, px?: number, py?: number) {
  const dx = px !== undefined ? px - cx : 1000;
  const dy = py !== undefined ? py - cy : 1000;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Proximity expansion: 1.1x scale if within 85 units
  const proximityScale = dist < 85 ? 1.1 : 1.0;

  const pulse = Math.sin(time * 3) * 0.1 + 0.95;
  const alpha = isOpen ? 0.45 * pulse : 0.15;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(proximityScale, proximityScale);

  // 1. Atmospheric Glow - Roxo Elegante (Deep Mystic Purple)
  // Intensified for better distance reading
  const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
  glowGrad.addColorStop(0, `rgba(${color}, ${alpha})`);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24 * pulse, 35 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. The Rift Void (Irregular vertical fissure)
  // Centro preto profundo
  ctx.fillStyle = '#010003';
  ctx.beginPath();

  const freq = time * 2.5;
  const h = 26 * (isOpen ? pulse : 0.85);
  const w = isOpen ? 16 : 4.5; // Wider rift to accommodate player size visually

  ctx.moveTo(0, -h);
  for (let i = -h; i <= h; i += 4) {
    const taper = 1 - Math.pow(i / h, 2);
    const noise = Math.sin(freq + i * 0.45) * 3;
    ctx.lineTo((w + noise) * taper, i);
  }
  for (let i = h; i >= -h; i -= 4) {
    const taper = 1 - Math.pow(i / h, 2);
    const noise = Math.sin(freq * 1.3 - i * 0.5) * 3;
    ctx.lineTo((-w + noise) * taper, i);
  }
  ctx.closePath();
  ctx.fill();

  // 3. Shimmering Border (Bordas roxo escuro elegante)
  // Thicker stroke for better visibility
  ctx.strokeStyle = `rgba(160, 80, 255, ${isOpen ? 0.6 * pulse : 0.25})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.restore();
}

export function renderDoors(ctx: CanvasRenderingContext2D, room: DungeonRoom, time: number, doorsLocked: boolean = false, dungeon?: DungeonMap, px?: number, py?: number) {
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

    // Door Logic remains intact, but Visual is now a Dimensional Rift
    const visited = isOpen ? isNeighborVisited(dir) : false;
    const riftColor = visited ? '120, 60, 200' : '60, 0, 120'; // Slightly brighter and higher contrast

    renderDimensionalFissure(ctx, cx, cy, time, isOpen, riftColor, px, py);

    if (isOpen) {
      if (visited) {
        // GREEN Label — already visited room
        ctx.fillStyle = `rgba(50, 255, 100, ${0.7 * pulse})`;
        ctx.font = `500 7px ${C.HUD_FONT}`;
        ctx.textAlign = 'center';
        if (dir === 'north') ctx.fillText('VISITADA', cx, y + C.TILE_SIZE + 14);
        else if (dir === 'south') ctx.fillText('VISITADA', cx, y - 6);
        else if (dir === 'west') ctx.fillText('VISITADA', x + C.TILE_SIZE + 28, cy + 3);
        else ctx.fillText('VISITADA', x - 28, cy + 3);
        ctx.textAlign = 'left';
      } else {
        // ORANGE Label — unexplored room
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
      // Locked Interaction Labels
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

export function renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], floor = 1) {
  const biome = getBiome(floor);
  const time = Date.now() / 1000;

  for (const o of obstacles) {
    const hash = ((o.x * 7 + o.y * 13) & 0xFF);

    // 0. AMBIENT OCCLUSION (Soft floor shadow at base only)
    const aoGrad = ctx.createRadialGradient(o.x + o.w / 2, o.y + o.h / 2, 2, o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h) * 1.5);
    aoGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
    aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aoGrad;
    ctx.fillRect(o.x - 10, o.y - 10, o.w + 20, o.h + 20);

    // 1. SPRITE or BIOME HERO SILHOUETTE
    ctx.save();
    let spriteUsed = false;

    if (biome.obstacleSprites && biome.obstacleSprites.length > 0) {
      const spriteIdx = hash % biome.obstacleSprites.length;
      const spritePath = biome.obstacleSprites[spriteIdx];
      const sprite = getSprite(spritePath);

      if (sprite.complete && sprite.naturalWidth > 0) {
        // Draw the sprite centered and scaled to fit obstacle size
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
        // Subtle sway for forest obstacles
        if (biome.theme === 'forest') {
          ctx.rotate(Math.sin(time * 2 + hash) * 0.05);
        }
        ctx.drawImage(sprite, -o.w / 2 - 4, -o.h / 2 - 4, o.w + 8, o.h + 8);
        spriteUsed = true;
      }
    }

    if (!spriteUsed) {
      ctx.beginPath();
      if (biome.theme === 'forest') {
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const drift = Math.sin(angle * 4 + hash) * 6;
          const r = o.w / 2 + drift;
          const px = o.x + o.w / 2 + Math.cos(angle) * r;
          const py = o.y + o.h / 2 + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      } else if (biome.theme === 'crystal') {
        const pts = [
          [o.x + 4, o.y - 4], [o.x + o.w - 2, o.y + 2],
          [o.x + o.w + 6, o.y + o.h * 0.4], [o.x + o.w + 2, o.y + o.h + 4],
          [o.x + 2, o.y + o.h], [o.x - 4, o.y + o.h * 0.5]
        ];
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(p => ctx.lineTo(p[0], p[1]));
      } else {
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + o.w + 4, o.y - 2);
        ctx.lineTo(o.x + o.w + 2, o.y + o.h + 4);
        ctx.lineTo(o.x - 4, o.y + o.h + 2);
      }
      ctx.closePath();
      ctx.clip();

      // 2. PAINTERLY BASE LAYERING (Only if no sprite used)
      ctx.fillStyle = biome.wall;
      ctx.fillRect(o.x - 10, o.y - 10, o.w + 20, o.h + 20);

      // Layered texture noise
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)';
        const tx = o.x + (hash * (i + 1)) % o.w;
        const ty = o.y + (hash * (i + 2)) % o.h;
        ctx.fillRect(tx, ty, 20, 20);
      }
    }

    // 3. SPECIALIZED BIOME ELEMENTS
    if (biome.theme === 'forest') {
      // DENSE LEAVES CLUSTERS
      const leafColors = ["#1a3a1a", "#2a5a27", "#4a8a3b"];
      for (let i = 0; i < 8; i++) {
        const lx = o.x + ((hash * (i + 7)) % o.w);
        const ly = o.y + ((hash * (i + 4)) % o.h);
        const r = 10 + (i % 3) * 4;

        ctx.fillStyle = leafColors[i % 3];
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const a = j * Math.PI / 3;
          const lr = r * (0.8 + Math.sin(a * 3) * 0.2);
          ctx.lineTo(lx + Math.cos(a) * lr, ly + Math.sin(a) * lr);
        }
        ctx.fill();

        // Leaf stroke for definition
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      // Hanging Ivy
      ctx.strokeStyle = "#1a3a1a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.4, o.y);
      ctx.quadraticCurveTo(o.x + o.w * 0.1, o.y + o.h * 0.5, o.x + o.w * 0.3, o.y + o.h + 10);
      ctx.stroke();
    }
    else if (biome.theme === 'crystal') {
      // FACETED CRYSTALS
      for (let i = 0; i < 4; i++) {
        const cx = o.x + (o.w * 0.2) + (i * 12);
        const cy = o.y + (o.h * 0.2) + (i * 8);

        // Inner Refraction Gradient
        const cGrad = ctx.createLinearGradient(cx, cy - 10, cx + 10, cy + 20);
        cGrad.addColorStop(0, "#ffffff");
        cGrad.addColorStop(0.3, biome.accent);
        cGrad.addColorStop(1, "#0a1a3a");

        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 15, cy - 20);
        ctx.lineTo(cx + 25, cy);
        ctx.lineTo(cx + 12, cy + 30);
        ctx.closePath();
        ctx.fill();

        // Shine Glint
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(cx + 8, cy - 8, 2, 8);
      }
    }
    else if (biome.theme === 'volcano') {
      // MAGMA CORE & WEBS
      const glow = 0.7 + Math.sin(time * 5 + hash) * 0.3;
      ctx.shadowBlur = 10 * glow;
      ctx.shadowColor = "#ff2200";

      // Vein System
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(o.x - 5, o.y + o.h * 0.4);
      ctx.bezierCurveTo(o.x + o.w * 0.4, o.y + o.h * 0.1, o.x + o.w * 0.6, o.y + o.h * 0.9, o.x + o.w + 5, o.y + o.h * 0.6);
      ctx.stroke();

      // White-Hot Core
      ctx.strokeStyle = "#fffbea";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Bubbling Detail
      ctx.fillStyle = "rgba(255, 120, 0, 0.4)";
      for (let i = 0; i < 4; i++) {
        const bx = o.x + (hash * i) % o.w;
        const by = o.y + (hash + i) % o.h;
        ctx.beginPath();
        ctx.arc(bx, by, 3 * glow, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. GLOBAL ILLUMINATION (Post-Clip)
    ctx.restore();

    // Directional Rim Highlight (Top-Left Light Source)
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + o.h);
    ctx.lineTo(o.x, o.y);
    ctx.lineTo(o.x + o.w, o.y);
    ctx.stroke();

    // Biome Wash (Tint everything slightly with god-ray color)
    ctx.fillStyle = biome.rays.replace('0.1', '0.05');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
  const visible = p.invincibleTime <= 0 || Math.floor(p.invincibleTime * 20) % 2 === 0;
  if (!visible) return;

  // === ATTACK ANIMATION STATE ===
  let animX = 0;
  let animY = 0;
  let bodyRot = 0;

  if (p.meleeAttacking) {
    const activeStep = p.activeComboStep || 1;
    const isFinalHit = activeStep === 4;
    const isHeavyHit = activeStep === 3;
    const duration = C.MELEE_COOLDOWN * (isFinalHit ? 1.5 : 1.0);
    const t = 1 - (p.meleeTimer / duration);

    const fx = p.facing.x;
    const fy = p.facing.y;

    let lunge = 0;

    if (activeStep === 1) {
      // Step 1: Snap Forward (Lean In)
      if (t < 0.2) { lunge = -2 * (t / 0.2); bodyRot = -0.1 * (t / 0.2); } // Windup
      else if (t < 0.6) { lunge = 6; bodyRot = 0.2; } // Strike
      else { const rt = (t - 0.6) / 0.4; lunge = 6 * (1 - rt); bodyRot = 0.2 * (1 - rt); }
    }
    else if (activeStep === 2) {
      // Step 2: Backhand (Twist Back)
      if (t < 0.2) { lunge = 2; bodyRot = 0.1; }
      else if (t < 0.6) { lunge = 5; bodyRot = -0.15; }
      else { lunge = 5 * (1 - (t - 0.6) / 0.4); bodyRot = 0; }
    }
    else if (activeStep === 3) {
      // Step 3: Heavy Smash (Deep crouch -> Big Lunge)
      if (t < 0.3) { lunge = -3; animY = 2; bodyRot = -0.1; } // Crouch
      else if (t < 0.6) { lunge = 12; animY = -3; bodyRot = 0.3; } // Jump Lunge
      else { lunge = 12 * (1 - (t - 0.6) / 0.4); animY = 0; bodyRot = 0.1; }
    }
    else {
      // Step 4: Vortex (Spin/Wobble)
      const spin = Math.sin(t * Math.PI * 4);
      lunge = 8 + spin * 2;
      bodyRot = spin * 0.1;
      animX += Math.cos(t * Math.PI * 8) * 2;
    }

    animX += fx * lunge;
    animY += fy * lunge;
  }

  const x = p.x + animX;
  const y = p.y + animY;
  // Effects disabled — pure sprite visualisation mode
  // drawAmbientEffects(ctx, p, x, y, time);

  // Magic channeling effect (Free hand)
  HandCastEffect.render(ctx, p, time);

  // 2. Pose Selection
  if (p.meleeAttacking) {
    const step = p.activeComboStep || 1;
    const isFinal = step === 4;
    const duration = C.MELEE_COOLDOWN * (isFinal ? 1.5 : 1.0);
    const progress = 1 - (p.meleeTimer / duration);

    if (step === 1) drawAttackPose1(ctx, p, x, y, time, progress);
    else if (step === 2) drawAttackPose2(ctx, p, x, y, time, progress);
    else if (step === 3) drawAttackPose3(ctx, p, x, y, time, progress);
    else drawAttackPose4(ctx, p, x, y, time, progress);
  } else {
    drawIdleRunPose(ctx, p, x, y, time);
  }
}



function drawAmbientEffects(_ctx: CanvasRenderingContext2D, _p: PlayerState, _x: number, _y: number, _time: number) {
  // All effects removed — pure sprite visualisation mode.
}




// ============================================================
// PLAYER SPRITE — OFFICIAL CHARACTER ASSET
// ============================================================
// Body rendered via ctx.drawImage() only. Canvas = zero effects.
// ============================================================

// ── Types ─────────────────────────────────────────────────────
type SpriteDir = 'down' | 'up' | 'left' | 'right'
  | 'down-left' | 'down-right' | 'up-left' | 'up-right';

interface SpriteFrame {
  src: string;
  fallback?: boolean;
  flipX?: boolean;
  vOffset?: number; // Offset vertical específico para cada frame (correção de "pulo")
  scaleMult?: number; // Ajuste fino de tamanho por frame
  // Ponto exato onde a mão estaria na imagem (relativo ao centro/pivô do sprite)
  handSocket?: { x: number; y: number };
}

// ── 8-Direction Sprite Map ─────────────────────────────────────
// Drop the PNG in /public and set fallback: false to activate a direction.
// Até termos a arte final, apontamos para 'main_character_idle.png'
// Socket coordinates values (calibrados estruturalmente para as artes 80x80)
const SOCKET_FRONT_L = { x: -16, y: -26 };
const SOCKET_FRONT_R = { x: 16, y: -26 };
const SOCKET_BACK_L = { x: -14, y: -30 }; // Subido para encaixe perfeito
const SOCKET_BACK_R = { x: 14, y: -30 };
const SOCKET_SIDE = { x: -2, y: -26 };

const SPRITE_FRAMES: Record<SpriteDir | 'idle-cycle', SpriteFrame | SpriteFrame[]> = {
  'down': [
    { src: '/player-andando-de-frente1.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 0.8 },
    { src: '/player-andando-de-frente-2.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 0.8 },
  ],
  'up': [
    { src: '/player-de-costa-1.png', handSocket: SOCKET_BACK_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-costa-2.png', handSocket: SOCKET_BACK_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-costa-3.png', handSocket: SOCKET_BACK_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-costa-4.png', handSocket: SOCKET_BACK_R, vOffset: 0, scaleMult: 1.0 },
  ],
  'idle-cycle': [
    { src: '/player-parado-1.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-parado-2a.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-parado-3a.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-parado-4aa.png', handSocket: SOCKET_FRONT_R, vOffset: 0, scaleMult: 1.0 },
  ],
  'right': [
    { src: '/player-de-lado-1.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
  'left': [
    { src: '/player-de-lado-1.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
  'down-right': [
    { src: '/player-de-lado-1.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
  'down-left': [
    { src: '/player-de-lado-1.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
  'up-right': [
    { src: '/player-de-lado-1.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
  'up-left': [
    { src: '/player-de-lado-1.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-2.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-3.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
    { src: '/player-de-lado-4.png', flipX: true, handSocket: SOCKET_SIDE, vOffset: 0, scaleMult: 1.0 },
  ],
};

// ── Constants ──────────────────────────────────────────────────
const SPRITE_SIZE = 80;               // Size in game units (slightly larger for the ears)
const PIVOT_X = SPRITE_SIZE / 2;  // horizontal anchor
const PIVOT_Y = SPRITE_SIZE * 0.55; // Lower pivot to account for large ears/head
const WEAPON_HAND_Y = -38;        // Altura do peito/ombro para as armas
const WEAPON_HAND_BASE_X = 18;    // Espaçamento das mãos (ombro a ombro)

// ── Sprite Cache & Loader ─────────────────────────────────────
const _loadedSprites: Record<string, HTMLImageElement> = {};
function getSprite(src: string): HTMLImageElement {
  if (!_loadedSprites[src]) {
    const img = new Image();
    img.src = src;
    _loadedSprites[src] = img;
  }
  return _loadedSprites[src];
}

// Pre-load idle sprite on module init
const initialFrame = SPRITE_FRAMES['down'];
const initialSrc = Array.isArray(initialFrame) ? initialFrame[0].src : initialFrame.src;
getSprite(initialSrc);

// ── Direction Selector ────────────────────────────────────────
// Update helper to handle idle and vertical preference
function getSpriteFrameForFacing(p: PlayerState): SpriteFrame | SpriteFrame[] {
  const fx = p.facing.x;
  const fy = p.facing.y;
  const isMoving = p.isMoving || p.isDashing || p.meleeAttacking;

  // Se parado e NÃO estiver atacando, usa o ciclo de animação parado
  if (!isMoving) {
    return SPRITE_FRAMES['idle-cycle'];
  }

  // Prioridade Vertical (Costas/Frente)
  if (Math.abs(fy) > Math.abs(fx) * 1.5) {
    if (fy < 0) return SPRITE_FRAMES['up'];
    if (fy > 0) return SPRITE_FRAMES['down'];
  }

  // Diagonais e Lados
  if (fx < 0) return SPRITE_FRAMES['left'];
  if (fx > 0) return SPRITE_FRAMES['right'];

  return SPRITE_FRAMES['down']; // Fallback
}

// ── Main Draw Function ────────────────────────────────────────
/**
 * Render the official player character.
 * Body: ctx.drawImage ONLY.
 */
export function renderPlayerSprite(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
  const frameOrFrames = getSpriteFrameForFacing(p);

  // Usar a flag explícita do PlayerState
  const isMoving = p.isMoving || p.isDashing;
  const isIdleCycle = !isMoving;

  let frame: SpriteFrame;
  if (Array.isArray(frameOrFrames)) {
    if (isMoving || isIdleCycle) {
      // Ajuste de velocidade da animação (Idle muito sutil, Run normal)
      const animSpeed = isIdleCycle ? 1.2 : 10;
      const index = Math.floor(time * animSpeed) % frameOrFrames.length;
      frame = frameOrFrames[index];
    } else {
      frame = frameOrFrames[0];
    }
  } else {
    frame = frameOrFrames;
  }

  if (!frame) frame = { src: '/player-de-frente.png' };

  const flipX = frame.flipX === true;
  const src = frame.src || '/player-de-frente.png';
  const sprite = getSprite(src);

  if (sprite.complete && sprite.naturalWidth !== 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Normalização Universal: Força todos os sprites a serem pequenos e uniformes (Base 72)
    const baseTargetHeight = 64; // Reduzido de 72 para 64 (pedido do user)
    const frameScale = frame.scaleMult || 1.0;
    const h = baseTargetHeight * frameScale;

    // Normalização pela Altura: Mais estável para manter o tamanho da cabeça/corpo consistente
    const scale = h / Math.max(sprite.naturalHeight, 1);
    const w = sprite.naturalWidth * scale;

    // Compensação Grounded Limpa: Sem offsets individuais para evitar jumper
    const finalYOffset = 0;

    if (flipX) {
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -w / 2, -h + finalYOffset, w, h);
    } else {
      ctx.drawImage(sprite, -w / 2, -h + finalYOffset, w, h);
    }

    ctx.restore();
  } else {
    // Visibility guard: Show a simple shape if assets are missing/loading
    ctx.save();
    // Head shape
    ctx.fillStyle = '#08080c';
    ctx.beginPath();
    ctx.arc(0, -45, 12, 0, Math.PI * 2);
    ctx.fill();
    // Body shape
    ctx.fillRect(-10, -35, 20, 30);
    ctx.restore();
  }
}

function drawOriginalCharacterBody(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
  renderPlayerSprite(ctx, p, time);
}


// OLD (Hyper-Detailed) - Disabled
/* function drawOriginalCharacterBody_OLD(ctx: CanvasRenderingContext2D, p: PlayerState, time: number, lookX: number, hoodShift: number, breathe: number, walkCycle: number = 0, tilt: number = 0) {


  // Palette (Darker, richer, higher contrast)
  const C_BASE_DARK = '#08080c';
  const C_BASE_MID = '#12121a';
  const C_BASE_LIGHT = '#202030'; // Highlight base
  const C_RIM_LIGHT = 'rgba(180, 220, 255, 0.5)'; // Sharp rim
  const C_ACCENT_CYAN = 'rgba(0, 255, 255, 0.2)';

  // Helpers
  const grad = (x1: number, y1: number, x2: number, y2: number, c1: string, c2: string) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  };

  const gRadial = (x: number, y: number, r: number, c1: string, c2: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  };

  // === 1. CAPE (Epic Flow) ===
  // Outer layer (Dark Void)
  const capeG = grad(0, -10, 0, 15, '#050508', '#000000');
  ctx.fillStyle = capeG;
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-12, 12); // Wide flare
  ctx.quadraticCurveTo(0, 15, 12, 12);
  ctx.lineTo(7, -4);
  ctx.fill();

  // Volume folds (Subtle highlight)
  ctx.fillStyle = 'rgba(20, 20, 30, 0.3)';
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-9, 11);
  ctx.lineTo(-7, 12);
  ctx.lineTo(-4, -4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.lineTo(9, 11);
  ctx.lineTo(7, 12);
  ctx.lineTo(4, -4);
  ctx.fill();

  // === 2. LEGS (Cyber-Armor) ===
  const drawLeg = (mx: number) => {
    const side = mx < 0 ? -1 : 1;

    // Thigh (Muscular Armor)
    const thighG = grad(mx + side, 4, mx - side, 8, C_BASE_LIGHT, C_BASE_DARK);
    ctx.fillStyle = thighG;
    ctx.beginPath();
    ctx.moveTo(mx + side, 4);
    ctx.lineTo(mx + side * 0.5, 9);
    ctx.lineTo(mx - side * 1.5, 8); // Inner knee
    ctx.lineTo(mx, 4);
    ctx.fill();

    // Knee Plating (Diamond)
    ctx.fillStyle = '#1a1a25';
    ctx.beginPath();
    ctx.moveTo(mx + side * 0.5, 7);
    ctx.lineTo(mx + side * 2, 8);
    ctx.lineTo(mx + side * 0.5, 10);
    ctx.lineTo(mx - side, 8.5);
    ctx.fill();
    // Sharp Highlight
    ctx.fillStyle = '#4a4a60';
    ctx.beginPath();
    ctx.moveTo(mx + side * 0.5, 7);
    ctx.lineTo(mx + side * 1.5, 8);
    ctx.lineTo(mx + side * 0.5, 8.5);
    ctx.fill();

    // Boot (Heavy & Sleek)
    const bootG = grad(mx, 9, mx, 14, '#151520', '#020204');
    ctx.fillStyle = bootG;
    ctx.beginPath();
    ctx.moveTo(mx - side * 1.5, 9);
    ctx.lineTo(mx + side * 1.5, 9);
    ctx.lineTo(mx + side * 2, 13);
    ctx.lineTo(mx - side * 1, 14); // Heel
    ctx.fill();

    // Boot Tip (Grounded)
    ctx.fillStyle = '#050508';
    ctx.beginPath();
    ctx.moveTo(mx + side * 2, 13);
    ctx.lineTo(mx + side * 3.5, 14.5); // Pointier toe
    ctx.lineTo(mx + side * 0.5, 15);
    ctx.lineTo(mx - side, 14);
    ctx.fill();

    // Boot Rim Light
    ctx.strokeStyle = C_RIM_LIGHT;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(mx + side * 1.5, 9);
    ctx.lineTo(mx + side * 2, 13);
    ctx.stroke();
  };

  drawLeg(-3.2);
  drawLeg(3.2);

  // === 3. TORSO (Anatomical Scuplture) ===

  // Waist / Core
  const waistG = grad(0, 4, 0, 7, C_BASE_MID, C_BASE_DARK);
  ctx.fillStyle = waistG;
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(3, 7);
  ctx.lineTo(-3, 7);
  ctx.fill();

  // Abdominal Plating (Ultra-defined)
  ctx.fillStyle = '#050508'; // Dark gaps
  ctx.globalAlpha = 0.6;
  ctx.fillRect(-0.5, 1, 1, 6); // Center channel
  ctx.fillRect(-3, 3, 6, 0.5); // Horiz line
  ctx.fillRect(-2.5, 4.5, 5, 0.5); // Horiz line
  ctx.globalAlpha = 1;

  // Chest / Pecs (Power Armor)
  const chestG = grad(0, -5, 0, 2, '#252535', '#101015');
  ctx.fillStyle = chestG;
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(6, -5);
  ctx.lineTo(4, 4); // Taper to waist
  ctx.lineTo(-4, 4);
  ctx.fill();

  // Pec Separation (Deep groove)
  ctx.fillStyle = '#050508';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-0.5, 0); // Sternum
  ctx.lineTo(0.5, 0);
  ctx.lineTo(0, -5);
  ctx.fill();

  // Pec Rim Light (Definition)
  ctx.strokeStyle = C_RIM_LIGHT;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-3, -1, -0.5, 0);
  ctx.moveTo(6, -2); ctx.quadraticCurveTo(3, -1, 0.5, 0);
  ctx.stroke();

  // === 4. ARMS & HANDS (Detailed) ===
  const drawArm = (mx: number) => {
    const side = mx < 0 ? -1 : 1;

    // Shoulder (Pauldrons) - Multi-faceted
    const shG = grad(mx, -6, mx, -1, C_BASE_LIGHT, C_BASE_DARK);
    ctx.fillStyle = shG;
    ctx.beginPath();
    ctx.moveTo(mx, -5);
    ctx.lineTo(mx + side * 4.5, -4.5);
    ctx.lineTo(mx + side * 3.5, 1);
    ctx.lineTo(mx + side, 0);
    ctx.fill();
    // Pauldron Rim
    ctx.strokeStyle = C_RIM_LIGHT;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(mx, -5); ctx.lineTo(mx + side * 4.5, -4.5); ctx.lineTo(mx + side * 3.5, 1);
    ctx.stroke();

    // Arm (Bicep)
    ctx.fillStyle = C_BASE_MID;
    ctx.fillRect(mx + side * 1.5 - 1.5, 0, 3, 4.5);

    // -- DETAILED HAND / GAUNTLET --
    const hx = mx + side * 1.5;
    const hy = 4.5;

    // Gauntlet Bracer
    ctx.fillStyle = '#1a1a25';
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy);
    ctx.lineTo(hx + 2, hy);
    ctx.lineTo(hx + 2.5, hy + 3);
    ctx.lineTo(hx - 2.5, hy + 3);
    ctx.fill();

    // Hand Base (Palm/Back)
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(hx - 2, hy + 3, 4, 3);

    // Knuckles (Defined)
    ctx.fillStyle = '#252535';
    ctx.beginPath();
    ctx.arc(hx - 1.5, hy + 6, 0.8, 0, Math.PI * 2); // Index
    ctx.arc(hx + 0, hy + 6.2, 0.8, 0, Math.PI * 2); // Middle
    ctx.arc(hx + 1.5, hy + 6, 0.8, 0, Math.PI * 2); // Ring
    ctx.fill();

    // Fingers (Closed Fist Grip)
    ctx.fillStyle = '#151520';
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy + 6);
    ctx.lineTo(hx + 2, hy + 6);
    ctx.lineTo(hx + 1.5, hy + 8.5); // Tapered finger tips
    ctx.lineTo(hx - 1.5, hy + 8.5);
    ctx.fill();

    // Thumb (Wrapped)
    ctx.fillStyle = '#202030';
    ctx.beginPath();
    ctx.moveTo(hx - side * 2, hy + 4);
    ctx.lineTo(hx - side * 0.5, hy + 5);
    ctx.lineTo(hx - side * 0.5, hy + 6.5);
    ctx.lineTo(hx - side * 2.2, hy + 5.5);
    ctx.fill();
  };

  drawArm(-5.5);
  drawArm(5.5);

  // === 5. SYMBOL (Celestial) ===
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffffff';

  // Moon
  ctx.beginPath();
  ctx.arc(0, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Cutout
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(0.7, -2.2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Star (Sharp)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const sx = 0.4, sy = -2.0;
  const sSize = 0.6;
  ctx.moveTo(sx, sy - sSize);
  ctx.quadraticCurveTo(sx + sSize * 0.1, sy - sSize * 0.1, sx + sSize, sy);
  ctx.quadraticCurveTo(sx + sSize * 0.1, sy + sSize * 0.1, sx, sy + sSize);
  ctx.quadraticCurveTo(sx - sSize * 0.1, sy + sSize * 0.1, sx - sSize, sy);
  ctx.quadraticCurveTo(sx - sSize * 0.1, sy - sSize * 0.1, sx, sy - sSize);
  ctx.fill();
  ctx.shadowBlur = 0;

  // === 6. HEAD (The Nano Helmet) ===
  const hy = -7;

  // Helmet Gradient (Metallic sheen)
  const headG = grad(0, hy - 8, 0, hy + 6, '#303045', '#020204');
  ctx.fillStyle = headG;

  // Silhouette Path
  ctx.beginPath();
  ctx.moveTo(0, hy + 5); // Chin
  ctx.quadraticCurveTo(5, hy + 4, 6.5, hy - 1); // Cheek R (Wider)
  ctx.lineTo(7.5, hy - 14); // Ear Tip R (Sharper)
  ctx.lineTo(3, hy - 7);    // Top R
  ctx.quadraticCurveTo(0, hy - 6, -3, hy - 7); // Top L
  ctx.lineTo(-7.5, hy - 14); // Ear Tip L
  ctx.lineTo(-6.5, hy - 1);  // Cheek L
  ctx.quadraticCurveTo(-5, hy + 4, 0, hy + 5);  // Chin
  ctx.fill();

  // Helmet Inner Detail (Contrast)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(-5, hy - 4); ctx.lineTo(-6.5, hy - 11); ctx.lineTo(-3.5, hy - 6); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, hy - 4); ctx.lineTo(6.5, hy - 11); ctx.lineTo(3.5, hy - 6); ctx.fill();

  // Helmet Highlights (Glisten)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, hy - 7); ctx.quadraticCurveTo(0, hy - 6, 2, hy - 7); // Forehead
  ctx.stroke();

  // Eyes (Piercing Soul)
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';

  // Left Eye
  ctx.beginPath();
  ctx.ellipse(-2.8, hy, 2.2, 3.4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Right Eye
  ctx.beginPath();
  ctx.ellipse(2.8, hy, 2.2, 3.4, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Pupil/Depth Illusion
  ctx.fillStyle = '#00ffff';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(-2.8, hy, 1.4, 2.4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2.8, hy, 1.4, 2.4, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Final Rim Light (Backlighting - Crucial for "Pop")
  ctx.strokeStyle = 'rgba(180, 230, 255, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6.5, hy - 1);
  ctx.quadraticCurveTo(-5, hy - 8, -7.5, hy - 14); // Ear Rim L
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(6.5, hy - 1);
  ctx.quadraticCurveTo(5, hy - 8, 7.5, hy - 14); // Ear Rim R
  ctx.stroke();
} */

/**
 * Pose 0: Idle / Run (Sprite Integrated)
 */
function drawIdleRunPose(ctx: CanvasRenderingContext2D, p: PlayerState, x: number, y: number, time: number) {
  const isMoving = p.trail.length > 0 || p.isDashing;
  const idleTime = p.idleTime || 0;

  ctx.save();
  ctx.translate(x, y);

  // Character Body
  drawOriginalCharacterBody(ctx, p, time);

  // --- Weapon Attachment ---
  if (idleTime <= 12) {
    const isDual = p.weapon === 'daggers';
    const side = p.facing.x >= 0 ? 1 : -1;
    const pulse = 0.9 + Math.sin(time * 6) * 0.1;

    // Resolve current frame
    const frameOrFrames = getSpriteFrameForFacing(p);
    const currentFrame = Array.isArray(frameOrFrames)
      ? frameOrFrames[Math.floor(time * 10) % frameOrFrames.length]
      : frameOrFrames;

    // Determine active socket
    const isFrontFrame = currentFrame.src.includes('frente') || currentFrame.src.includes('parado');
    const isBackFrame = currentFrame.src.includes('costa');

    // Determine active socket - Sprite flip already handles the side change
    const socket = currentFrame.handSocket || (isBackFrame ? SOCKET_BACK_R : SOCKET_FRONT_R);


    let sx = socket.x;
    if (currentFrame.flipX) sx *= -1;
    const sy = socket.y;

    if (isDual) {
      // DUAL WEAPONS (Dynamic symmetry)
      const leftAngleBase = p.facing.x >= 0 ? Math.PI * 0.7 : Math.PI * 0.3;
      const rightAngleBase = p.facing.x >= 0 ? Math.PI * 0.3 : Math.PI * 0.7;

      // Estabilização Idle: balanço reduzido quando parado
      const runMag = isMoving ? 0.2 : 0.03;
      const idleBackOff = (!isMoving && isBackFrame) ? -Math.PI * 0.1 : 0;

      // Left
      ctx.save();
      const sxL = -sx;
      drawEtherealHand(ctx, sxL, sy, pulse, time, 0, 0);
      ctx.translate(sxL, sy);
      ctx.rotate(leftAngleBase + idleBackOff + Math.sin(time * 3) * runMag);
      drawEquippedWeapon(ctx, p, 32, 0, time, true);
      ctx.restore();

      // Right
      ctx.save();
      drawEtherealHand(ctx, sx, sy, pulse, time, 0, 0);
      ctx.translate(sx, sy);
      ctx.rotate(rightAngleBase + idleBackOff + Math.cos(time * 3) * runMag);
      drawEquippedWeapon(ctx, p, 32, 0, time, true);
      ctx.restore();
    } else {
      // SINGLE WEAPON - Use the frame-calculated socket and scale mirroring
      const finalSx = sx;

      let finalSy: number;
      let rot: number;
      let sway: number;

      if (isMoving) {
        // --- POSE DE CORRIDA (Animação Original) ---
        finalSy = sy; // Usa o socket original para bater com o movimento do sprite
        sway = Math.sin(time * 10) * 0.08; // Balanço de corrida mais forte

        if (isFrontFrame) {
          rot = Math.PI * 0.4; // Aponta para baixo/lado na corrida (Original)
        } else if (isBackFrame) {
          rot = -Math.PI * 0.3; // Aponta para cima/direita na corrida
        } else {
          rot = -Math.PI * 0.35;
        }
      } else {
        // --- POSE PARADO (Calibrada para Encaixe Perfeito) ---
        finalSy = -62; // Subido mais um pouco para tirar o cabo do pé (pedido do user)
        sway = Math.sin(time * 2) * 0.015; // Balanço sutil de respiração

        if (isFrontFrame) {
          rot = -Math.PI * 0.55; // Aponta pra cima e para fora
        } else if (isBackFrame) {
          rot = -Math.PI * 0.25; // Aponta para cima/direita no idle
        } else {
          rot = -Math.PI * 0.6;
        }
      }

      ctx.save();
      ctx.translate(finalSx, finalSy);

      if (p.weapon === 'staff') {
        // STAFF POSITIONING: High presence, vertical, no flip scaling
        drawVerticalStaff(ctx, 42, 0, time, p.facing.x);
      } else {
        if (p.facing.x < 0 && !isBackFrame) ctx.scale(-1, 1);
        ctx.rotate(rot + sway);
        // Corrected: p.weapon can only be 'sword' (or 'daggers' if logic allowed, but it's in the else of 'isDual')
        const weaponLen = 34;
        drawEquippedWeapon(ctx, p, weaponLen, isMoving ? 0.2 : 0, time);
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Pose 1: The Lunge (Forward Slash)
 * Body leans forward, Cloak drags back, Sword swings across.
 */
function drawAttackPose1(ctx: CanvasRenderingContext2D, p: PlayerState, x: number, y: number, time: number, t: number) {
  const isKatana = p.weapon === 'daggers';
  const facing = p.facing.x;

  // Lunge: Small advance
  const lunge = isKatana ? 8 * (t < 0.2 ? 0 : (t - 0.2) / 0.8) : 0;
  const bx = x + Math.cos(p.meleeAngle) * lunge;
  const by = y + Math.sin(p.meleeAngle) * lunge;

  ctx.save();
  ctx.translate(bx, by);
  drawOriginalCharacterBody(ctx, p, time);
  ctx.restore();

  // Attack 1: Swift Horizontal (R -> L)
  const angleStart = p.meleeAngle - C.MELEE_ARC / 2;
  const angleEnd = p.meleeAngle + C.MELEE_ARC / 2;

  let swingT = t < 0.1 ? 0 : Math.min(1, (t - 0.1) / 0.5);
  swingT = 1 - Math.pow(1 - swingT, 4);
  const currentAngle = angleStart + (angleEnd - angleStart) * swingT;

  const frameOrFrames = getSpriteFrameForFacing(p);
  const currentFrame = Array.isArray(frameOrFrames) ? frameOrFrames[0] : frameOrFrames;
  const isFront = currentFrame.src.includes('parado') || currentFrame.src.includes('frente');
  const socketR = isFront ? SOCKET_FRONT_R : (currentFrame.handSocket || SOCKET_FRONT_R);
  const sx = socketR.x * (currentFrame.flipX ? -1 : 1);

  ctx.save();
  ctx.translate(bx + sx, y + socketR.y);
  ctx.rotate(currentAngle);
  drawEquippedWeapon(ctx, p, 38, 1, time, true);
  ctx.restore();

  if (t > 0.1 && t < 0.6) {
    drawSlashTrail(ctx, bx, by, C.MELEE_RANGE * 0.85, angleStart, currentAngle, 'azure');
  }
}

/**
 * Pose 2: The Twist (Backhand)
 * Body twists back, Sword swings Left -> Right (Reverse).
 */
function drawAttackPose2(ctx: CanvasRenderingContext2D, p: PlayerState, x: number, y: number, time: number, t: number) {
  const isKatana = p.weapon === 'daggers';
  const facing = p.facing.x;

  // Attack 2: Inverted Horizontal - 360 Lunge
  const lunge = isKatana ? 12 * (t < 0.1 ? 0 : (t - 0.1) / 0.9) : 0;
  const bx = x + Math.cos(p.meleeAngle) * lunge;
  const by = y + Math.sin(p.meleeAngle) * lunge;

  ctx.save();
  ctx.translate(bx, by);
  drawOriginalCharacterBody(ctx, p, time);
  ctx.restore();

  const angleStart = p.meleeAngle + C.MELEE_ARC / 2;
  const angleEnd = p.meleeAngle - C.MELEE_ARC / 2;

  let swingT = t < 0.05 ? 0 : Math.min(1, (t - 0.05) / 0.4);
  swingT = 1 - Math.pow(1 - swingT, 5);
  const currentAngle = angleStart + (angleEnd - angleStart) * swingT;

  const frameOrFrames = getSpriteFrameForFacing(p);
  const currentFrame = Array.isArray(frameOrFrames) ? frameOrFrames[0] : frameOrFrames;
  const isFront = currentFrame.src.includes('parado') || currentFrame.src.includes('frente');
  const socketR = isFront ? SOCKET_FRONT_R : (currentFrame.handSocket || SOCKET_FRONT_R);
  const sx = socketR.x * (currentFrame.flipX ? -1 : 1);

  ctx.save();
  ctx.translate(bx + sx, y + socketR.y);
  ctx.rotate(currentAngle);
  ctx.scale(1, -1); // Visual trick for reverse cut
  drawEquippedWeapon(ctx, p, 38, 1, time, true);
  ctx.restore();

  if (t > 0.05 && t < 0.5) {
    drawSlashTrail(ctx, bx, by, C.MELEE_RANGE * 0.85, angleStart, currentAngle, 'azure');
  }
}

/**
 * Pose 3: The Heavy Smash
 * Jump up -> Slam down. Sword Overhead.
 */
function drawAttackPose3(ctx: CanvasRenderingContext2D, p: PlayerState, x: number, y: number, time: number, t: number) {
  const isKatana = p.weapon === 'daggers';
  const facing = p.facing.x;

  // LIFT: Body moves slightly up during diagonal upslash + small lunge
  const liftY = isKatana ? Math.sin(t * Math.PI) * -6 : 0;
  const lunge = isKatana ? 5 : 0;
  const bx = x + Math.cos(p.meleeAngle) * lunge;
  const by = y + Math.sin(p.meleeAngle) * lunge;

  ctx.save();
  ctx.translate(bx, by + liftY);
  drawOriginalCharacterBody(ctx, p, time);
  ctx.restore();

  // Weapon: Diagonal Upward Slash
  const angleStart = p.meleeAngle + Math.PI * 0.4;
  const angleEnd = p.meleeAngle - Math.PI * 0.4;

  let swingT = t < 0.1 ? 0 : Math.min(1, (t - 0.1) / 0.4);
  swingT = Math.pow(swingT, 2);
  const currentAngle = angleStart + (angleEnd - angleStart) * swingT;

  const frameOrFrames = getSpriteFrameForFacing(p);
  const currentFrame = Array.isArray(frameOrFrames) ? frameOrFrames[0] : frameOrFrames;
  const isFront = currentFrame.src.includes('parado') || currentFrame.src.includes('frente');
  const socketR = isFront ? SOCKET_FRONT_R : (currentFrame.handSocket || SOCKET_FRONT_R);
  const sx = socketR.x * (currentFrame.flipX ? -1 : 1);

  ctx.save();
  ctx.translate(bx + sx, y + liftY + socketR.y);
  ctx.rotate(currentAngle);
  drawEquippedWeapon(ctx, p, 42, 1, time, true);
  ctx.restore();

  if (t > 0.1 && t < 0.6) {
    drawSlashTrail(ctx, bx, by + liftY, C.MELEE_RANGE * 1.0, angleStart, currentAngle, 'iron');
  }
}

/**
 * Pose 4: The Vortex (Finisher)
 * 360 Spin.
 */
function drawAttackPose4(ctx: CanvasRenderingContext2D, p: PlayerState, x: number, y: number, time: number, t: number) {
  const isKatana = p.weapon === 'daggers';
  const facing = p.facing.x;

  // IAIJUTSU DASH: High speed advance in 360 degrees
  const dashDist = isKatana ? 45 * Math.min(1, t / 0.4) : 0;
  const bx = x + Math.cos(p.meleeAngle) * dashDist;
  const by = y + Math.sin(p.meleeAngle) * dashDist;

  ctx.save();
  ctx.translate(bx, by);
  drawOriginalCharacterBody(ctx, p, time);
  ctx.restore();

  // DOUBLE CROSS SLASH (X)
  const angleStart = p.meleeAngle - C.MELEE_ARC / 1.2;
  const angleEnd = p.meleeAngle + C.MELEE_ARC / 1.2;

  let swingT = t < 0.3 ? 0 : Math.min(1, (t - 0.3) / 0.5);
  swingT = 1 - Math.pow(1 - swingT, 4);
  const currentAngle = angleStart + (angleEnd - angleStart) * swingT;

  const frameOrFrames = getSpriteFrameForFacing(p);
  const currentFrame = Array.isArray(frameOrFrames) ? frameOrFrames[0] : frameOrFrames;
  const isFront = currentFrame.src.includes('parado') || currentFrame.src.includes('frente');
  const socketR = isFront ? SOCKET_FRONT_R : (currentFrame.handSocket || SOCKET_FRONT_R);
  const socketL = isFront ? SOCKET_FRONT_L : { x: -socketR.x, y: socketR.y };

  const sxR = socketR.x * (currentFrame.flipX ? -1 : 1);
  const sxL = socketL.x * (currentFrame.flipX ? -1 : 1);

  // Draw two katanas in an X pattern
  ctx.save();
  ctx.translate(bx + sxR, y + socketR.y);
  ctx.rotate(currentAngle);
  drawEquippedWeapon(ctx, p, 44, 1, time, true);
  ctx.restore();

  const angleStartL = p.meleeAngle + C.MELEE_ARC / 1.2;
  const angleEndL = p.meleeAngle - C.MELEE_ARC / 1.2;
  const currentAngleL = angleStartL + (angleEndL - angleStartL) * swingT;

  ctx.save();
  ctx.translate(bx + sxL, y + socketL.y);
  ctx.rotate(currentAngleL);
  drawEquippedWeapon(ctx, p, 44, 1, time, true);
  ctx.restore();

  if (t > 0.3 && t < 0.8) {
    drawSlashTrail(ctx, bx, by, C.MELEE_RANGE * 1.4, angleStart, currentAngle, 'azure');
    drawSlashTrail(ctx, bx, by, C.MELEE_RANGE * 1.4, angleStartL, currentAngleL, 'azure');
  }
}

function drawSlashTrail(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, start: number, end: number, color: 'azure' | 'gold' | 'crimson' | 'iron') {
  ctx.save();

  let mainColor = 'rgba(100, 200, 255, 0.12)'; // Default azure
  let sharpColor = 'rgba(255, 255, 255, 0.8)';
  let glowColor = 'rgba(100, 200, 255, 0)';

  if (color === 'gold') {
    mainColor = 'rgba(255, 200, 0, 0.12)';
    sharpColor = 'rgba(255, 255, 200, 0.8)';
    glowColor = 'rgba(255, 200, 0, 0)';
  } else if (color === 'crimson') {
    mainColor = 'rgba(255, 50, 50, 0.12)';
    sharpColor = 'rgba(255, 200, 200, 0.8)';
    glowColor = 'rgba(255, 50, 50, 0)';
  }

  // Layer 1: Focused Blade Edge (The sharp part)
  const bladeGrad = ctx.createRadialGradient(x, y, r * 0.95, x, y, r);
  bladeGrad.addColorStop(0, color === 'iron' ? 'rgba(150, 150, 160, 0)' : 'rgba(200, 240, 255, 0)');
  bladeGrad.addColorStop(0.5, sharpColor); // Sharp white core
  bladeGrad.addColorStop(1, glowColor);

  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, start, end, start > end);
  ctx.fill();

  // Layer 2: Ethereal Energy Tail (Subtle dissipation)
  const auraGrad = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.05);
  auraGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
  auraGrad.addColorStop(0.5, mainColor);
  auraGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 1.05, start, end, start > end);
  ctx.fill();
  ctx.restore();
}

/** Draws a sharp white glint/spark at contact point */
function drawImpactGlint(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, size = 12) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  const g = ctx.createRadialGradient(x, y, 0, x, y, size);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal/Vertical sharp crosses
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.restore();
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

/** Draws the equipped weapon based on player choice.
 *  @param singleOnly If true, only draws one instance (useful for dual-wielding hand-by-hand)
 */
function drawEquippedWeapon(ctx: CanvasRenderingContext2D, p: PlayerState, length: number, isAttacking: number, time: number, singleOnly = false) {
  switch (p.weapon) {
    case 'daggers': drawDualDaggers(ctx, length, isAttacking, time, singleOnly); break;
    case 'staff': drawVoidStaff(ctx, length, isAttacking, time); break;
    default: drawLongsword(ctx, length, isAttacking, time); break;
  }
}


/** Draws professional Dual Katanas with independent hand support */
function drawDualDaggers(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number, singleOnly = false) {
  const katLen = length * 1.1; // Aumentado fator de escala
  const hiltLen = 12; // Cabo maior e mais visível
  const bladeLen = katLen - hiltLen;
  const tsubaRadius = 5; // Guarda (tsuba) mais imponente
  const bladeWidth = 2.5; // Lâmina mais larga e "AAA"

  const drawOne = (extraRot: number) => {
    // Pivô Estrutural: Centro do Cabo (Hilt é 8px total)
    // Pivô em 0 significa que o cabo vai de -4 a +4
    ctx.save();
    ctx.rotate(extraRot);

    // 1. Tsuka (Hilt) - Cabo centrado
    // 1. Tsuka (Hilt) - Cabo centrado (Cores Matte e Bronze)
    ctx.fillStyle = '#050505';
    ctx.fillRect(-hiltLen / 2, -1.2, hiltLen, 2.4);

    // Tsuka-ito (Diamonds)
    ctx.fillStyle = '#222';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-hiltLen / 2 + 3 + i * 3, 0, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Tsuba (Circular guard) - Na junção
    const tG = ctx.createRadialGradient(hiltLen / 2, 0, 0, hiltLen / 2, 0, tsubaRadius);
    tG.addColorStop(0, '#886622'); // Bronze/Gold
    tG.addColorStop(1, '#221100');
    ctx.fillStyle = tG;
    ctx.beginPath();
    ctx.arc(hiltLen / 2, 0, tsubaRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Curved Blade - High Contrast AAA
    const bGrad = ctx.createLinearGradient(hiltLen / 2, -bladeWidth, hiltLen / 2, bladeWidth);
    bGrad.addColorStop(0, '#0a0a0a');
    bGrad.addColorStop(0.3, '#ffffff'); // Hamon line feel
    bGrad.addColorStop(0.5, '#cccccc');
    bGrad.addColorStop(1, '#111111');
    ctx.fillStyle = bGrad;

    const curve = isAttacking ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(hiltLen / 2, -bladeWidth / 2);
    ctx.quadraticCurveTo(hiltLen / 2 + bladeLen * 0.5, -bladeWidth / 2 - curve, hiltLen / 2 + bladeLen, -curve);
    ctx.lineTo(hiltLen / 2 + bladeLen, -curve + 1.2);
    ctx.quadraticCurveTo(hiltLen / 2 + bladeLen * 0.5, bladeWidth / 2 - curve + 1.2, hiltLen / 2, bladeWidth / 2);
    ctx.closePath();
    ctx.fill();

    // Blade Edge Shimmer
    if (isAttacking) {
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(hiltLen / 2, -bladeWidth / 4);
      ctx.quadraticCurveTo(hiltLen / 2 + bladeLen * 0.5, -bladeWidth / 4 - curve, hiltLen / 2 + bladeLen, -curve);
      ctx.stroke();
    }

    ctx.restore();
  };

  if (singleOnly) {
    drawOne(0);
  } else {
    // Modo dual (apenas para fallback se não usar sockets)
    ctx.save();
    ctx.translate(0, -8);
    drawOne(Math.sin(time * 3) * 0.1);
    ctx.restore();

    ctx.save();
    ctx.translate(0, 8);
    drawOne(Math.cos(time * 3) * 0.1);
    ctx.restore();
  }
}


/** Draws a professional-grade AAA longsword */
function drawLongsword(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
  // Increase proportions for a larger, more impactful weapon
  // Pivô Estrutural: Centro do Cabo (Handle)
  // O cabo tem 10px de comprimento. Centro em x=0 -> Cabo de -5 a +5.
  const hiltLen = 10;
  const guardW = 16;
  const bladeLen = length - hiltLen;

  // 1. Hilt (Leather wrapped)
  ctx.fillStyle = '#1a0f08';
  ctx.fillRect(-hiltLen / 2, -2, hiltLen, 4);

  // Leather wraps detail - Ajustadas para o novo centro
  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const ox = -hiltLen / 2 + 1 + i * 1.8;
    ctx.beginPath();
    ctx.moveTo(ox, -2);
    ctx.lineTo(ox + 0.8, 2);
    ctx.stroke();
  }

  // 2. Heavy Weighted Pommel - No início do cabo
  const pommelGrad = ctx.createRadialGradient(-hiltLen / 2, 0, 0, -hiltLen / 2, 0, 3.5);
  pommelGrad.addColorStop(0, '#ffcc33');
  pommelGrad.addColorStop(1, '#aa8833');
  ctx.fillStyle = pommelGrad;
  ctx.beginPath();
  ctx.arc(-hiltLen / 2, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. Ornate Crossguard - Na junção com a lâmina (x = hiltLen/2)
  const silverGrad = ctx.createLinearGradient(hiltLen / 2, -guardW / 2, hiltLen / 2, guardW / 2);
  silverGrad.addColorStop(0, '#555555');
  silverGrad.addColorStop(0.2, '#aaaaaa');
  silverGrad.addColorStop(0.5, '#ffffff');
  silverGrad.addColorStop(1, '#444444');
  ctx.fillStyle = silverGrad;

  ctx.beginPath();
  ctx.moveTo(hiltLen / 2, -guardW / 2);
  ctx.bezierCurveTo(hiltLen / 2 - 4, -guardW / 4, hiltLen / 2 - 4, guardW / 4, hiltLen / 2, guardW / 2);
  ctx.lineTo(hiltLen / 2 + 3, guardW / 3);
  ctx.lineTo(hiltLen / 2 + 3, -guardW / 3);
  ctx.closePath();
  ctx.fill();

  // 4. Central Magical Gem - No centro da guarda
  const gemPulse = 0.8 + Math.sin(time * 5) * 0.2;
  const gemGrad = ctx.createRadialGradient(hiltLen / 2, 0, 0, hiltLen / 2, 0, 2.5);
  gemGrad.addColorStop(0, '#ffffff');
  gemGrad.addColorStop(1, '#0044ff');
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  ctx.arc(hiltLen / 2, 0, 2 * gemPulse, 0, Math.PI * 2);
  ctx.fill();

  // 5. Elite Blade - Começando após a guarda
  const bladeWidth = 3.2;
  const bladeGrad = ctx.createLinearGradient(hiltLen / 2 + 3, -bladeWidth, hiltLen / 2 + 3, bladeWidth);
  bladeGrad.addColorStop(0, '#444444');
  bladeGrad.addColorStop(0.5, '#e0f0ff');
  bladeGrad.addColorStop(1, '#333333');

  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(hiltLen / 2 + 3, -bladeWidth);
  ctx.lineTo(hiltLen / 2 + bladeLen - 5, -bladeWidth * 0.7);
  ctx.lineTo(hiltLen / 2 + bladeLen, 0);
  ctx.lineTo(hiltLen / 2 + bladeLen - 5, bladeWidth * 0.7);
  ctx.lineTo(hiltLen / 2 + 3, bladeWidth);
  ctx.closePath();
  ctx.fill();

  // 6. Deep Fuller (Central Groove)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(8, -0.8, bladeLen - 20, 1.6);

  // 7. Dynamic Blade Shimmer (Glint)
  const shineSpeed = isAttacking ? 20 : 4;
  const shinePos = (Math.sin(time * shineSpeed) * 0.5 + 0.5) * (bladeLen - 10) + 10;
  const g = ctx.createRadialGradient(shinePos, 0, 0, shinePos, 0, 6);
  g.addColorStop(0, 'rgba(135, 206, 250, 0.5)');
  g.addColorStop(1, 'rgba(100, 200, 255, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(shinePos, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}




/** Draws a professional-grade AAA Void Staff */
function drawVoidStaff(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
  const staffLen = length * 1.35;
  const shaftWidth = 3.5;

  // 1. Dark Ebonwood Shaft
  const shaftGrad = ctx.createLinearGradient(-staffLen + 10, 0, 0, 0);
  shaftGrad.addColorStop(0, '#020204'); // Deep midnight
  shaftGrad.addColorStop(0.4, '#0a0815'); // Dark violet wood
  shaftGrad.addColorStop(0.6, '#080510');
  shaftGrad.addColorStop(1, '#020204');

  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  // Tapered design
  ctx.moveTo(-staffLen + 10, -shaftWidth * 0.4);
  ctx.lineTo(0, -shaftWidth * 0.5);
  ctx.lineTo(2, 0); // Point
  ctx.lineTo(0, shaftWidth * 0.5);
  ctx.lineTo(-staffLen + 10, shaftWidth * 0.4);
  ctx.closePath();
  ctx.fill();

  // Ornate bindings
  ctx.fillStyle = '#2a283a';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-staffLen + 15 + i * (staffLen / 4), -shaftWidth * 0.6, 2, shaftWidth * 1.2);
  }

  // 2. The Void Head (Crescent structure)
  ctx.save();
  ctx.translate(14, 0);

  // Dark metallic structure
  ctx.fillStyle = '#0a0a0f';
  ctx.beginPath();
  ctx.arc(0, 0, 10, -Math.PI * 0.7, Math.PI * 0.7);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // 3. Floating Ethereal Core
  const corePulse = 0.95 + Math.sin(time * 4) * 0.05;
  const coreSize = 7 * corePulse;

  // Outer Glow
  const glowG = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
  glowG.addColorStop(0, 'rgba(160, 50, 255, 0.3)');
  glowG.addColorStop(1, 'rgba(80, 0, 120, 0)');
  ctx.fillStyle = glowG;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // The Core
  const orbGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
  orbGrad.addColorStop(0, '#ffffff'); // Heart
  orbGrad.addColorStop(0.2, '#aa66ff'); // Inner violet
  orbGrad.addColorStop(0.6, '#4b0082'); // Deep indigo
  orbGrad.addColorStop(1, '#050010');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // 4. Orbiting Shards
  for (let i = 0; i < 3; i++) {
    const orbitAngle = time * 2.5 + (i * Math.PI * 2 / 3);
    const orbitDist = 12 + Math.sin(time * 3 + i) * 2;
    const ox = Math.cos(orbitAngle) * orbitDist;
    const oy = Math.sin(orbitAngle) * orbitDist * 0.5;

    ctx.fillStyle = '#110022';
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(orbitAngle * 2);
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(1.5, 0); ctx.lineTo(0, 2); ctx.lineTo(-1.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** Draws the staff in its "Vertical" state for the player */
function drawVerticalStaff(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number, facingX: number) {
  ctx.save();
  // Fixed vertical rotation: always straight up with a tiny rhythmic sway
  const sway = Math.sin(time * 2.5) * 0.03;
  ctx.rotate(-Math.PI / 2 + sway);

  // Pivot Adjustment: Hand grasps about 1/3 up from the bottom
  // Move the staff UP so the head is higher and the tail also sits above the floor
  ctx.translate(28, 0);

  drawVoidStaff(ctx, length, isAttacking, time);
  ctx.restore();
}


/** ═══ WEAPON SELECTION OVERLAY ═══ */
export function renderWeaponSelectionOverlay(ctx: CanvasRenderingContext2D, selectedIndex: number, options: { id: WeaponType; name: string; desc: string; locked?: boolean }[], time: number, vp: Viewport) {
  const { rw, rh } = vp;
  const cx = rw / 2;
  const cy = rh / 2;
  const isMobileScreen = rw < 500 || rh < 380;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, rw, rh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const titleSize = isMobileScreen ? 18 : 24;
  ctx.font = `bold ${titleSize}px ${C.HUD_FONT}`;
  ctx.fillText('ESCOLHA SUA ARMA', cx, rh * 0.2);
  ctx.font = `${isMobileScreen ? 10 : 12}px ${C.HUD_FONT}`;
  ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
  if (isMobileScreen) {
    ctx.fillText('TOQUE na carta para selecionar', cx, rh * 0.28);
  } else {
    ctx.fillText('Aperte [A / D] para navegar  •  [ENTER] para confirmar  •  ou clique na carta', cx, rh * 0.25);
  }

  const cardW = isMobileScreen ? 78 : 90;
  const cardH = isMobileScreen ? 118 : 140;
  const spacing = isMobileScreen ? 12 : 20;
  const startX = cx - (options.length * (cardW + spacing) - spacing) / 2 + cardW / 2;

  options.forEach((opt, i) => {
    const isSelected = i === selectedIndex;
    const isLocked = opt.locked;
    const x = startX + i * (cardW + spacing);
    const y = cy + (isMobileScreen ? 12 : 0);
    const hover = (isSelected && !isLocked) ? Math.sin(time * 4) * 5 : 0;
    const scale = isSelected ? 1.1 : 1.0;

    ctx.save();
    ctx.translate(x, y + hover);
    ctx.scale(scale, scale);

    if (isLocked) {
      ctx.globalAlpha = 0.5;
    }

    // Mobile: tap glow on unlocked cards
    if (isMobileScreen && !isLocked) {
      const tapGlowAlpha = 0.08 + Math.sin(time * 3 + i) * 0.06;
      ctx.fillStyle = `rgba(80, 160, 255, ${tapGlowAlpha})`;
      ctx.fillRect(-cardW / 2 - 5, -cardH / 2 - 5, cardW + 10, cardH + 10);
    }

    // Card Background
    const cardGrad = ctx.createLinearGradient(0, -cardH / 2, 0, cardH / 2);
    if (isLocked) {
      cardGrad.addColorStop(0, '#0a0a0a');
      cardGrad.addColorStop(1, '#050505');
    } else {
      cardGrad.addColorStop(0, isSelected ? '#1a2a3a' : '#111111');
      cardGrad.addColorStop(1, isSelected ? '#0a0f1a' : '#050505');
    }

    ctx.fillStyle = cardGrad;
    ctx.strokeStyle = isSelected ? (isLocked ? '#666' : '#ffffff') : '#333333';
    ctx.lineWidth = isSelected ? 2 : 1;

    ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
    ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

    // Weapon Preview
    ctx.save();
    ctx.translate(0, -cardH / 2 + (isMobileScreen ? 42 : 55));
    ctx.rotate(-Math.PI / 4);
    if (isLocked) {
      ctx.filter = 'grayscale(100%) brightness(50%)';
    }
    const pDummy = { weapon: opt.id as WeaponType } as PlayerState;
    drawEquippedWeapon(ctx, pDummy, isMobileScreen ? 30 : 40, 0, time);
    ctx.restore();

    // Lock Icon
    if (isLocked) {
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.font = `${isMobileScreen ? 13 : 16}px serif`;
      ctx.fillText('🔒', 0, 0);
    }

    // Text Label
    ctx.fillStyle = isSelected ? (isLocked ? '#888' : '#ffffff') : '#444444';
    ctx.font = `bold ${isMobileScreen ? 11 : 13}px ${C.HUD_FONT}`;
    ctx.fillText(opt.name.toUpperCase(), 0, cardH / 2 - (isMobileScreen ? 22 : 30));

    ctx.fillStyle = isSelected ? (isLocked ? '#555' : '#33ccff') : '#333333';
    ctx.font = `${isMobileScreen ? 8 : 9}px ${C.HUD_FONT}`;
    ctx.fillText(opt.desc, 0, cardH / 2 - (isMobileScreen ? 10 : 15));

    // Mobile TAP hint
    if (isMobileScreen && !isLocked) {
      ctx.fillStyle = `rgba(100, 200, 255, ${0.5 + Math.sin(time * 4) * 0.3})`;
      ctx.font = `7px ${C.HUD_FONT}`;
      ctx.fillText('▼ TOQUE', 0, cardH / 2 - 1);
    }

    ctx.restore();
  });
}


export function renderEnemy(ctx: CanvasRenderingContext2D, e: EnemyState, time: number, floor: number = 1) {
  const biome = getBiome(floor);
  // Never render dead enemies — they must be removed from the list before rendering
  if (e.isDying) return;

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

  if (e.isDying) {
    ctx.fillStyle = '#1a0033'; // Deep dimensional purple
  } else if (e.flashTime > 0) {
    ctx.fillStyle = C.COLORS.white;
  } else {
    const colorMap: Record<string, string> = {
      chaser: C.COLORS.chaser, shooter: C.COLORS.shooter,
      tank: C.COLORS.tank, boss: C.COLORS.boss,
      wraith: C.COLORS.wraith, bomber: C.COLORS.bomber,
      swarm: C.COLORS.swarm, necromancer: C.COLORS.necromancer,
      stalker: C.COLORS.stalker, phantom: C.COLORS.phantom,
      flash_hunter: C.COLORS.flashHunter, distortion: C.COLORS.distortion,
      flicker_fiend: C.COLORS.flickerFiend, warper: C.COLORS.warper,
      accelerator: C.COLORS.accelerator, ranged: C.COLORS.ranged,
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
      break;
    }

    case 'necromancer': {
      // ═══ VOID CHANNELER - O Invocador de Almas ═══
      const hover = Math.sin(time * 3) * 5;
      const coreSpin = time * 1.5;
      const summonPulse = Math.max(0, 1 - (e.summonTimer / C.NECRO_SUMMON_COOLDOWN));

      // 1. FLOATING RITUAL CIRCLES
      ctx.strokeStyle = `rgba(150, 50, 255, ${0.3 + Math.sin(time * 8) * 0.1})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const angleOffset = i * Math.PI;
        ctx.beginPath();
        ctx.ellipse(x, y + hover, half + 12, (half + 12) * 0.3, coreSpin + angleOffset, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. SPECTRAL ROBES (Tattered and flowing)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : '#150025';
      ctx.beginPath();
      ctx.moveTo(x, y - half - 8 + hover);
      // Flowing sleeves
      ctx.lineTo(x + half + 6, y + hover);
      ctx.lineTo(x + 4, y + half + 10 + hover);
      ctx.lineTo(x - 4, y + half + 10 + hover);
      ctx.lineTo(x - half - 6, y + hover);
      ctx.closePath();
      ctx.fill();

      // 3. EYES OF THE ABYSS (Pulsing purple)
      const eyeGlow = 0.6 + Math.sin(time * 12) * 0.4;
      ctx.fillStyle = `rgba(200, 100, 255, ${eyeGlow})`;
      ctx.fillRect(x - 3, y - half + 2 + hover, 1.5, 3);
      ctx.fillRect(x + 1.5, y - half + 2 + hover, 1.5, 3);

      // 4. VOID CORE (The summoning heart)
      const coreSize = 4 + Math.sin(time * 10) * 1 + summonPulse * 4;
      const coreGrad = ctx.createRadialGradient(x, y + hover, 0, x, y + hover, coreSize);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#9933cc');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y + hover, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // Summoning rings (when ready to summon)
      if (e.summonTimer < 0.5) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - e.summonTimer * 2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y + hover, half + 20 - e.summonTimer * 20, 0, Math.PI * 2);
        ctx.stroke();
      }

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



    case 'ranged': {
      // ═══ GLINT SENTINEL - Crystalline Faceted Construct ═══
      const hover = Math.sin(time * 2) * 3;
      const crystalPulse = 0.5 + Math.sin(time * 4) * 0.5;

      // 1. HARD SURFACE BODY (Faceted Diamond Shape)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : biome.wallTop;
      ctx.beginPath();
      ctx.moveTo(x, y - half - 5 + hover);
      ctx.lineTo(x + half + 5, y + hover);
      ctx.lineTo(x, y + half + 5 + hover);
      ctx.lineTo(x - half - 5, y + hover);
      ctx.closePath();
      ctx.fill();

      // 2. FACET SHADING
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(x, y - half - 5 + hover);
      ctx.lineTo(x + half + 5, y + hover);
      ctx.lineTo(x, y + hover);
      ctx.fill();

      // 3. CORE ENERGY (Biome specific)
      const cGrad = ctx.createRadialGradient(x, y + hover, 0, x, y + hover, 8);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(1, biome.accent);
      ctx.fillStyle = cGrad;
      ctx.shadowBlur = 12 * crystalPulse;
      ctx.shadowColor = biome.accent;
      ctx.beginPath();
      ctx.arc(x, y + hover, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }

    case 'accelerator': {
      // ═══ SPECTRAL BOLIDE - High-speed Energy Entity ═══
      const speed = e.stealthAlpha; // Reusing internal state for visual speed
      const stretch = 15 * speed;

      // 1. DYNAMIC ENERGY TRAIL
      const tGrad = ctx.createLinearGradient(x - half - stretch - 20, y, x, y);
      tGrad.addColorStop(0, 'rgba(0,0,0,0)');
      tGrad.addColorStop(1, biome.accentGlow.replace('0.2', '0.6'));
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(x - half - 30 - stretch, y);
      ctx.lineTo(x, y - half);
      ctx.lineTo(x, y + half);
      ctx.closePath();
      ctx.fill();

      // 2. PROJECTILE CORE (Needle)
      ctx.fillStyle = e.flashTime > 0 ? C.COLORS.white : (biome.theme === 'volcano' ? '#1a0505' : '#05051a');
      ctx.beginPath();
      ctx.moveTo(x + half + 10, y);
      ctx.lineTo(x - half - stretch, y - 4);
      ctx.lineTo(x - half - stretch, y + 4);
      ctx.closePath();
      ctx.fill();

      // 3. WAKE SPARK (Rim highlight)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }

    case 'boss': {
      const breathe = Math.sin(time * 2) * 1;
      switch (floor) {
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
    ctx.fillStyle = e.hp / e.maxHp > 0.3 ? C.COLORS.hpFill : '#cc2200';
    ctx.fillRect(bx, by, barW_hp * (e.hp / e.maxHp), barH_hp);
  }
}

export function renderEssenceCores(ctx: CanvasRenderingContext2D, cores: EssenceCore[], time: number) {
  for (const core of cores) {
    const isBoss = core.type === 'boss';
    const s = (isBoss ? 8 : 4) + Math.sin(time * 10) * 1;

    ctx.save();
    // Glow
    const gradient = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, s * 2.5);
    gradient.addColorStop(0, 'rgba(106, 13, 173, 0.4)');
    gradient.addColorStop(1, 'rgba(106, 13, 173, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(core.x, core.y, s * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pulse Core
    const pulse = 0.8 + Math.sin(time * 8) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ac4dff';
    ctx.beginPath();
    ctx.arc(core.x, core.y, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Middle spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(core.x, core.y, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

/**
 * ProjectileOrigin: Identifies the free hand socket for channeled attacks
 */
export const ProjectileOrigin = {
  getHandSocket(p: PlayerState, time: number): { x: number, y: number } {
    const frameOrFrames = getSpriteFrameForFacing(p);
    const moves = p.isMoving || p.isDashing || p.meleeAttacking;
    const currentFrame = Array.isArray(frameOrFrames)
      ? frameOrFrames[Math.floor(time * (moves ? 10 : 1.2)) % frameOrFrames.length]
      : frameOrFrames;

    const isBackFrame = currentFrame.src.includes('costa');

    // Auto-identify free hand: 
    // Sword/Staff uses Right Hand for weapon, so Left Hand is free.
    // Daggers uses both, we pick Left Hand as the ritual/cast hand.
    const useLeftHand = true;

    const socket = useLeftHand
      ? (isBackFrame ? SOCKET_BACK_L : SOCKET_FRONT_L)
      : (isBackFrame ? SOCKET_BACK_R : SOCKET_FRONT_R);

    let sx = socket.x;
    if (currentFrame.flipX) sx *= -1;

    return { x: sx, y: socket.y };
  }
};

/**
 * StaffPositioning: Specific sockets and logic for the Void Staff
 */
export const StaffPositioning = {
  getHandSocket(p: PlayerState, time: number): { x: number, y: number } {
    const frameOrFrames = getSpriteFrameForFacing(p);
    const moves = p.isMoving || p.isDashing || p.meleeAttacking;
    const currentFrame = Array.isArray(frameOrFrames)
      ? frameOrFrames[Math.floor(time * (moves ? 10 : 1.2)) % frameOrFrames.length]
      : frameOrFrames;

    const isBackFrame = currentFrame.src.includes('costa');
    // Staff always in primary hand (usually Right Hand)
    const socket = currentFrame.handSocket || (isBackFrame ? SOCKET_BACK_R : SOCKET_FRONT_R);

    let sx = socket.x;
    if (currentFrame.flipX) sx *= -1;

    return { x: sx, y: socket.y };
  },

  getTipSocketWorld(p: PlayerState, time: number): { x: number, y: number } {
    const hand = this.getHandSocket(p, time);
    // Tip is 48px above hand in vertical pose
    return { x: p.x + hand.x, y: p.y + hand.y - 48 };
  }
};

/**
 * HandCastEffect: Visual feedback on the hand before firing
 */
export const HandCastEffect = {
  render(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
    if (!p.isRangedCharging) return;

    const socket = ProjectileOrigin.getHandSocket(p, time);
    const hx = p.x + socket.x;
    const hy = p.y + socket.y;

    // 0.2s charge duration
    const progress = Math.max(0, 1 - p.rangedChargeTimer / 0.17);

    ctx.save();

    // Core Glow (Roxo Escuro Elegante)
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8 * progress);
    g.addColorStop(0, 'rgba(200, 160, 255, 0.9)'); // Bright core
    g.addColorStop(0.5, 'rgba(100, 30, 220, 0.4)'); // Purple energy
    g.addColorStop(1, 'rgba(40, 0, 80, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, 12 * progress, 0, Math.PI * 2);
    ctx.fill();

    // Pulse effect
    const pulse = 1 + Math.sin(time * 25) * 0.2;
    ctx.strokeStyle = 'rgba(180, 100, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, (6 + Math.sin(time * 15) * 2) * progress, 0, Math.PI * 2);
    ctx.stroke();

    // Swirling particles
    for (let i = 0; i < 3; i++) {
      const ang = time * 8 + i * (Math.PI * 2 / 3);
      const dist = 6 + Math.sin(time * 10 + i) * 2;
      ctx.fillStyle = 'rgba(220, 180, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(hx + Math.cos(ang) * dist, hy + Math.sin(ang) * dist, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  renderFlash(particles: Particle[], x: number, y: number) {
    // Quick flash at hand on fire
    particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.08, maxLife: 0.08,
      size: 18, color: '#ffffff',
      type: 'explosion'
    });
  }
};

/**
 * EnemyProjectileVisual
 * Dispatches to the correct per-kind renderer based on projectileKind tag.
 */
export const EnemyProjectileVisual = {
  render(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    const alpha = Math.max(0, p.lifetime / (p.maxLifetime || 1));
    ctx.save();
    ctx.globalAlpha = alpha;
    switch (p.projectileKind) {
      case 'needle': this._drawNeedle(ctx, p, time); break;
      case 'heavy': this._drawHeavy(ctx, p, time); break;
      case 'boss_orb': this._drawBossOrb(ctx, p, time); break;
      case 'boss_arc': this._drawBossArc(ctx, p, time); break;
      case 'boss_void': this._drawBossVoid(ctx, p, time); break;
      case 'boss_frag': this._drawBossFrag(ctx, p, time); break;
      default: this._drawBasic(ctx, p, time); break;
    }
    ctx.restore();
  },

  _drawBasic(ctx: CanvasRenderingContext2D, p: ProjectileState, _time: number) {
    const r = p.size;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.8);
    g.addColorStop(0, 'rgba(255, 80, 80, 0.95)');
    g.addColorStop(0.5, 'rgba(160, 20, 20, 0.7)');
    g.addColorStop(1, 'rgba(80, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 200, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawNeedle(ctx: CanvasRenderingContext2D, p: ProjectileState, _time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const len = p.size * 5.5;
    const w = p.size * 0.45;
    const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
    g.addColorStop(0, 'rgba(255, 140, 0, 0)');
    g.addColorStop(0.35, 'rgba(255, 200, 80, 0.9)');
    g.addColorStop(0.75, 'rgba(255, 255, 160, 1)');
    g.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2, w, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(len * 0.35, 0, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _drawHeavy(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    const r = p.size;
    const pulse = 1 + Math.sin(time * 8 + p.x) * 0.18;
    const rp = r * pulse;
    const aura = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rp * 2.8);
    aura.addColorStop(0, 'rgba(255, 60, 0, 0.3)');
    aura.addColorStop(1, 'rgba(180, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rp * 2.8, 0, Math.PI * 2);
    ctx.fill();
    const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rp);
    core.addColorStop(0, '#ffcc44');
    core.addColorStop(0.4, '#ff5500');
    core.addColorStop(1, '#220000');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.5 + Math.sin(time * 10) * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rp * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  },

  _drawBossOrb(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    const r = p.size;
    const pulse = 1 + Math.sin(time * 12) * 0.12;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * pulse * 2.2);
    g.addColorStop(0, 'rgba(220, 180, 255, 1)');
    g.addColorStop(0.3, 'rgba(120, 40, 220, 0.9)');
    g.addColorStop(0.7, 'rgba(50, 0, 120, 0.6)');
    g.addColorStop(1, 'rgba(20, 0, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.4 * pulse, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawBossArc(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const w = p.size * 2.4;
    const h = p.size * 0.65;
    const wobble = Math.sin(time * 20) * 0.8;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 40, 200, 0.8)';
    ctx.fillStyle = 'rgba(20, 20, 200, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-w / 2, wobble);
    ctx.quadraticCurveTo(0, -h + wobble, w / 2, wobble);
    ctx.quadraticCurveTo(0, h + wobble, -w / 2, wobble);
    ctx.fill();
    ctx.shadowBlur = 0;
    const cg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    cg.addColorStop(0, 'rgba(100, 180, 255, 0)');
    cg.addColorStop(0.5, 'rgba(180, 220, 255, 0.9)');
    cg.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-w / 2, wobble);
    ctx.quadraticCurveTo(0, -h * 0.4 + wobble, w / 2, wobble);
    ctx.quadraticCurveTo(0, h * 0.4 + wobble, -w / 2, wobble);
    ctx.fill();
    ctx.restore();
  },

  _drawBossVoid(ctx: CanvasRenderingContext2D, p: ProjectileState, _time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const len = p.size * 5;
    const w = p.size * 0.6;
    const tg = ctx.createLinearGradient(-len * 0.8, 0, 0, 0);
    tg.addColorStop(0, 'rgba(0, 255, 220, 0)');
    tg.addColorStop(1, 'rgba(0, 200, 180, 0.2)');
    ctx.fillStyle = tg;
    ctx.fillRect(-len * 0.8, -w * 2, len * 0.8, w * 4);
    const bg = ctx.createLinearGradient(0, -w, 0, w);
    bg.addColorStop(0, 'rgba(100, 255, 240, 0)');
    bg.addColorStop(0.4, 'rgba(220, 255, 255, 0.95)');
    bg.addColorStop(0.6, 'rgba(220, 255, 255, 0.95)');
    bg.addColorStop(1, 'rgba(100, 255, 240, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.5, w, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(len * 0.42, 0, w * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _drawBossFrag(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 6 + p.x * 0.1);
    const s = p.size;
    const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.8);
    aura.addColorStop(0, 'rgba(255, 80, 200, 0.4)');
    aura.addColorStop(1, 'rgba(100, 0, 200, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, s * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 120, 255, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.6);
    ctx.lineTo(s * 1.1, -s * 0.4);
    ctx.lineTo(s * 0.7, s * 1.2);
    ctx.lineTo(-s * 0.5, s * 0.9);
    ctx.lineTo(-s * 1.2, -s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe0ff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

/**
 * ProjectileVisual: Logic for drawing the "Corte de Vácuo Energizado"
 */
export const ProjectileVisual = {
  render(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
    if (!p.isPlayerOwned) {
      EnemyProjectileVisual.render(ctx, p, time);
      return;
    }

    const lifeRatio = Math.max(0, p.lifetime / p.maxLifetime);

    if (p.projectileKind === 'staff_bolt') {
      this._renderStaffBolt(ctx, p, time, lifeRatio);
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    ctx.globalAlpha = Math.min(1, lifeRatio * 1.5);

    // 1. Light Trail (Rastro leve)
    const trailLen = 22;
    const trailAlpha = 0.12 * lifeRatio;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(160, 80, 255, ${trailAlpha})`;
    ctx.lineWidth = p.size * 0.4;
    ctx.lineCap = 'round';
    ctx.moveTo(-trailLen, 0);
    ctx.quadraticCurveTo(-trailLen / 2, 2, 0, 0);
    ctx.stroke();

    // 2. High Presence Slash Shape (Presença clara e marcante)
    const w = p.size * 1.5; // Wider for presence
    const h = p.size * 0.45; // Thicker

    // Elegant Dark Purple Borders
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(60, 0, 120, 0.9)';

    const wobble = Math.sin(time * 30) * 1.2;

    // Outer Border (Dark Purple with center fade)
    const bGrad = ctx.createLinearGradient(0, -h, 0, h);
    bGrad.addColorStop(0, 'rgba(80, 0, 150, 0)');
    bGrad.addColorStop(0.5, 'rgba(100, 30, 220, 0.95)');
    bGrad.addColorStop(1, 'rgba(80, 0, 150, 0)');

    ctx.fillStyle = 'rgba(60, 0, 140, 0.95)';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0 + wobble);
    ctx.quadraticCurveTo(0, -h + wobble, w / 2, 0 + wobble);
    ctx.quadraticCurveTo(0, h + wobble, -w / 2, 0 + wobble);
    ctx.fill();

    // Core (Lighter center / White core)
    const coreH = h * 0.5;
    const coreW = w * 0.75;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreW / 2);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(1, 'rgba(200, 150, 255, 0.5)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(-coreW / 2, 0 + wobble);
    ctx.quadraticCurveTo(0, -coreH + wobble, coreW / 2, 0 + wobble);
    ctx.quadraticCurveTo(0, coreH + wobble, -coreW / 2, 0 + wobble);
    ctx.fill();

    // 3. Air Distortion 
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -2);
    ctx.lineTo(-w / 2 - 5, -8);
    ctx.stroke();

    ctx.restore();
  },

  _renderStaffBolt(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number, lifeRatio: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Scaling and alpha based on life
    const scale = 0.8 + (1 - lifeRatio) * 0.4;
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, lifeRatio * 2);

    // 1. Elegant Trail (Ethereal ribbon)
    const trailLen = 30;
    const trailG = ctx.createLinearGradient(-trailLen, 0, 0, 0);
    trailG.addColorStop(0, 'rgba(100, 0, 200, 0)');
    trailG.addColorStop(0.5, 'rgba(150, 50, 255, 0.2)');
    trailG.addColorStop(1, 'rgba(200, 150, 255, 0.5)');

    ctx.fillStyle = trailG;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.quadraticCurveTo(-trailLen / 2, -p.size * 1.5, -trailLen, 0);
    ctx.quadraticCurveTo(-trailLen / 2, p.size * 1.5, 0, p.size);
    ctx.fill();

    // 2. Air Distortion Bloom (Refraction effect)
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.fillStyle = 'rgba(200, 220, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 2.2, p.size * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Dimensional Nucleus (The crystal)
    const auraG = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.5);
    auraG.addColorStop(0, 'rgba(180, 100, 255, 0.6)');
    auraG.addColorStop(1, 'rgba(80, 0, 150, 0)');
    ctx.fillStyle = auraG;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#8844ff';

    ctx.beginPath();
    const cw = p.size * 1.2;
    const ch = p.size * 0.6;
    ctx.moveTo(cw, 0); ctx.lineTo(0, -ch); ctx.lineTo(-cw, 0); ctx.lineTo(0, ch);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },
};

/**
 * StaffChargeEffect: Visual accumulation on staff tip
 */
export const StaffChargeEffect = {
  render(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
    if (!p.isStaffCharging) return;
    const tip = StaffPositioning.getTipSocketWorld(p, time);

    ctx.save();
    ctx.translate(tip.x, tip.y);
    const progress = 1 - (p.staffChargeTimer / 0.26);
    const pulse = 1 + Math.sin(time * 30) * 0.2;
    const size = 15 * progress * pulse;

    const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.4, 'rgba(150, 50, 255, 0.9)');
    bloom.addColorStop(1, 'rgba(80, 0, 120, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
};

/**
 * StaffImpactEffect: AAA dimensional explosion
 */
export const StaffImpactEffect = {
  spawn(particles: Particle[], x: number, y: number) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, size: 45, color: '#ffffff', type: 'explosion'
    });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, s = 150 + Math.random() * 150;
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.3, maxLife: 0.7, size: 2 + Math.random() * 4,
        color: i % 2 === 0 ? '#aa66ff' : '#00ffff', type: 'spark'
      });
    }
  }
};

export function renderProjectile(ctx: CanvasRenderingContext2D, p: ProjectileState, time: number) {
  ProjectileVisual.render(ctx, p, time);
}

/**
 * ImpactEffect: Visual feedback for Vacuum Slash hitting a target
 */
export const ImpactEffect = {
  spawn(particles: Particle[], x: number, y: number) {
    // Flash at impact point
    particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.15, maxLife: 0.15,
      size: 20, color: 'rgba(255, 255, 255, 0.82)',
      type: 'explosion'
    });

    // Cutting particles dispersing
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#ffffff' : '#8844ff',
        type: 'spark'
      });
    }
  }
};

export function spawnVacuumImpact(particles: Particle[], x: number, y: number) {
  ImpactEffect.spawn(particles, x, y);
}

/**
 * EnemyProjectileImpact
 * Dispatches unique visual feedback based on projectileKind.
 */
export const EnemyProjectileImpact = {
  spawn(particles: Particle[], p: ProjectileState) {
    const x = p.x, y = p.y;
    switch (p.projectileKind) {
      case 'needle':
        // Sharp orange spark
        for (let i = 0; i < 4; i++) {
          const a = p.angle + Math.PI + (Math.random() - 0.5) * 1.5;
          const s = 100 + Math.random() * 80;
          particles.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.2, maxLife: 0.2, size: 1.5, color: '#ffcc00', type: 'spark'
          });
        }
        break;
      case 'heavy':
        // Dark crimson explosion
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 40 + Math.random() * 60;
          particles.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.4, maxLife: 0.4, size: 3, color: '#aa0000', type: 'spark'
          });
        }
        break;
      case 'boss_void':
        // Purple void dispersion
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 20 + Math.random() * 40;
          particles.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.6, maxLife: 0.6, size: 4, color: '#4400aa', type: 'ghost'
          });
        }
        break;
      case 'boss_orb':
      case 'boss_arc':
      case 'boss_frag':
        // Azure/Cyan mystical explosion
        for (let i = 0; i < 15; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 50 + Math.random() * 70;
          particles.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.5, maxLife: 0.5, size: 2.5, color: '#00ffff', type: 'spark'
          });
        }
        particles.push({
          x, y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, size: 30, color: 'rgba(0, 255, 255, 0.4)', type: 'explosion'
        });
        break;
      default:
        // Standard red impact
        particles.push({
          x, y, vx: 0, vy: 0, life: 0.1, maxLife: 0.1, size: 15, color: '#ff4444', type: 'explosion'
        });
        break;
    }
  }
};

/**
 * Render a Dimensional Rift (Victory/Progression Portal)
 */
export function renderDimensionalRift(ctx: CanvasRenderingContext2D, portal: Portal, time: number, playerX: number, playerY: number) {
  const { x, y, state } = portal;
  const dx = playerX - x;
  const dy = playerY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Proximity pulsation factor
  const isNear = dist < 70;
  const proximityMult = isNear ? 2.5 : 1.0;
  const pulse = Math.sin(time * 3 * proximityMult) * 0.1 + 0.95;

  ctx.save();
  ctx.translate(x, y);

  // 1. Extreme Ambient Glow
  const glowAlpha = (state === 'locked' ? 0.2 : state === 'completed' ? 0.1 : 0.5) * pulse;
  const baseColor = state === 'completed' ? '120, 100, 180' : '100, 40, 255';
  const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 80 * pulse);
  glowGrad.addColorStop(0, `rgba(${baseColor}, ${glowAlpha})`);
  glowGrad.addColorStop(0.4, `rgba(${baseColor}, ${glowAlpha * 0.5})`);
  glowGrad.addColorStop(1, `rgba(${baseColor}, 0)`);
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 50 * pulse, 100 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. The Void Core (Smooth Ellipse)
  ctx.fillStyle = '#010003';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18 * pulse, 62 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Dimensional Energy Layers (Jagged shimmering edges)
  const layerCount = 2;
  for (let l = 0; l < layerCount; l++) {
    const lPulse = Math.sin(time * 4 + l) * 0.1 + 1.0;
    ctx.strokeStyle = l === 0 ? `rgba(180, 100, 255, ${0.4 * pulse})` : `rgba(220, 180, 255, ${0.2 * pulse})`;
    ctx.lineWidth = l === 0 ? 2 : 1;
    ctx.beginPath();
    const h = (65 + l * 5) * pulse;
    const w = (22 + l * 4) * pulse;
    ctx.moveTo(0, -h);
    for (let i = -h; i <= h; i += 8) {
      const taper = 1 - Math.pow(i / h, 2);
      const noise = Math.sin(time * 5 + i * 0.3) * 4;
      ctx.lineTo((w + noise) * taper, i);
    }
    for (let i = h; i >= -h; i -= 8) {
      const taper = 1 - Math.pow(i / h, 2);
      const noise = Math.cos(time * 4 - i * 0.25) * 4;
      ctx.lineTo((-w + noise) * taper, i);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 4. Vortex Suction Particles (Vibrant energy spiraling in)
  if (state === 'available') {
    const particleCount = isNear ? 20 : 10;
    for (let i = 0; i < particleCount; i++) {
      const seed = (i * Math.E) + (portal.id.length * 0.7);
      const pTime = (time * 0.6 + seed) % 1;
      const pDist = (100 * (1 - pTime)) + 4;
      // Spiral motion: angle increases as it gets closer
      const spiralSpeed = 8;
      const pAngle = (seed * 15) + (pTime * spiralSpeed);

      const px = Math.cos(pAngle) * pDist;
      const py = Math.sin(pAngle) * pDist;

      const size = 1.2 + pTime * 1.5;
      ctx.fillStyle = `rgba(180, 140, 255, ${0.4 + pTime * 0.6})`;
      ctx.fillRect(px, py, size, size);

      // Secondary trailing glow for particles
      if (isNear) {
        ctx.fillStyle = `rgba(100, 50, 255, ${0.4 * pTime})`;
        ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
      }
    }
  }

  ctx.restore();

  // 5. Majestic Prompt (Exactly as requested)
  if (state !== 'locked' && state !== 'completed' && dist < 100) {
    ctx.save();
    ctx.textAlign = 'center';

    const floatY = Math.sin(time * 4) * 4;
    const alpha = 0.7 + Math.sin(time * 3) * 0.25;

    ctx.shadowBlur = 12;
    ctx.shadowColor = 'black';

    ctx.fillStyle = `rgba(210, 190, 255, ${alpha})`;
    ctx.font = `700 11px ${C.HUD_FONT}`;
    ctx.fillText('AVANÇAR PARA PRÓXIMO ANDAR', x, y - 82 + floatY);

    ctx.font = `600 9px ${C.HUD_FONT}`;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillText('APROXIME-SE OU PRESSIONE [E]', x, y - 68 + floatY);
    ctx.restore();
  }
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
    } else if (p.type === 'explosion') {
      ctx.globalAlpha = alpha * 0.5;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'dimensional_shard') {
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;

      const size = p.size * (0.8 + alpha * 0.4); // slightly shrink
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.angle !== undefined) ctx.rotate(p.angle);

      // Draw a sharp diamond/shard shape
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.5);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size * 1.5);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (p.type === 'spark') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), Math.ceil(p.size), Math.ceil(p.size));
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
  ctx.fillStyle = '#6a0dad'; // Dimensional Glow Purple
  ctx.beginPath();
  ctx.moveTo(scx, scy - scSize);
  ctx.lineTo(scx + scSize * 0.7, scy);
  ctx.lineTo(scx, scy + scSize);
  ctx.lineTo(scx - scSize * 0.7, scy);
  ctx.closePath();
  ctx.fill();
  // Inner bright core
  ctx.fillStyle = '#ac4dff'; // Glow Light
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
  drawHudText(ctx, `${Math.floor(player.souls)}`, scx + scSize + 4, hpY + Math.round(soulH * 0.7), '#ac4dff');

  // --- Level Badge ---
  const lvlBadgeX = lvlX + soulW + 4;
  const lvlW = Math.round(44 * ms);
  const lvlH = Math.round(20 * ms);
  ctx.fillStyle = 'rgba(20, 20, 60, 0.85)';
  ctx.fillRect(lvlBadgeX, hpY, lvlW, lvlH);
  ctx.strokeStyle = '#ac4dff';
  ctx.lineWidth = 1;
  ctx.strokeRect(lvlBadgeX, hpY, lvlW, lvlH);
  ctx.font = `500 ${Math.round(11 * ms)}px ${C.HUD_FONT}`;
  ctx.textAlign = 'left';
  drawHudText(ctx, `Nv.${player.level}`, lvlBadgeX + 4, hpY + Math.round(lvlH * 0.7), '#ccaaee');

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
  if (!room) return; // Safety guard
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
    // Special objective for boss victory (portal spawned)
    if (room.isBossRoom) {
      const boxW = Math.round(260 * ms);
      ctx.fillStyle = `rgba(30, 0, 50, ${0.7 * pulse})`;
      ctx.fillRect(C.dims.gw / 2 - boxW / 2, 2, boxW, objBarH + 4);
      ctx.fillStyle = `rgba(200, 100, 255, ${pulse})`;
      ctx.font = `600 ${objFontSize}px ${C.HUD_FONT}`;
      ctx.textAlign = 'center';
      drawHudText(ctx, 'ENTRE NA FENDA DIMENSIONAL', C.dims.gw / 2, 2 + Math.round((objBarH + 4) * 0.75), `rgba(200, 100, 255, ${pulse})`, 1.2);
    } else if (room.type === 'shrine' && !room.shrineUsed) {
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
      const neighbor = dungeon.rooms.get(roomKey(room.gridX + 1, room.gridY));
      const show = visited || neighbor?.visited;
      if (show && neighbor) {
        const both = visited && neighbor.visited;
        ctx.strokeStyle = both ? 'rgba(100, 110, 150, 0.8)' : 'rgba(70, 75, 100, 0.4)';
        ctx.beginPath();
        ctx.moveTo(rx + cellSize / 2, ry);
        ctx.lineTo(rx + cellSize / 2 + gap, ry);
        ctx.stroke();
      }
    }
    if (room.doors.south && dungeon.rooms.has(roomKey(room.gridX, room.gridY + 1))) {
      const neighbor = dungeon.rooms.get(roomKey(room.gridX, room.gridY + 1));
      const show = visited || neighbor?.visited;
      if (show && neighbor) {
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
      // Intensity should multiply the peak alpha
      const peakAlpha = 0.35 * fx.intensity;
      const alpha = (fx.timer / fx.duration) * peakAlpha;

      // Robust replace: only replace the first occurrence of rgb/rgba to avoid errors
      let color = fx.color;
      if (!color.includes('rgba')) {
        color = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
      } else {
        // If already rgba, we must be careful. For simplicity, we use globalAlpha for the whole operation
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fx.color;
        ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
        ctx.restore();
        continue;
      }

      ctx.fillStyle = color;
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
  }
}

/**
 * Biome Ambient Screen Effects: Full-screen immersion layers
 */
export function renderBiomeAmbientFX(ctx: CanvasRenderingContext2D, time: number, floor: number, vp: Viewport) {
  const biome = getBiome(floor);
  const { rw, rh, gox, goy } = vp;

  ctx.save();

  if (biome.theme === 'crystal') {
    // 1. FROST VIGNETTE / COLD MIST
    const fGrad = ctx.createRadialGradient(rw / 2, rh / 2, rh / 4, rw / 2, rh / 2, rh / 0.8);
    fGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fGrad.addColorStop(0.7, 'rgba(150, 220, 255, 0.05)');
    fGrad.addColorStop(1, 'rgba(200, 240, 255, 0.22)');
    ctx.fillStyle = fGrad;
    ctx.fillRect(-gox, -goy, rw, rh);

    // 2. FALLING SNOW / ICE CRYSTALS
    for (let i = 0; i < 25; i++) {
      const timeOffset = time * (0.4 + (i % 5) * 0.1);
      const drift = Math.sin(timeOffset + i) * 20;
      const x = (i * 137 + drift) % rw - gox;
      const y = ((time * 35 + i * 45) % (rh + 60)) - goy - 30;
      const size = 1 + (i % 3) * 0.8;

      ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(180, 235, 255, 0.4)';
      ctx.beginPath();
      if (i % 2 === 0) {
        // Hexagonal snowflake-ish shape (simple cross)
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
      } else {
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. FROST ON EDGES (Slightly opaque frozen patterns)
    ctx.strokeStyle = 'rgba(220, 245, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const edgeX = i % 2 === 0 ? -gox : rw - gox - 20;
      const edgeY = i < 2 ? -goy : rh - goy - 20;
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(edgeX + 20, edgeY + 20);
      ctx.stroke();
    }
  }
  else if (biome.theme === 'forest') {
    // 1. FALLING LEAVES (Slow & Drifting)
    for (let i = 0; i < 10; i++) {
      const drift = Math.sin(time * 0.8 + i) * 40;
      const x = (i * 233 + drift) % rw - gox;
      const y = ((time * 25 + i * 80) % (rh + 40)) - goy - 20;

      ctx.fillStyle = (i % 2 === 0) ? '#4a8a3b' : '#2a5a27';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. MAGICAL FIREFLIES (Moving in arcs)
    ctx.shadowBlur = 4;
    for (let i = 0; i < 8; i++) {
      const arcX = Math.cos(time * 0.3 + i) * 50;
      const arcY = Math.sin(time * 0.5 + i * 2) * 30;
      const x = (i * 300 + arcX) % rw - gox;
      const y = (i * 150 + arcY) % rh - goy;

      ctx.shadowColor = biome.accent;
      ctx.fillStyle = biome.accent;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + Math.sin(time * 2 + i) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  else if (biome.theme === 'volcano') {
    // 1. HEAT DISTORTION WAVES (Semi-transparent overlay bands)
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 3; i++) {
      const vPos = (time * 40 + i * 150) % rh;
      const hShift = Math.sin(time * 2 + i) * 10;
      ctx.fillStyle = 'rgba(255, 100, 0, 0.03)';
      ctx.fillRect(-gox + hShift, vPos - goy, rw, 40);
    }
    ctx.globalCompositeOperation = 'source-over';

    // 2. DENSE ASH & EMBERS
    for (let i = 0; i < 30; i++) {
      const h = (i * 131 + Math.sin(time * 1.2 + i) * 20) % rw - gox;
      const v = (rh - (time * 45 + i * 90) % (rh + 40)) - goy;

      const isRed = i % 3 === 0;
      ctx.fillStyle = isRed ? `rgba(255, 60, 0, ${0.4 + Math.random() * 0.4})` : 'rgba(80, 80, 80, 0.3)';
      const size = isRed ? 1.5 : 2.5;
      ctx.fillRect(h, v, size, size);

      if (isRed && Math.random() > 0.8) {
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#ff3300';
        ctx.fillRect(h, v, 1, 1);
        ctx.shadowBlur = 0;
      }
    }
  }

  ctx.restore();
}
