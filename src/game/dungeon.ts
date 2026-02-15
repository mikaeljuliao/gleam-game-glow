import { DungeonMap, DungeonRoom, EnemySpawn, EnemyType, Obstacle, TrapType } from './types';
import * as C from './constants';
import { generateHiddenTraps } from './traps';

function roomKey(x: number, y: number): string {
  return `${x},${y}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateObstacles(room: DungeonRoom): Obstacle[] {
  if (room.type === 'start') return [];
  const obstacles: Obstacle[] = [];
  const count = room.isBossRoom ? 2 : randomInt(2, 5);
  
  for (let i = 0; i < count; i++) {
    const w = randomInt(1, 2) * C.TILE_SIZE;
    const h = randomInt(1, 2) * C.TILE_SIZE;
    const x = randomInt(3, C.dims.rc - 5) * C.TILE_SIZE;
    const y = randomInt(3, C.dims.rr - 5) * C.TILE_SIZE;
    
    const cx = x + w / 2;
    const cy = y + h / 2;
    const midX = C.dims.gw / 2;
    const midY = C.dims.gh / 2;
    if ((Math.abs(cx - midX) < 40 && (cy < 40 || cy > C.dims.gh - 40)) ||
        (Math.abs(cy - midY) < 40 && (cx < 40 || cx > C.dims.gw - 40))) {
      continue;
    }
    obstacles.push({ x, y, w, h });
  }
  return obstacles;
}

function getEnemyTypes(floor: number): EnemyType[] {
  const types: EnemyType[] = ['chaser', 'chaser', 'swarm'];
  if (floor >= 1) types.push('shooter', 'swarm', 'swarm', 'flicker_fiend');
  if (floor >= 2) types.push('bomber', 'wraith', 'chaser', 'stalker', 'flash_hunter', 'warper');
  if (floor >= 3) types.push('tank', 'wraith', 'shooter', 'necromancer', 'distortion', 'accelerator');
  if (floor >= 4) types.push('bomber', 'tank', 'wraith', 'stalker', 'necromancer', 'flash_hunter', 'warper', 'distortion');
  return types;
}

function generateEnemySpawns(room: DungeonRoom, floor: number): EnemySpawn[] {
  if (room.type === 'start') {
    // Spawn enemies near the player so they're visible in the light radius
    const spawns: EnemySpawn[] = [];
    const count = 6 + floor;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 50 + Math.random() * 60; // within visible light radius
      spawns.push({
        type: i < 3 ? 'chaser' : 'swarm',
        x: C.dims.gw / 2 + Math.cos(angle) * dist,
        y: C.dims.gh / 2 + Math.sin(angle) * dist,
      });
    }
    return spawns;
  }
  if (room.isBossRoom) {
    const spawns: EnemySpawn[] = [
      { type: 'boss', x: C.dims.gw / 2, y: C.dims.gh / 3 },
    ];
    // Add minions around the boss
    const minionCount = 2 + floor;
    for (let i = 0; i < minionCount; i++) {
      const angle = (i / minionCount) * Math.PI * 2;
      spawns.push({
        type: 'swarm',
        x: C.dims.gw / 2 + Math.cos(angle) * 60,
        y: C.dims.gh / 3 + Math.sin(angle) * 40,
      });
    }
    return spawns;
  }

  // More enemies! Base 7-12, scaling with floor
  const count = randomInt(7, 12) + Math.floor(floor * 2);
  const spawns: EnemySpawn[] = [];
  const types = getEnemyTypes(floor);
  
  // Sometimes spawn a swarm wave (cluster of swarm enemies)
  if (Math.random() < 0.4) {
    const swarmCount = randomInt(5, 9);
    const cx = randomInt(4, C.dims.rc - 5) * C.TILE_SIZE;
    const cy = randomInt(4, C.dims.rr - 5) * C.TILE_SIZE;
    for (let i = 0; i < swarmCount; i++) {
      spawns.push({
        type: 'swarm',
        x: cx + (Math.random() - 0.5) * 50,
        y: cy + (Math.random() - 0.5) * 50,
      });
    }
  }

  for (let i = spawns.length; i < count; i++) {
    const type = types[randomInt(0, types.length - 1)];
    // Spawn enemies closer to center so they're visible in the light
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 90;
    const x = Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gw - C.TILE_SIZE * 2, C.dims.gw / 2 + Math.cos(angle) * dist));
    const y = Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gh - C.TILE_SIZE * 2, C.dims.gh / 2 + Math.sin(angle) * dist));
    spawns.push({ type, x, y });
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
    
    let roomType: DungeonRoom['type'] = isStart ? 'start' : isBoss ? 'boss' : specialType || 'normal';
    
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
