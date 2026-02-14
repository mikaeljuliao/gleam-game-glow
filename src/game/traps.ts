// Hidden trap system — invisible traps with subtle floor hints
// Traps activate on player proximity and cause severe debuffs/effects

import { PlayerState, EnemyState, Particle } from './types';
import * as C from './constants';

export type HiddenTrapType = 
  | 'slowness'          // Heavy slowness debuff
  | 'blindness'         // Drastically reduces light radius
  | 'weakness'          // Reduces player damage
  | 'no_dash'           // Disables dash
  | 'summon_horrors'     // Spawns fast dangerous enemies
  | 'enemy_frenzy'      // Buffs all nearby enemies
  | 'lights_out'        // Kills all light for a few seconds
  | 'panic'             // Visual distortion and screen chaos
  | 'lock_doors'        // Locks room exits temporarily
  | 'enemy_speed'       // All enemies get massive speed boost
  | 'summon_lights_out'  // Spawns 3 distortion enemies that cause blackouts

export interface HiddenTrap {
  x: number;
  y: number;
  type: HiddenTrapType;
  triggered: boolean;
  // Subtle visual hint data
  hintSeed: number; // For procedural subtle differences
}

export interface TrapEffect {
  type: HiddenTrapType;
  duration: number;
  timer: number;
  // Store original values for restoration
  originalValue?: number;
}

// Active effects on the player from traps
let activeEffects: TrapEffect[] = [];
let lightsOutTimer = 0;
let panicTimer = 0;
let doorsLockedTimer = 0;

export function getActiveTrapEffects(): TrapEffect[] { return activeEffects; }
export function getLightsOutTimer(): number { return lightsOutTimer; }
export function getPanicTimer(): number { return panicTimer; }
export function getDoorsLockedTimer(): number { return doorsLockedTimer; }

export function updateTrapEffects(player: PlayerState, dt: number) {
  if (lightsOutTimer > 0) lightsOutTimer -= dt;
  if (panicTimer > 0) panicTimer -= dt;
  if (doorsLockedTimer > 0) doorsLockedTimer -= dt;

  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const eff = activeEffects[i];
    eff.timer -= dt;
    if (eff.timer <= 0) {
      // Restore original values
      switch (eff.type) {
        case 'slowness':
          player.moveSpeedMult = eff.originalValue ?? 1;
          break;
        case 'weakness':
          player.damageMultiplier = eff.originalValue ?? 1;
          break;
        case 'no_dash':
          // Dash re-enabled naturally when cooldown expires
          break;
        case 'blindness':
          // Light restored in renderer check
          break;
      }
      activeEffects.splice(i, 1);
    }
  }
}

export function hasEffect(type: HiddenTrapType): boolean {
  return activeEffects.some(e => e.type === type);
}

const ALL_TRAP_TYPES: HiddenTrapType[] = [
  'slowness', 'blindness', 'weakness', 'no_dash',
  'summon_horrors', 'enemy_frenzy', 'lights_out',
  'panic', 'lock_doors', 'enemy_speed', 'summon_lights_out',
];

export function generateHiddenTraps(roomType: string, floor: number): HiddenTrap[] {
  // Only trap rooms get hidden traps
  if (roomType !== 'trap') return [];
  
  const count = 2 + Math.floor(Math.random() * 2) + Math.min(floor, 3); // 2-6 traps
  const traps: HiddenTrap[] = [];
  const usedTypes = new Set<HiddenTrapType>();
  const usedPositions = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // Pick a type, try not to repeat
    let type: HiddenTrapType;
    if (usedTypes.size < ALL_TRAP_TYPES.length) {
      do {
        type = ALL_TRAP_TYPES[Math.floor(Math.random() * ALL_TRAP_TYPES.length)];
      } while (usedTypes.has(type));
    } else {
      type = ALL_TRAP_TYPES[Math.floor(Math.random() * ALL_TRAP_TYPES.length)];
    }
    usedTypes.add(type);

    // Position: scattered across the room walkable area, avoid center and edges
    let x: number, y: number, key: string;
    let attempts = 0;
    do {
      x = (3 + Math.floor(Math.random() * (C.dims.rc - 6))) * C.TILE_SIZE + C.TILE_SIZE / 2;
      y = (3 + Math.floor(Math.random() * (C.dims.rr - 6))) * C.TILE_SIZE + C.TILE_SIZE / 2;
      key = `${Math.floor(x / C.TILE_SIZE)},${Math.floor(y / C.TILE_SIZE)}`;
      attempts++;
    } while (usedPositions.has(key) && attempts < 30);
    usedPositions.add(key);

    traps.push({
      x, y, type,
      triggered: false,
      hintSeed: Math.random() * 1000,
    });
  }

  return traps;
}

// Check if player steps on a trap. Returns activated trap or null.
export function checkTrapCollision(player: PlayerState, traps: HiddenTrap[]): HiddenTrap | null {
  for (const trap of traps) {
    if (trap.triggered) continue;
    const dx = player.x - trap.x;
    const dy = player.y - trap.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < C.TILE_SIZE * 0.7) {
      trap.triggered = true;
      return trap;
    }
  }
  return null;
}

// Apply trap effect. Returns data for engine to use (e.g. enemies to spawn).
export interface TrapActivationResult {
  spawnEnemies: Array<{ type: string; x: number; y: number }>;
  buffEnemies: boolean;
  speedBoostEnemies: boolean;
}

export function activateTrap(
  trap: HiddenTrap,
  player: PlayerState,
  floor: number,
): TrapActivationResult {
  const result: TrapActivationResult = {
    spawnEnemies: [],
    buffEnemies: false,
    speedBoostEnemies: false,
  };

  switch (trap.type) {
    case 'slowness': {
      const eff: TrapEffect = {
        type: 'slowness',
        duration: 5,
        timer: 5,
        originalValue: player.moveSpeedMult,
      };
      player.moveSpeedMult *= 0.35;
      activeEffects.push(eff);
      break;
    }
    case 'blindness': {
      const eff: TrapEffect = {
        type: 'blindness',
        duration: 4,
        timer: 4,
      };
      activeEffects.push(eff);
      break;
    }
    case 'weakness': {
      const eff: TrapEffect = {
        type: 'weakness',
        duration: 6,
        timer: 6,
        originalValue: player.damageMultiplier,
      };
      player.damageMultiplier *= 0.3;
      activeEffects.push(eff);
      break;
    }
    case 'no_dash': {
      const eff: TrapEffect = {
        type: 'no_dash',
        duration: 5,
        timer: 5,
      };
      player.dashCooldown = 999;
      activeEffects.push(eff);
      break;
    }
    case 'summon_horrors': {
      const count = 3 + Math.min(floor, 4);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        result.spawnEnemies.push({
          type: Math.random() < 0.5 ? 'flash_hunter' : 'phantom',
          x: trap.x + Math.cos(angle) * dist,
          y: trap.y + Math.sin(angle) * dist,
        });
      }
      break;
    }
    case 'enemy_frenzy': {
      result.buffEnemies = true;
      break;
    }
    case 'lights_out': {
      lightsOutTimer = 4 + floor * 0.5;
      break;
    }
    case 'panic': {
      panicTimer = 3.5;
      // Also deal some damage from shock
      const dmg = 5 + floor * 2;
      player.hp = Math.max(1, player.hp - dmg);
      player.invincibleTime = 0.3;
      break;
    }
    case 'lock_doors': {
      doorsLockedTimer = 5 + floor;
      break;
    }
    case 'enemy_speed': {
      result.speedBoostEnemies = true;
      break;
    }
    case 'summon_lights_out': {
      // Spawn 3 distortion enemies + short lights out
      lightsOutTimer = 3;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const dist = 35 + Math.random() * 25;
        result.spawnEnemies.push({
          type: 'distortion',
          x: trap.x + Math.cos(angle) * dist,
          y: trap.y + Math.sin(angle) * dist,
        });
      }
      break;
    }
  }

  return result;
}

export function resetTrapEffects() {
  activeEffects = [];
  lightsOutTimer = 0;
  panicTimer = 0;
  doorsLockedTimer = 0;
}
