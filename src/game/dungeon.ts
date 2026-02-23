import { DungeonMap, DungeonRoom, EnemySpawn, EnemyType, Obstacle, TrapType, RoomLayout } from './types';
import * as C from './constants';
import { generateHiddenTraps } from './traps';

function roomKey(x: number, y: number): string {
  return `${x},${y}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRoomSafeZones(room: DungeonRoom): Obstacle[] {
  const zones: Obstacle[] = [];
  const midX = C.dims.gw / 2;
  const midY = C.dims.gh / 2;
  const margin = 80;
  const doorWidth = 120;

  if (room.doors.north) zones.push({ x: midX - doorWidth / 2, y: 0, w: doorWidth, h: margin });
  if (room.doors.south) zones.push({ x: midX - doorWidth / 2, y: C.dims.gh - margin, w: doorWidth, h: margin });
  if (room.doors.west) zones.push({ x: 0, y: midY - doorWidth / 2, w: margin, h: doorWidth });
  if (room.doors.east) zones.push({ x: C.dims.gw - margin, y: midY - doorWidth / 2, w: margin, h: doorWidth });

  // Also protect the exact center for special rooms or portals
  zones.push({ x: midX - 40, y: midY - 40, w: 80, h: 80 });

  return zones;
}

function rectIntersect(r1: Obstacle, r2: Obstacle): boolean {
  return !(r2.x >= r1.x + r1.w || r2.x + r2.w <= r1.x || r2.y >= r1.y + r1.h || r2.y + r2.h <= r1.y);
}

function checkConnectivity(room: DungeonRoom, obstacles: Obstacle[]): boolean {
  const gridW = Math.floor(C.dims.gw / C.TILE_SIZE);
  const gridH = Math.floor(C.dims.gh / C.TILE_SIZE);
  const grid = Array(gridW * gridH).fill(true);

  for (const o of obstacles) {
    const startX = Math.floor(o.x / C.TILE_SIZE);
    const startY = Math.floor(o.y / C.TILE_SIZE);
    const endX = Math.ceil((o.x + o.w) / C.TILE_SIZE);
    const endY = Math.ceil((o.y + o.h) / C.TILE_SIZE);
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
          grid[y * gridW + x] = false;
        }
      }
    }
  }

  const doorNodes: { x: number, y: number }[] = [];
  if (room.doors.north) doorNodes.push({ x: Math.floor(gridW / 2), y: 1 });
  if (room.doors.south) doorNodes.push({ x: Math.floor(gridW / 2), y: gridH - 2 });
  if (room.doors.west) doorNodes.push({ x: 1, y: Math.floor(gridH / 2) });
  if (room.doors.east) doorNodes.push({ x: gridW - 2, y: Math.floor(gridH / 2) });

  if (doorNodes.length <= 1) return true;

  const start = doorNodes[0];
  const q = [start];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  let foundCount = 0;
  while (q.length > 0) {
    const curr = q.shift()!;
    if (doorNodes.some(d => d.x === curr.x && d.y === curr.y)) {
      foundCount++;
    }

    const neighbors = [
      { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
      { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 }
    ];
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (n.x >= 0 && n.x < gridW && n.y >= 0 && n.y < gridH && grid[n.y * gridW + n.x] && !visited.has(key)) {
        visited.add(key);
        q.push(n);
      }
    }
  }

  return foundCount === doorNodes.length;
}

function getEnemyTypes(floor: number): EnemyType[] {
  const types: EnemyType[] = ['chaser', 'chaser', 'swarm'];
  if (floor >= 1) types.push('shooter', 'swarm', 'swarm', 'flicker_fiend');
  if (floor >= 2) types.push('bomber', 'wraith', 'chaser', 'stalker', 'flash_hunter', 'warper');
  if (floor >= 3) types.push('tank', 'wraith', 'shooter', 'necromancer', 'distortion', 'accelerator');
  if (floor >= 4) types.push('bomber', 'tank', 'wraith', 'stalker', 'necromancer', 'flash_hunter', 'warper', 'distortion');
  return types;
}

function generatePillars(avoidCenter = false): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const rows = [4, 10, 16];
  const cols = [6, 12, 18, 24];

  for (const r of rows) {
    if (avoidCenter && Math.abs(r - 10) < 2) continue;
    for (const c of cols) {
      if (avoidCenter && Math.abs(c - 15) < 3) continue;
      if (Math.random() < 0.7) {
        obstacles.push({
          x: c * C.TILE_SIZE,
          y: r * C.TILE_SIZE,
          w: C.TILE_SIZE * 2,
          h: C.TILE_SIZE * 2
        });
      }
    }
  }
  return obstacles;
}

function createBrokenWall(x: number, y: number, w: number, h: number, vertical = false): Obstacle[] {
  const pieces: Obstacle[] = [];
  const minPiece = 2 * C.TILE_SIZE;

  if (vertical) {
    let currY = y;
    while (currY < y + h) {
      const pieceH = Math.min(y + h - currY, randomInt(3, 6) * C.TILE_SIZE);
      if (pieceH >= minPiece) {
        pieces.push({ x: x + randomInt(-2, 2), y: currY, w, h: pieceH });
      }
      currY += pieceH + randomInt(1, 2) * C.TILE_SIZE;
    }
  } else {
    let currX = x;
    while (currX < x + w) {
      const pieceW = Math.min(x + w - currX, randomInt(4, 8) * C.TILE_SIZE);
      if (pieceW >= minPiece) {
        pieces.push({ x: currX, y: y + randomInt(-2, 2), w: pieceW, h });
      }
      currX += pieceW + randomInt(1, 2) * C.TILE_SIZE;
    }
  }
  return pieces;
}

function generateDualWing(room: DungeonRoom): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const isHorizontal = Math.random() > 0.5;
  const wallW = 3 * C.TILE_SIZE;
  const gap = 6 * C.TILE_SIZE;
  const midX = C.dims.gw / 2;
  const midY = C.dims.gh / 2;

  if (isHorizontal) {
    // Left wings
    obstacles.push(...createBrokenWall(midX - gap / 2 - wallW, 0, wallW, 7 * C.TILE_SIZE, true));
    obstacles.push(...createBrokenWall(midX - gap / 2 - wallW, C.dims.gh - 7 * C.TILE_SIZE, wallW, 7 * C.TILE_SIZE, true));
    // Right wings
    obstacles.push(...createBrokenWall(midX + gap / 2, 0, wallW, 7 * C.TILE_SIZE, true));
    obstacles.push(...createBrokenWall(midX + gap / 2, C.dims.gh - 7 * C.TILE_SIZE, wallW, 7 * C.TILE_SIZE, true));
  } else {
    // Top wings
    obstacles.push(...createBrokenWall(0, midY - gap / 2 - wallW, 12 * C.TILE_SIZE, wallW, false));
    obstacles.push(...createBrokenWall(C.dims.gw - 12 * C.TILE_SIZE, midY - gap / 2 - wallW, 12 * C.TILE_SIZE, wallW, false));
    // Bottom wings
    obstacles.push(...createBrokenWall(0, midY + gap / 2, 12 * C.TILE_SIZE, wallW, false));
    obstacles.push(...createBrokenWall(C.dims.gw - 12 * C.TILE_SIZE, midY + gap / 2, 12 * C.TILE_SIZE, wallW, false));
  }
  return obstacles;
}

function generateCentralHub(room: DungeonRoom): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const midX = C.dims.gw / 2;
  const midY = C.dims.gh / 2;
  const hubSize = 9 * C.TILE_SIZE;
  const wallSize = 4 * C.TILE_SIZE;

  const pos = [
    { x: midX - hubSize / 2 - wallSize, y: midY - hubSize / 2 - wallSize },
    { x: midX + hubSize / 2, y: midY - hubSize / 2 - wallSize },
    { x: midX - hubSize / 2 - wallSize, y: midY + hubSize / 2 },
    { x: midX + hubSize / 2, y: midY + hubSize / 2 },
  ];

  for (const p of pos) {
    obstacles.push({ x: p.x, y: p.y, w: wallSize, h: wallSize });
    if (Math.random() > 0.5) {
      obstacles.push({ x: p.x + randomInt(-20, 20), y: p.y + randomInt(-20, 20), w: 16, h: 16 });
    }
  }

  return obstacles;
}

function generateSPath(room: DungeonRoom): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const barW = 24 * C.TILE_SIZE;
  const barH = 3 * C.TILE_SIZE;

  obstacles.push(...createBrokenWall(0, 5 * C.TILE_SIZE, barW, barH, false));
  obstacles.push(...createBrokenWall(C.dims.gw - barW, 12 * C.TILE_SIZE, barW, barH, false));

  return obstacles;
}

function generateChokeSplit(room: DungeonRoom): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const midX = C.dims.gw / 2;
  const midY = C.dims.gh / 2;
  const choke = 5 * C.TILE_SIZE;
  const wallW = 3 * C.TILE_SIZE;

  if (Math.random() > 0.5) {
    obstacles.push(...createBrokenWall(midX - wallW / 2, 0, wallW, midY - choke / 2, true));
    obstacles.push(...createBrokenWall(midX - wallW / 2, midY + choke / 2, wallW, C.dims.gh - (midY + choke / 2), true));
  } else {
    obstacles.push(...createBrokenWall(0, midY - wallW / 2, midX - choke / 2, wallW, false));
    obstacles.push(...createBrokenWall(midX + choke / 2, midY - wallW / 2, C.dims.gw - (midX + choke / 2), wallW, false));
  }
  return obstacles;
}

function generateGauntlet(room: DungeonRoom): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const wallW = 3 * C.TILE_SIZE;
  const wallH = 8 * C.TILE_SIZE;

  for (let i = 0; i < 3; i++) {
    const x = (7 + i * 9) * C.TILE_SIZE;
    const y = i % 2 === 0 ? 0 : C.dims.gh - wallH;
    obstacles.push(...createBrokenWall(x, y, wallW, wallH, true));
  }
  return obstacles;
}



function generateObstacles(room: DungeonRoom): Obstacle[] {
  if (room.type === 'vendor') {
    room.layout = 'none';
    return [];
  }

  const safeZones = getRoomSafeZones(room);
  let attempts = 0;
  const maxAttempts = 15;

  const layouts: RoomLayout[] = ['dual_wing', 'central_hub', 's_path', 'choke_split', 'gauntlet', 'pillars'];

  if (room.type === 'start') {
    room.layout = 'pillars';
    return [
      { x: C.TILE_SIZE * 3, y: C.TILE_SIZE * 3, w: C.TILE_SIZE * 2, h: C.TILE_SIZE * 2 },
      { x: C.dims.gw - C.TILE_SIZE * 5, y: C.TILE_SIZE * 3, w: C.TILE_SIZE * 2, h: C.TILE_SIZE * 2 },
      { x: C.TILE_SIZE * 3, y: C.dims.gh - C.TILE_SIZE * 5, w: C.TILE_SIZE * 2, h: C.TILE_SIZE * 2 },
      { x: C.dims.gw - C.TILE_SIZE * 5, y: C.dims.gh - C.TILE_SIZE * 5, w: C.TILE_SIZE * 2, h: C.TILE_SIZE * 2 },
    ];
  }

  while (attempts < maxAttempts) {
    attempts++;
    const chosen = room.isBossRoom ? 'pillars' : layouts[randomInt(0, layouts.length - 1)];
    room.layout = chosen;

    let raw: Obstacle[] = [];
    switch (chosen) {
      case 'pillars': raw = generatePillars(room.isBossRoom); break;
      case 'dual_wing': raw = generateDualWing(room); break;
      case 'central_hub': raw = generateCentralHub(room); break;
      case 's_path': raw = generateSPath(room); break;
      case 'choke_split': raw = generateChokeSplit(room); break;
      case 'gauntlet': raw = generateGauntlet(room); break;
    }

    // Filter by safe zones
    const filtered = raw.filter(o => !safeZones.some(z => rectIntersect(o, z)));

    // Connectivity check: ensure all doors are connected
    if (checkConnectivity(room, filtered)) {
      console.log(`[DUNGEON] Valid structural layout generated after ${attempts} attempts: ${chosen} with ${filtered.length} obstacles.`);
      return filtered;
    }
  }

  console.warn(`[DUNGEON] Failed to find completely clear path after ${maxAttempts} attempts. Using fallback (no obstacles).`);
  return [];
}

function generateEnemySpawns(room: DungeonRoom, floor: number): EnemySpawn[] {
  if (room.type === 'start') {
    const spawns: EnemySpawn[] = [];
    const count = 4 + floor; // fewer enemies in start room to avoid clutter
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 60 + Math.random() * 40;
      spawns.push({
        type: i < 2 ? 'chaser' : 'swarm',
        x: C.dims.gw / 2 + Math.cos(angle) * dist,
        y: C.dims.gh / 2 + Math.sin(angle) * dist,
      });
    }
    return spawns;
  }

  if (room.isBossRoom) {
    const spawns: EnemySpawn[] = [{ type: 'boss', x: C.dims.gw / 2, y: C.dims.gh / 2 }];
    // Add minions in corners
    const corners = [
      { x: C.TILE_SIZE * 3, y: C.TILE_SIZE * 3 },
      { x: C.dims.gw - C.TILE_SIZE * 3, y: C.TILE_SIZE * 3 },
      { x: C.TILE_SIZE * 3, y: C.dims.gh - C.TILE_SIZE * 3 },
      { x: C.dims.gw - C.TILE_SIZE * 3, y: C.dims.gh - C.TILE_SIZE * 3 }
    ];
    for (const corner of corners) {
      for (let i = 0; i < 2; i++) {
        spawns.push({
          type: 'swarm',
          x: corner.x + (Math.random() - 0.5) * 20,
          y: corner.y + (Math.random() - 0.5) * 20
        });
      }
    }
    return spawns;
  }

  const spawns: EnemySpawn[] = [];
  const types = getEnemyTypes(floor);
  const count = randomInt(8, 14) + Math.floor(floor * 1.5);

  // Tactical grouping based on layout
  const regions: Array<{ x: number, y: number, r: number }> = [];

  if (room.layout === 'dual_wing') {
    regions.push({ x: C.TILE_SIZE * 6, y: C.TILE_SIZE * 6, r: 80 });
    regions.push({ x: C.dims.gw - C.TILE_SIZE * 6, y: C.dims.gh - C.TILE_SIZE * 6, r: 80 });
  } else if (room.layout === 'central_hub') {
    regions.push({ x: C.dims.gw / 2, y: C.dims.gh / 2, r: 100 });
  } else if (room.layout === 's_path') {
    regions.push({ x: C.TILE_SIZE * 5, y: C.TILE_SIZE * 10, r: 70 });
    regions.push({ x: C.dims.gw - C.TILE_SIZE * 5, y: C.TILE_SIZE * 10, r: 70 });
  } else if (room.layout === 'choke_split') {
    regions.push({ x: C.TILE_SIZE * 8, y: C.TILE_SIZE * 8, r: 80 });
    regions.push({ x: C.dims.gw - C.TILE_SIZE * 8, y: C.dims.gh - C.TILE_SIZE * 8, r: 80 });
  } else if (room.layout === 'gauntlet') {
    const midY = C.dims.gh / 2;
    regions.push({ x: 12 * C.TILE_SIZE, y: midY, r: 60 });
    regions.push({ x: 22 * C.TILE_SIZE, y: midY, r: 60 });
  } else {
    // Default: split into 2-3 random clusters in open spaces
    const clusterCount = 3;
    for (let i = 0; i < clusterCount; i++) {
      regions.push({
        x: randomInt(6, C.dims.rc - 6) * C.TILE_SIZE,
        y: randomInt(6, C.dims.rr - 6) * C.TILE_SIZE,
        r: 80
      });
    }
  }

  console.log(`[SPAWN] Room Layout: ${room.layout}, Regions: ${regions.length}, Enemy Count: ${count}`);

  let attempts = 0;
  while (spawns.length < count && attempts < count * 3) {
    attempts++;
    const reg = regions[randomInt(0, regions.length - 1)];
    const type = types[randomInt(0, types.length - 1)];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * reg.r;

    let x = reg.x + Math.cos(angle) * dist;
    let y = reg.y + Math.sin(angle) * dist;

    // Clamp
    x = Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gw - C.TILE_SIZE * 2, x));
    y = Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gh - C.TILE_SIZE * 2, y));

    // Avoid spawning inside obstacles
    const inObstacle = room.obstacles.some(o =>
      x > o.x - 10 && x < o.x + o.w + 10 &&
      y > o.y - 10 && y < o.y + o.h + 10
    );

    if (!inObstacle) {
      spawns.push({ type, x, y });
    }
  }

  return spawns;
}

export function generateDungeon(floor: number): DungeonMap {
  const center = Math.floor(C.DUNGEON_SIZE / 2);
  const rooms = new Map<string, DungeonRoom>();
  const targetRooms = randomInt(C.MIN_ROOMS, C.MAX_ROOMS);

  const visited = new Set<string>();
  const path: Array<{ x: number; y: number }> = [{ x: center, y: center }];
  visited.add(roomKey(center, center));

  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
  ];

  let current = { x: center, y: center };
  let attempts = 0;

  while (visited.size < targetRooms && attempts < 200) {
    attempts++;
    const dir = dirs[randomInt(0, 3)];
    const nx = current.x + dir.dx;
    const ny = current.y + dir.dy;

    if (nx < 0 || nx >= C.DUNGEON_SIZE || ny < 0 || ny >= C.DUNGEON_SIZE) continue;

    const key = roomKey(nx, ny);
    if (!visited.has(key)) {
      visited.add(key);
      path.push({ x: nx, y: ny });
    }
    current = { x: nx, y: ny };
  }

  let maxDist = 0;
  let bossPos = path[path.length - 1];
  for (const pos of path) {
    const dist = Math.abs(pos.x - center) + Math.abs(pos.y - center);
    if (dist > maxDist) {
      maxDist = dist;
      bossPos = pos;
    }
  }

  // Assign special room types to some rooms (shrine removed — now inside vendor room)
  const specialTypes: Array<'treasure' | 'trap' | 'vendor'> = [];
  if (path.length > 4) specialTypes.push('treasure');
  if (path.length > 5) specialTypes.push('trap');
  // Always add a vendor room
  specialTypes.push('vendor');
  if (path.length > 8) specialTypes.push('trap');

  // Pick random non-start, non-boss rooms for specials
  const normalIndices = path
    .map((pos, i) => ({ pos, i }))
    .filter(({ pos }) => !(pos.x === center && pos.y === center) && !(pos.x === bossPos.x && pos.y === bossPos.y));

  const shuffled = normalIndices.sort(() => Math.random() - 0.5);
  const specialAssign = new Map<number, 'treasure' | 'trap' | 'vendor'>();
  for (let i = 0; i < Math.min(specialTypes.length, shuffled.length); i++) {
    specialAssign.set(shuffled[i].i, specialTypes[i]);
  }

  for (let idx = 0; idx < path.length; idx++) {
    const pos = path[idx];
    const key = roomKey(pos.x, pos.y);
    const isStart = pos.x === center && pos.y === center;
    const isBoss = pos.x === bossPos.x && pos.y === bossPos.y && !isStart;
    const specialType = specialAssign.get(idx);

    const roomType: DungeonRoom['type'] = isStart ? 'start' : isBoss ? 'boss' : specialType || 'normal';

    const room: DungeonRoom = {
      gridX: pos.x, gridY: pos.y,
      doors: {
        north: visited.has(roomKey(pos.x, pos.y - 1)),
        south: visited.has(roomKey(pos.x, pos.y + 1)),
        east: visited.has(roomKey(pos.x + 1, pos.y)),
        west: visited.has(roomKey(pos.x - 1, pos.y)),
      },
      enemies: [], obstacles: [],
      cleared: false, visited: isStart,
      isBossRoom: isBoss,
      type: roomType,
      treasureCollected: false,
      trapTriggered: false,
      shrineUsed: false,
      trapType: roomType === 'trap' ? (['spikes', 'phantom_summon', 'poison_cloud', 'bear_trap'] as TrapType[])[randomInt(0, 3)] : undefined,
    };

    room.obstacles = generateObstacles(room);
    // Generate hidden traps for trap rooms
    room.hiddenTraps = generateHiddenTraps(roomType, floor);
    // Treasure and shrine rooms have fewer enemies, trap rooms have more
    // Vendor rooms are safe — no enemies at all
    if (roomType === 'vendor') {
      room.enemies = [];
      room.cleared = true;
    } else if (roomType === 'treasure') {
      room.enemies = generateEnemySpawns({ ...room, type: 'normal' } as DungeonRoom, floor).slice(0, 3);
    } else if (roomType === 'trap') {
      room.enemies = generateEnemySpawns(room, floor);
      // Add extra enemies for traps
      const extra = randomInt(3, 6);
      for (let i = 0; i < extra; i++) {
        room.enemies.push({
          type: 'swarm',
          x: C.dims.gw / 2 + (Math.random() - 0.5) * 120,
          y: C.dims.gh / 2 + (Math.random() - 0.5) * 80,
        });
      }
    } else {
      room.enemies = generateEnemySpawns(room, floor);
    }
    rooms.set(key, room);
  }

  rooms.forEach((r, k) => {
    if (r.obstacles.length > 0) console.log(`[DUNGEON] Room ${k} generated with ${r.obstacles.length} obstacles.`);
  });
  return { rooms, currentRoomKey: roomKey(center, center), floor };
}

export function getCurrentRoom(dungeon: DungeonMap): DungeonRoom {
  return dungeon.rooms.get(dungeon.currentRoomKey)!;
}

export function moveToRoom(dungeon: DungeonMap, gridX: number, gridY: number): DungeonRoom | null {
  const key = roomKey(gridX, gridY);
  const room = dungeon.rooms.get(key);
  if (!room) return null;
  dungeon.currentRoomKey = key;
  room.visited = true;
  return room;
}

export { roomKey };
