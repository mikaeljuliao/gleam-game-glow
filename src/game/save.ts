// localStorage save system for crash recovery
import { PlayerState, DungeonMap, DungeonRoom, GameStats, EnemySpawn, RoomLayout } from './types';
import { AmuletInventory } from './amulets';

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
    souls: number;
  };
  amulets: AmuletInventory;
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
      layout?: string;
      obstacles: Array<{ x: number; y: number; w: number; h: number }>;
      enemySpawns: EnemySpawn[];
    }>;
  };
  stats: GameStats;
  timestamp: number;
}

export function saveGame(player: PlayerState, dungeon: DungeonMap, stats: GameStats, amulets?: AmuletInventory): void {
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
        trapType: room.trapType,
        layout: room.layout,
        obstacles: room.obstacles || [],
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
        souls: player.souls,
      },
      amulets: amulets || { owned: [], maxEquipped: 4, consumables: [] },
      dungeon: {
        floor: dungeon.floor,
        currentRoomKey: dungeon.currentRoomKey,
        rooms,
      },
      stats,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, serialized);
    console.log(`[SAVE] Game successfully saved. Size: ${Math.round(serialized.length / 1024)} KB`);
  } catch (e) {
    console.error('[SAVE] Failed to save game! This may cause freezes if storage is full. Error:', e);
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
  } catch (e) {
    console.error('[SAVE] Failed to load game:', e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('[SAVE] Could not clear localStorage:', e);
  }
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
  player.souls = saved.souls || (saved as unknown as { coins: number }).coins || 0;
}

export function restoreDungeon(saved: SaveData['dungeon']): DungeonMap {
  const rooms = new Map<string, DungeonRoom>();
  for (const r of saved.rooms) {
    rooms.set(r.key, {
      gridX: r.gridX,
      gridY: r.gridY,
      doors: r.doors,
      enemies: r.enemySpawns || [],
      cleared: r.cleared,
      visited: r.visited,
      isBossRoom: r.isBossRoom,
      type: r.type as DungeonRoom['type'],
      treasureCollected: r.treasureCollected,
      trapTriggered: r.trapTriggered,
      shrineUsed: r.shrineUsed,
      layout: r.layout as RoomLayout,
      obstacles: r.obstacles || [],
    });
  }
  return {
    rooms,
    currentRoomKey: saved.currentRoomKey,
    floor: saved.floor,
  };
}
