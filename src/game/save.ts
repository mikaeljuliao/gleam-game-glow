// localStorage save system for crash recovery
import { PlayerState, DungeonMap, DungeonRoom, GameStats, EnemySpawn } from './types';

const SAVE_KEY = 'dungeon_of_shadows_save';

interface SaveData {
  player: {
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    xpToNext: number;
    upgrades: string[];
    baseDamage: number;
    projectileDamage: number;
    projectileCount: number;
    attackSpeedMult: number;
    moveSpeedMult: number;
    damageMultiplier: number;
    areaMultiplier: number;
    lifesteal: number;
    piercing: boolean;
    explosive: boolean;
    coins: number;
  };
  dungeon: {
    floor: number;
    currentRoomKey: string;
    rooms: Array<{
      key: string;
      gridX: number;
      gridY: number;
      doors: { north: boolean; south: boolean; east: boolean; west: boolean };
      cleared: boolean;
      visited: boolean;
      isBossRoom: boolean;
      type: string;
      treasureCollected: boolean;
      trapTriggered: boolean;
      shrineUsed: boolean;
      trapType?: string;
      enemySpawns: EnemySpawn[];
    }>;
  };
  stats: GameStats;
  timestamp: number;
}

export function saveGame(player: PlayerState, dungeon: DungeonMap, stats: GameStats): void {
  try {
    const rooms: SaveData['dungeon']['rooms'] = [];
    for (const [key, room] of dungeon.rooms) {
      rooms.push({
        key,
        gridX: room.gridX,
        gridY: room.gridY,
        doors: room.doors,
        cleared: room.cleared,
        visited: room.visited,
        isBossRoom: room.isBossRoom,
        type: room.type,
        treasureCollected: room.treasureCollected || false,
        trapTriggered: room.trapTriggered || false,
        shrineUsed: room.shrineUsed || false,
        trapType: (room as any).trapType,
        enemySpawns: room.enemies || [],
      });
    }

    const data: SaveData = {
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        level: player.level,
        xp: player.xp,
        xpToNext: player.xpToNext,
        upgrades: [...player.upgrades],
        baseDamage: player.baseDamage,
        projectileDamage: player.projectileDamage,
        projectileCount: player.projectileCount,
        attackSpeedMult: player.attackSpeedMult,
        moveSpeedMult: player.moveSpeedMult,
        damageMultiplier: player.damageMultiplier,
        areaMultiplier: player.areaMultiplier,
        lifesteal: player.lifesteal,
        piercing: player.piercing,
        explosive: player.explosive,
        coins: player.coins,
      },
      dungeon: {
        floor: dungeon.floor,
        currentRoomKey: dungeon.currentRoomKey,
        rooms,
      },
      stats,
      timestamp: Date.now(),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    // Ignore saves older than 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      clearSave();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function restorePlayerState(player: PlayerState, saved: SaveData['player']): void {
  player.hp = saved.hp;
  player.maxHp = saved.maxHp;
  player.level = saved.level;
  player.xp = saved.xp;
  player.xpToNext = saved.xpToNext;
  player.upgrades = [...saved.upgrades];
  player.baseDamage = saved.baseDamage;
  player.projectileDamage = saved.projectileDamage;
  player.projectileCount = saved.projectileCount;
  player.attackSpeedMult = saved.attackSpeedMult;
  player.moveSpeedMult = saved.moveSpeedMult;
  player.damageMultiplier = saved.damageMultiplier;
  player.areaMultiplier = saved.areaMultiplier;
  player.lifesteal = saved.lifesteal;
  player.piercing = saved.piercing;
  player.explosive = saved.explosive;
  player.coins = (saved as any).coins || 0;
}

export function restoreDungeon(saved: SaveData['dungeon']): DungeonMap {
  const rooms = new Map<string, DungeonRoom>();
  for (const r of saved.rooms) {
    rooms.set(r.key, {
      gridX: r.gridX,
      gridY: r.gridY,
      doors: r.doors,
      enemies: r.enemySpawns || [], // restore enemy spawn data
      obstacles: [], // will be regenerated
      cleared: r.cleared,
      visited: r.visited,
      isBossRoom: r.isBossRoom,
      type: r.type as DungeonRoom['type'],
      treasureCollected: r.treasureCollected,
      trapTriggered: r.trapTriggered,
      shrineUsed: r.shrineUsed,
    });
  }
  return {
    rooms,
    currentRoomKey: saved.currentRoomKey,
    floor: saved.floor,
  };
}
