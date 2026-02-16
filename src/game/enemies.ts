import { EnemyState, EnemyType, PlayerState, ProjectileState, Vec2 } from './types';
import { updateBossAI } from './bosses';
import * as C from './constants';

export function createEnemy(type: EnemyType, x: number, y: number): EnemyState {
  const configs: Record<EnemyType, { hp: number; speed: number; damage: number; size: number }> = {
    chaser: { hp: C.CHASER_HP, speed: C.CHASER_SPEED, damage: C.CHASER_DAMAGE, size: C.CHASER_SIZE },
    shooter: { hp: C.SHOOTER_HP, speed: C.SHOOTER_SPEED, damage: C.SHOOTER_DAMAGE, size: C.SHOOTER_SIZE },
    tank: { hp: C.TANK_HP, speed: C.TANK_SPEED, damage: C.TANK_DAMAGE, size: C.TANK_SIZE },
    wraith: { hp: C.WRAITH_HP, speed: C.WRAITH_SPEED, damage: C.WRAITH_DAMAGE, size: C.WRAITH_SIZE },
    bomber: { hp: C.BOMBER_HP, speed: C.BOMBER_SPEED, damage: C.BOMBER_DAMAGE, size: C.BOMBER_SIZE },
    swarm: { hp: C.SWARM_HP, speed: C.SWARM_SPEED, damage: C.SWARM_DAMAGE, size: C.SWARM_SIZE },
    necromancer: { hp: C.NECRO_HP, speed: C.NECRO_SPEED, damage: C.NECRO_DAMAGE, size: C.NECRO_SIZE },
    stalker: { hp: C.STALKER_HP, speed: C.STALKER_SPEED, damage: C.STALKER_DAMAGE, size: C.STALKER_SIZE },
    phantom: { hp: 15, speed: 250, damage: 12, size: 10 },
    flash_hunter: { hp: C.FLASH_HUNTER_HP, speed: C.FLASH_HUNTER_SPEED, damage: C.FLASH_HUNTER_DAMAGE, size: C.FLASH_HUNTER_SIZE },
    distortion: { hp: C.DISTORTION_HP, speed: C.DISTORTION_SPEED, damage: C.DISTORTION_DAMAGE, size: C.DISTORTION_SIZE },
    flicker_fiend: { hp: C.FLICKER_HP, speed: C.FLICKER_SPEED, damage: C.FLICKER_DAMAGE, size: C.FLICKER_SIZE },
    warper: { hp: C.WARPER_HP, speed: C.WARPER_SPEED, damage: C.WARPER_DAMAGE, size: C.WARPER_SIZE },
    accelerator: { hp: C.ACCEL_HP, speed: C.ACCEL_SPEED, damage: C.ACCEL_DAMAGE, size: C.ACCEL_SIZE },
    boss: { hp: C.BOSS_HP, speed: C.BOSS_SPEED, damage: C.BOSS_DAMAGE, size: C.BOSS_SIZE },
  };
  const c = configs[type];
  return {
    type, x, y, width: c.size, height: c.size,
    hp: c.hp, maxHp: c.hp, speed: c.speed, damage: c.damage,
    vx: 0, vy: 0, attackCooldown: Math.random() * 0.5,
    aiState: 'idle', stateTimer: 0, flashTime: 0,
    knockbackX: 0, knockbackY: 0,
    phaseAlpha: 1, teleportTarget: null,
    fuseTimer: 0, spawnTimer: 0.4,
    wobble: Math.random() * Math.PI * 2,
    stealthAlpha: type === 'stalker' ? 0.05 : 1,
    lunging: false,
    summonTimer: type === 'necromancer' ? C.NECRO_SUMMON_COOLDOWN : 0,
  };
}

export function scaleEnemyForFloor(e: EnemyState, floor: number) {
  const mult = 1 + (floor - 1) * 0.3;
  e.hp = Math.floor(e.hp * mult);
  e.maxHp = e.hp;
  e.damage = Math.floor(e.damage * (1 + (floor - 1) * 0.2));
  e.speed *= (1 + (floor - 1) * 0.05);
}

function normalize(dx: number, dy: number): Vec2 {
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
}

export function updateEnemy(e: EnemyState, player: PlayerState, dt: number, allEnemies: EnemyState[]): { projectiles: ProjectileState[]; exploded: boolean } {
  e.flashTime = Math.max(0, e.flashTime - dt);
  e.attackCooldown = Math.max(0, e.attackCooldown - dt);
  e.stateTimer -= dt;
  e.wobble += dt * 3;
  if (e.spawnTimer > 0) {
    e.spawnTimer -= dt;
    return { projectiles: [], exploded: false };
  }

  // Knockback decay
  e.x += e.knockbackX * dt * 8;
  e.y += e.knockbackY * dt * 8;
  e.knockbackX *= Math.pow(0.05, dt);
  e.knockbackY *= Math.pow(0.05, dt);
  if (Math.abs(e.knockbackX) < 0.5) e.knockbackX = 0;
  if (Math.abs(e.knockbackY) < 0.5) e.knockbackY = 0;

  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const n = normalize(dx, dy);
  const projectiles: ProjectileState[] = [];
  let exploded = false;

  // Separation from other enemies
  let sepX = 0, sepY = 0;
  for (const other of allEnemies) {
    if (other === e) continue;
    const ox = e.x - other.x, oy = e.y - other.y;
    const od = Math.sqrt(ox * ox + oy * oy);
    if (od < (e.width + other.width) * 0.7 && od > 0) {
      sepX += (ox / od) * 2;
      sepY += (oy / od) * 2;
    }
  }

  switch (e.type) {
    case 'chaser': {
      const wobbleX = Math.sin(e.wobble) * 0.3;
      const wobbleY = Math.cos(e.wobble * 1.3) * 0.3;
      e.x += (n.x + wobbleX + sepX) * e.speed * dt;
      e.y += (n.y + wobbleY + sepY) * e.speed * dt;
      break;
    }

    case 'shooter': {
      if (dist > C.SHOOTER_RANGE) {
        e.x += (n.x + sepX) * e.speed * dt;
        e.y += (n.y + sepY) * e.speed * dt;
      } else if (dist < C.SHOOTER_RANGE * 0.4) {
        e.x += (-n.x + sepX) * e.speed * 0.8 * dt;
        e.y += (-n.y + sepY) * e.speed * 0.8 * dt;
      } else {
        // Strafe
        const strafeX = -n.y * Math.sin(e.wobble * 0.5) * 0.5;
        const strafeY = n.x * Math.sin(e.wobble * 0.5) * 0.5;
        e.x += (strafeX + sepX) * e.speed * dt;
        e.y += (strafeY + sepY) * e.speed * dt;
      }
      if (e.attackCooldown <= 0 && dist < C.SHOOTER_RANGE * 1.3) {
        e.attackCooldown = C.SHOOTER_FIRE_RATE;
        projectiles.push({
          x: e.x, y: e.y,
          vx: n.x * C.SHOOTER_PROJ_SPEED, vy: n.y * C.SHOOTER_PROJ_SPEED,
          size: 3, damage: e.damage, isPlayerOwned: false, lifetime: 3,
          piercing: false, explosive: false, trail: [], hitTargets: [], volleyId: Date.now() + Math.random(),
        });
      }
      break;
    }

    case 'tank': {
      if (e.aiState === 'charge') {
        e.x += e.vx * C.TANK_CHARGE_SPEED * dt;
        e.y += e.vy * C.TANK_CHARGE_SPEED * dt;
        if (e.stateTimer <= 0) { e.aiState = 'cooldown'; e.stateTimer = 1.2; }
      } else if (e.aiState === 'cooldown') {
        if (e.stateTimer <= 0) e.aiState = 'chase';
      } else {
        e.x += (n.x + sepX) * e.speed * dt;
        e.y += (n.y + sepY) * e.speed * dt;
        if (dist < C.TANK_CHARGE_DIST && e.attackCooldown <= 0) {
          e.aiState = 'charge'; e.stateTimer = 0.6;
          e.vx = n.x; e.vy = n.y; e.attackCooldown = 2.5;
        }
      }
      break;
    }

    case 'wraith': {
      if (e.aiState === 'teleport') {
        e.phaseAlpha = Math.max(0, e.phaseAlpha - dt * 4);
        if (e.phaseAlpha <= 0 && e.teleportTarget) {
          e.x = e.teleportTarget.x;
          e.y = e.teleportTarget.y;
          e.teleportTarget = null;
          e.aiState = 'phasing';
          e.stateTimer = C.WRAITH_PHASE_DURATION;
        }
      } else if (e.aiState === 'phasing') {
        e.phaseAlpha = Math.min(1, e.phaseAlpha + dt * 3);
        if (e.stateTimer <= 0) {
          e.aiState = 'chase';
          e.phaseAlpha = 1;
        }
        // Attack while materializing
        e.x += n.x * e.speed * 1.5 * dt;
        e.y += n.y * e.speed * 1.5 * dt;
      } else {
        // Float toward player with sine movement
        const floatX = Math.sin(e.wobble * 2) * 0.5;
        const floatY = Math.cos(e.wobble * 1.7) * 0.5;
        e.x += (n.x * 0.5 + floatX + sepX) * e.speed * dt;
        e.y += (n.y * 0.5 + floatY + sepY) * e.speed * dt;

        if (e.attackCooldown <= 0) {
          e.attackCooldown = C.WRAITH_TELEPORT_COOLDOWN;
          e.aiState = 'teleport';
          // Teleport near player
          const angle = Math.random() * Math.PI * 2;
          const teleportDist = 30 + Math.random() * 30;
          e.teleportTarget = {
            x: Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gw - C.TILE_SIZE * 2, player.x + Math.cos(angle) * teleportDist)),
            y: Math.max(C.TILE_SIZE * 2, Math.min(C.dims.gh - C.TILE_SIZE * 2, player.y + Math.sin(angle) * teleportDist)),
          };
        }
      }
      break;
    }

    case 'bomber': {
      if (e.aiState === 'fuse') {
        e.fuseTimer -= dt;
        // Rush toward player
        e.x += n.x * C.BOMBER_CHARGE_SPEED * dt;
        e.y += n.y * C.BOMBER_CHARGE_SPEED * dt;
        // Flash faster as fuse runs out
        e.flashTime = (Math.sin(e.fuseTimer * 20) > 0) ? 0.05 : 0;
        if (e.fuseTimer <= 0 || dist < 12) {
          exploded = true;
        }
      } else {
        e.x += (n.x + sepX) * e.speed * dt;
        e.y += (n.y + sepY) * e.speed * dt;
        if (dist < C.BOMBER_FUSE_DIST) {
          e.aiState = 'fuse';
          e.fuseTimer = 1.5;
        }
      }
      break;
    }

    case 'swarm': {
      // Very fast, erratic movement toward player
      const erraticX = Math.sin(e.wobble * 5 + e.x) * 1.5;
      const erraticY = Math.cos(e.wobble * 4 + e.y) * 1.5;
      e.x += (n.x + erraticX * 0.3 + sepX * 0.5) * e.speed * dt;
      e.y += (n.y + erraticY * 0.3 + sepY * 0.5) * e.speed * dt;
      break;
    }

    case 'necromancer': {
      // Stays far from player, floats menacingly
      if (dist < 100) {
        e.x += (-n.x + sepX) * e.speed * 1.2 * dt;
        e.y += (-n.y + sepY) * e.speed * 1.2 * dt;
      } else if (dist > 160) {
        e.x += (n.x + sepX) * e.speed * 0.5 * dt;
        e.y += (n.y + sepY) * e.speed * 0.5 * dt;
      } else {
        const circleX = -n.y * Math.sin(e.wobble * 0.8);
        const circleY = n.x * Math.sin(e.wobble * 0.8);
        e.x += (circleX + sepX) * e.speed * dt;
        e.y += (circleY + sepY) * e.speed * dt;
      }
      e.summonTimer -= dt;
      break;
    }

    case 'stalker': {
      // ... keep existing stalker logic
      if (!e.lunging) {
        const stealthSpeed = e.speed * 0.6;
        e.x += (n.x + sepX * 0.3) * stealthSpeed * dt;
        e.y += (n.y + sepY * 0.3) * stealthSpeed * dt;
        if (dist < C.STALKER_REVEAL_DIST) {
          e.stealthAlpha = Math.min(0.6, e.stealthAlpha + dt * 1.5);
        } else {
          e.stealthAlpha = Math.max(0.05, e.stealthAlpha - dt * 0.5);
        }
        if (dist < C.STALKER_LUNGE_DIST && e.attackCooldown <= 0) {
          e.lunging = true;
          e.stealthAlpha = 1;
          e.vx = n.x;
          e.vy = n.y;
          e.stateTimer = 0.3;
          e.attackCooldown = 3;
        }
      } else {
        e.x += e.vx * C.STALKER_LUNGE_SPEED * dt;
        e.y += e.vy * C.STALKER_LUNGE_SPEED * dt;
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.lunging = false;
          e.stealthAlpha = 0.05;
        }
      }
      break;
    }

    case 'phantom': {
      // Aggressively chases player like other enemies, with ghostly jitter
      const phantomSpeed = e.speed;
      const jitterX = (Math.random() - 0.5) * 60 * dt;
      const jitterY = (Math.random() - 0.5) * 60 * dt;
      e.x += (n.x + sepX * 0.3) * phantomSpeed * dt + jitterX;
      e.y += (n.y + sepY * 0.3) * phantomSpeed * dt + jitterY;
      e.stealthAlpha = 0.4 + Math.sin(e.wobble * 15) * 0.4;
      break;
    }

    case 'flash_hunter': {
      // Extremely fast, appears for brief instants then charges
      if (e.aiState === 'idle') {
        // Invisible, waiting
        e.stealthAlpha = 0;
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.aiState = 'chase';
          e.stateTimer = 0.15; // visible for only 0.15s
          e.stealthAlpha = 1;
          e.vx = n.x;
          e.vy = n.y;
        }
      } else if (e.aiState === 'chase') {
        // Blazing fast charge while visible
        e.x += e.vx * e.speed * dt;
        e.y += e.vy * e.speed * dt;
        e.stealthAlpha = 1;
        if (e.stateTimer <= 0) {
          e.aiState = 'idle';
          e.stateTimer = 0.8 + Math.random() * 1.2; // hide again
          e.stealthAlpha = 0;
        }
      }
      break;
    }

    case 'distortion': {
      // Appears with visual glitch, moves with heavy presence
      if (e.aiState === 'idle') {
        e.stealthAlpha = 0;
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.aiState = 'chase';
          e.stealthAlpha = 1;
          e.stateTimer = 4 + Math.random() * 3;
        }
      } else {
        // Slow but relentless approach with pulsing distortion
        e.x += (n.x + sepX) * e.speed * dt;
        e.y += (n.y + sepY) * e.speed * dt;
        // Pulsing size effect (wobble used for visual)
        e.wobble += dt * 8;
      }
      break;
    }

    case 'flicker_fiend': {
      // Blinks on/off while approaching - only damageable when visible
      const flickerCycle = Math.sin(e.wobble * 4);
      const isVisible = flickerCycle > -0.2;
      e.stealthAlpha = isVisible ? 1 : 0;
      // Approaches fast
      e.x += (n.x + sepX) * e.speed * (isVisible ? 1.5 : 0.5) * dt;
      e.y += (n.y + sepY) * e.speed * (isVisible ? 1.5 : 0.5) * dt;
      break;
    }

    case 'warper': {
      // Short teleports getting closer and closer
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.stateTimer = C.WARPER_TELEPORT_INTERVAL * (0.7 + Math.random() * 0.6);
        // Teleport partway toward player
        const teleportDist = dist * (0.3 + Math.random() * 0.2);
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
        e.x += Math.cos(angle) * teleportDist;
        e.y += Math.sin(angle) * teleportDist;
        // Clamp
        const margin = C.TILE_SIZE + e.width / 2;
        e.x = Math.max(margin, Math.min(C.dims.gw - margin, e.x));
        e.y = Math.max(margin, Math.min(C.dims.gh - margin, e.y));
        e.flashTime = 0.08;
        e.stealthAlpha = 1;
      } else {
        // Fade between teleports
        e.stealthAlpha = Math.max(0.15, 1 - (C.WARPER_TELEPORT_INTERVAL - e.stateTimer) / C.WARPER_TELEPORT_INTERVAL);
      }
      // Slow drift
      e.x += (n.x + sepX) * e.speed * dt;
      e.y += (n.y + sepY) * e.speed * dt;
      break;
    }

    case 'accelerator': {
      // Speeds up massively when in player's light radius
      const inLight = dist < C.LIGHT_RADIUS;
      const currentSpeed = inLight ? e.speed * 6 : e.speed;
      e.x += (n.x + sepX) * currentSpeed * dt;
      e.y += (n.y + sepY) * currentSpeed * dt;
      // Visual feedback: brighter when in light
      e.stealthAlpha = inLight ? 1 : 0.3;
      break;
    }

    case 'boss': {
      updateBossAI(e, player, dx, dy, dist, dt, projectiles, allEnemies);
      break;
    }
  }

  // Clamp to room
  const margin = C.TILE_SIZE + e.width / 2;
  e.x = Math.max(margin, Math.min(C.dims.gw - margin, e.x));
  e.y = Math.max(margin, Math.min(C.dims.gh - margin, e.y));
  return { projectiles, exploded };
}

export function damageEnemy(e: EnemyState, dmg: number, kx: number, ky: number): boolean {
  e.hp -= dmg;
  e.flashTime = 0.12;
  e.knockbackX += kx * 30;
  e.knockbackY += ky * 30;
  return e.hp <= 0;
}

export function getXPForEnemy(type: EnemyType): number {
  const xpMap: Record<EnemyType, number> = {
    swarm: 3, chaser: 8, shooter: 10, bomber: 12, wraith: 15, tank: 15,
    necromancer: 20, stalker: 18, phantom: 5, boss: 60,
    flash_hunter: 15, distortion: 22, flicker_fiend: 14, warper: 16, accelerator: 18,
  };
  return xpMap[type];
}

// Boss-related exports now live in bosses.ts
// Re-export for backward compatibility
export { createBossForFloor, consumeBossAction, setBossFloor, getBossFloor } from './bosses';
export type { BossAction } from './bosses';
