// Unique boss system — each floor has a distinct boss with unique mechanics
import { EnemyState, EnemyType, PlayerState, ProjectileState, Vec2 } from './types';
import * as C from './constants';
import { createEnemy } from './enemies';

// ============ BOSS DATA ============

export const BOSS_DATA: Record<number, { name: string; title: string; color: string; accentColor: string }> = {
  1: { name: 'SOMBRA FAMINTA', title: 'Guardião do Abismo', color: '#2244cc', accentColor: '#4488ff' },
  2: { name: 'O CAÇADOR', title: 'Velocidade Implacável', color: '#ff6600', accentColor: '#ffaa00' },
  3: { name: 'O INVOCADOR', title: 'Senhor das Hordas', color: '#7722cc', accentColor: '#aa44ff' },
  4: { name: 'O FANTASMA', title: 'Aquele Que Não Se Vê', color: '#00ccaa', accentColor: '#44ffdd' },
  5: { name: 'O DESTRUIDOR', title: 'Força Imparável', color: '#aa4400', accentColor: '#ff8800' },
  6: { name: 'O PESADELO', title: 'Terror Absoluto', color: '#880000', accentColor: '#ff0044' },
};

// ============ BOSS CREATION ============

let bossFloor = 1;
export function setBossFloor(floor: number) { bossFloor = floor; }
export function getBossFloor(): number { return bossFloor; }

export function createBossForFloor(floor: number, x: number, y: number): EnemyState {
  const boss = createEnemy('boss', x, y);
  const hpMult = 1 + (floor - 1) * 0.6;
  const dmgMult = 1 + (floor - 1) * 0.35;
  const spdMult = 1 + (floor - 1) * 0.1;

  boss.hp = Math.floor(C.BOSS_HP * hpMult);
  boss.maxHp = boss.hp;
  boss.damage = Math.floor(C.BOSS_DAMAGE * dmgMult);
  boss.speed = C.BOSS_SPEED * spdMult;
  boss.width = C.BOSS_SIZE + floor * 2;
  boss.height = boss.width;
  boss.fuseTimer = 0; // HP threshold tracker
  boss.summonTimer = 5;
  setBossFloor(floor);
  return boss;
}

// ============ BOSS ACTION SYSTEM ============

export interface BossAction {
  spawnEnemies: Array<{ type: EnemyType; x: number; y: number }>;
  lightsOut: number;
  lockDoors: number;
  panic: boolean;
  screenShake: number;
}

let pendingBossAction: BossAction | null = null;
export function consumeBossAction(): BossAction | null {
  const a = pendingBossAction;
  pendingBossAction = null;
  return a;
}

function emitBossAction(action: Partial<BossAction>) {
  pendingBossAction = {
    spawnEnemies: action.spawnEnemies || [],
    lightsOut: action.lightsOut || 0,
    lockDoors: action.lockDoors || 0,
    panic: action.panic || false,
    screenShake: action.screenShake || 0,
  };
}

function normalize(dx: number, dy: number): Vec2 {
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
}

// ============ BOSS AI — FLOOR 1: SOMBRA FAMINTA ============
// Basic aggressive boss — charges and fires radial bursts

function updateBoss1(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[]) {
  if (e.stateTimer <= 0) {
    const phases: Array<'chase' | 'attack' | 'idle'> = ['chase', 'attack', 'chase', 'idle'];
    const idx = phases.indexOf(e.aiState as any);
    e.aiState = phases[((idx < 0 ? -1 : idx) + 1) % phases.length];
    e.stateTimer = e.aiState === 'attack' ? 2.5 : e.aiState === 'chase' ? 2 : 0.8;
  }

  if (e.aiState === 'chase') {
    e.x += n.x * e.speed * 1.5 * dt;
    e.y += n.y * e.speed * 1.5 * dt;
  }

  if (e.aiState === 'attack' && e.attackCooldown <= 0) {
    e.attackCooldown = 0.7;
    const angle = Math.atan2(dy, dx);
    const count = 8;
    const speed = C.SHOOTER_PROJ_SPEED * 0.7;
    for (let i = 0; i < count; i++) {
      const a = angle + (i / count) * Math.PI * 2 + e.wobble * 0.5;
      projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        size: 4, damage: e.damage, isPlayerOwned: false, lifetime: 3,
        piercing: false, explosive: false, trail: [],
        hitTargets: [], volleyId: 0,
      });
    }
  }

  // Spawn clones at 40% HP
  const hpPct = e.hp / e.maxHp;
  if (hpPct < 0.4 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      spawns.push({ type: 'phantom', x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50 });
    }
    emitBossAction({ spawnEnemies: spawns, screenShake: 8 });
  }
}

// ============ BOSS AI — FLOOR 2: O CAÇADOR ============
// Extremely fast, constant dashes, blur trails, disorienting speed

function updateBoss2(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[]) {
  if (e.stateTimer <= 0) {
    const phases = ['chase', 'charge', 'attack', 'chase', 'charge'] as const;
    const idx = phases.indexOf(e.aiState as any);
    const next = (idx + 1) % phases.length;
    e.aiState = phases[next] as any;
    e.stateTimer = e.aiState === 'charge' ? 0.4 : e.aiState === 'attack' ? 1.5 : 1.2;

    if (e.aiState === 'charge') {
      e.vx = n.x;
      e.vy = n.y;
    }
  }

  if (e.aiState === 'chase') {
    // Very fast chase with erratic movement
    const erratic = Math.sin(e.wobble * 8) * 0.6;
    e.x += (n.x + erratic * -n.y) * e.speed * 3.0 * dt;
    e.y += (n.y + erratic * n.x) * e.speed * 3.0 * dt;
  } else if (e.aiState === 'charge') {
    // Blazing dash toward player
    e.x += e.vx * e.speed * 8.0 * dt;
    e.y += e.vy * e.speed * 8.0 * dt;
    e.flashTime = 0.02;
  } else if (e.aiState === 'attack') {
    // Rapid burst shots while circling
    const circleX = -n.y * e.speed * 2 * dt;
    const circleY = n.x * e.speed * 2 * dt;
    e.x += circleX;
    e.y += circleY;

    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.2;
      const angle = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) {
        projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle + i * 0.3) * C.SHOOTER_PROJ_SPEED * 1.2,
          vy: Math.sin(angle + i * 0.3) * C.SHOOTER_PROJ_SPEED * 1.2,
          size: 4, damage: e.damage, isPlayerOwned: false, lifetime: 2.5,
          piercing: false, explosive: false, trail: [],
          hitTargets: [], volleyId: 0,
        });
      }
    }
  }

  const hpPct = e.hp / e.maxHp;
  // Frenzy at 50% — permanent speed boost
  if (hpPct < 0.5 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    e.speed *= 1.5;
    emitBossAction({ screenShake: 10, panic: true });
  }
  // Clone rush at 25%
  if (hpPct < 0.25 && e.fuseTimer < 2) {
    e.fuseTimer = 2;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      spawns.push({ type: 'flash_hunter', x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50 });
    }
    emitBossAction({ spawnEnemies: spawns, screenShake: 12 });
  }
}

// ============ BOSS AI — FLOOR 3: O INVOCADOR ============
// Summons waves of enemies, gets more chaotic over time

function updateBoss3(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[], allEnemies: EnemyState[]) {
  // Keep distance from player
  if (dist < 80) {
    e.x += -n.x * e.speed * 1.5 * dt;
    e.y += -n.y * e.speed * 1.5 * dt;
  } else if (dist > 150) {
    e.x += n.x * e.speed * 0.5 * dt;
    e.y += n.y * e.speed * 0.5 * dt;
  } else {
    // Circle player
    const circleX = -n.y * Math.sin(e.wobble * 0.8);
    const circleY = n.x * Math.sin(e.wobble * 0.8);
    e.x += circleX * e.speed * dt;
    e.y += circleY * e.speed * dt;
  }

  // Continuous summoning — faster as HP drops
  const hpPct = e.hp / e.maxHp;
  const summonInterval = 4 * hpPct + 1; // 5s at full HP, 1s at low HP
  e.summonTimer -= dt;

  if (e.summonTimer <= 0) {
    e.summonTimer = summonInterval;
    const minionCount = Math.min(allEnemies.length, 15) < 12 ? (3 + Math.floor((1 - hpPct) * 3)) : 0;
    if (minionCount > 0) {
      const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
      const possibleTypes: EnemyType[] = ['chaser', 'swarm', 'swarm', 'shooter', 'bomber', 'wraith', 'stalker'];
      for (let i = 0; i < minionCount; i++) {
        const a = (i / minionCount) * Math.PI * 2;
        spawns.push({
          type: possibleTypes[Math.floor(Math.random() * possibleTypes.length)],
          x: e.x + Math.cos(a) * 45, y: e.y + Math.sin(a) * 45,
        });
      }
      emitBossAction({ spawnEnemies: spawns, screenShake: 4 });
    }
  }

  // Defensive projectile ring
  if (e.attackCooldown <= 0) {
    e.attackCooldown = 2;
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + e.wobble;
      projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * C.SHOOTER_PROJ_SPEED * 0.5,
        vy: Math.sin(a) * C.SHOOTER_PROJ_SPEED * 0.5,
        size: 3, damage: e.damage, isPlayerOwned: false, lifetime: 3,
        piercing: false, explosive: false, trail: [],
        hitTargets: [], volleyId: 0,
      });
    }
  }

  // Lights out at 40%
  if (hpPct < 0.4 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    emitBossAction({ lightsOut: 6, lockDoors: 8, screenShake: 10 });
  }
  // Mega summon at 20%
  if (hpPct < 0.2 && e.fuseTimer < 2) {
    e.fuseTimer = 2;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spawns.push({
        type: (['wraith', 'stalker', 'bomber', 'flash_hunter', 'distortion', 'chaser', 'necromancer', 'warper'] as EnemyType[])[i],
        x: C.dims.gw / 2 + Math.cos(a) * 80,
        y: C.dims.gh / 2 + Math.sin(a) * 80,
      });
    }
    emitBossAction({ spawnEnemies: spawns, screenShake: 15, panic: true });
  }
}

// ============ BOSS AI — FLOOR 4: O FANTASMA ============
// Rapid teleportation, hit-and-run, unpredictable

function updateBoss4(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[]) {
  if (e.stateTimer <= 0) {
    const phases = ['teleport', 'attack', 'teleport', 'chase', 'teleport', 'attack'] as const;
    const idx = phases.indexOf(e.aiState as any);
    const next = (idx + 1) % phases.length;
    e.aiState = phases[next] as any;
    e.stateTimer = e.aiState === 'teleport' ? 0.8 : e.aiState === 'attack' ? 1.5 : 1.0;

    if (e.aiState === 'teleport') {
      // Teleport near player from random angle
      const tAngle = Math.random() * Math.PI * 2;
      const tDist = 25 + Math.random() * 35;
      e.x = Math.max(C.TILE_SIZE * 3, Math.min(C.dims.gw - C.TILE_SIZE * 3, player.x + Math.cos(tAngle) * tDist));
      e.y = Math.max(C.TILE_SIZE * 3, Math.min(C.dims.gh - C.TILE_SIZE * 3, player.y + Math.sin(tAngle) * tDist));
      e.phaseAlpha = 0.2;
      e.flashTime = 0.1;
    }
  }

  if (e.aiState === 'teleport') {
    e.phaseAlpha = Math.min(1, e.phaseAlpha + dt * 3);
  } else if (e.aiState === 'chase') {
    e.x += n.x * e.speed * 2.5 * dt;
    e.y += n.y * e.speed * 2.5 * dt;
    e.phaseAlpha = 0.6 + Math.sin(e.wobble * 8) * 0.3;
  } else if (e.aiState === 'attack') {
    // Rapid aimed shots
    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.15;
      const angle = Math.atan2(dy, dx);
      projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * C.SHOOTER_PROJ_SPEED * 1.4,
        vy: Math.sin(angle) * C.SHOOTER_PROJ_SPEED * 1.4,
        size: 5, damage: e.damage, isPlayerOwned: false, lifetime: 3,
        piercing: false, explosive: false, trail: [],
        hitTargets: [], volleyId: 0,
      });
    }
    e.phaseAlpha = 0.8;
  }

  // Permanent phasing
  e.phaseAlpha = Math.min(1, e.phaseAlpha);

  const hpPct = e.hp / e.maxHp;
  // Faster teleports at 60%
  if (hpPct < 0.6 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    e.speed *= 1.3;
    emitBossAction({ lightsOut: 3, screenShake: 8 });
  }
  // Panic teleport storm at 30%
  if (hpPct < 0.3 && e.fuseTimer < 2) {
    e.fuseTimer = 2;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      spawns.push({ type: 'warper', x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50 });
    }
    emitBossAction({ spawnEnemies: spawns, panic: true, screenShake: 12 });
  }
}

// ============ BOSS AI — FLOOR 5: O DESTRUIDOR ============
// Massive, devastating attacks, ground slams, projectile walls

function updateBoss5(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[]) {
  if (e.stateTimer <= 0) {
    const phases = ['chase', 'attack', 'charge', 'attack', 'chase'] as const;
    const idx = phases.indexOf(e.aiState as any);
    const next = (idx + 1) % phases.length;
    e.aiState = phases[next] as any;
    e.stateTimer = e.aiState === 'charge' ? 0.6 : e.aiState === 'attack' ? 2.0 : 1.5;

    if (e.aiState === 'charge') {
      e.vx = n.x;
      e.vy = n.y;
    }
  }

  if (e.aiState === 'chase') {
    e.x += n.x * e.speed * 2.0 * dt;
    e.y += n.y * e.speed * 2.0 * dt;
  } else if (e.aiState === 'charge') {
    // Devastating charge
    e.x += e.vx * e.speed * 6.0 * dt;
    e.y += e.vy * e.speed * 6.0 * dt;
    e.flashTime = 0.03;
    // Leave explosive trail
    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.1;
      projectiles.push({
        x: e.x - e.vx * 10, y: e.y - e.vy * 10,
        vx: 0, vy: 0,
        size: 6, damage: Math.floor(e.damage * 0.7), isPlayerOwned: false, lifetime: 1.5,
        piercing: false, explosive: true, trail: [],
        hitTargets: [], volleyId: 0,
      });
    }
  } else if (e.aiState === 'attack') {
    // Ground slam — projectile wall in all directions
    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.5;
      const count = 16;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + e.wobble;
        projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * C.SHOOTER_PROJ_SPEED * 0.8,
          vy: Math.sin(a) * C.SHOOTER_PROJ_SPEED * 0.8,
          size: 6, damage: e.damage, isPlayerOwned: false, lifetime: 3,
          piercing: false, explosive: i % 4 === 0, trail: [],
          hitTargets: [], volleyId: 0,
        });
      }
      emitBossAction({ screenShake: 6 });
    }
  }

  const hpPct = e.hp / e.maxHp;
  // Enrage at 50% — faster, stronger
  if (hpPct < 0.5 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    e.speed *= 1.4;
    e.damage = Math.floor(e.damage * 1.3);
    emitBossAction({ screenShake: 15, lockDoors: 10 });
  }
  // Desperation at 20% — lights out + minion wave
  if (hpPct < 0.2 && e.fuseTimer < 2) {
    e.fuseTimer = 2;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spawns.push({ type: 'bomber', x: C.dims.gw / 2 + Math.cos(a) * 70, y: C.dims.gh / 2 + Math.sin(a) * 70 });
    }
    emitBossAction({ spawnEnemies: spawns, lightsOut: 5, panic: true, screenShake: 20 });
  }
}

// ============ BOSS AI — FLOOR 6: O PESADELO ============
// Combines ALL mechanics — speed, summons, teleport, devastation, unpredictable phase shifts

function updateBoss6(e: EnemyState, player: PlayerState, n: Vec2, dx: number, dy: number, dist: number, dt: number, projectiles: ProjectileState[], allEnemies: EnemyState[]) {
  if (e.stateTimer <= 0) {
    // Randomly pick next phase
    const phases: Array<'chase' | 'charge' | 'teleport' | 'attack'> = ['chase', 'charge', 'teleport', 'attack'];
    e.aiState = phases[Math.floor(Math.random() * phases.length)];
    e.stateTimer = 0.8 + Math.random() * 1.5;

    if (e.aiState === 'charge') {
      e.vx = n.x;
      e.vy = n.y;
    }
    if (e.aiState === 'teleport') {
      const tAngle = Math.random() * Math.PI * 2;
      const tDist = 20 + Math.random() * 30;
      e.x = Math.max(C.TILE_SIZE * 3, Math.min(C.dims.gw - C.TILE_SIZE * 3, player.x + Math.cos(tAngle) * tDist));
      e.y = Math.max(C.TILE_SIZE * 3, Math.min(C.dims.gh - C.TILE_SIZE * 3, player.y + Math.sin(tAngle) * tDist));
      e.phaseAlpha = 0.3;
      e.flashTime = 0.1;
    }
  }

  if (e.aiState === 'chase') {
    const spd = e.speed * 3.0;
    e.x += n.x * spd * dt;
    e.y += n.y * spd * dt;
  } else if (e.aiState === 'charge') {
    e.x += e.vx * e.speed * 7.0 * dt;
    e.y += e.vy * e.speed * 7.0 * dt;
    e.flashTime = 0.02;
  } else if (e.aiState === 'teleport') {
    e.phaseAlpha = Math.min(1, e.phaseAlpha + dt * 4);
    // Attack immediately after teleport
    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.3;
      const angle = Math.atan2(dy, dx);
      for (let i = -2; i <= 2; i++) {
        projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle + i * 0.25) * C.SHOOTER_PROJ_SPEED * 1.5,
          vy: Math.sin(angle + i * 0.25) * C.SHOOTER_PROJ_SPEED * 1.5,
          size: 5, damage: e.damage, isPlayerOwned: false, lifetime: 3,
          piercing: i === 0, explosive: false, trail: [],
          hitTargets: [], volleyId: 0,
        });
      }
    }
  } else if (e.aiState === 'attack') {
    if (e.attackCooldown <= 0) {
      e.attackCooldown = 0.35;
      // Spiral + aimed combo
      const count = 12;
      const angle = Math.atan2(dy, dx);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + e.wobble * 2;
        projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * C.SHOOTER_PROJ_SPEED * 0.9,
          vy: Math.sin(a) * C.SHOOTER_PROJ_SPEED * 0.9,
          size: 5, damage: e.damage, isPlayerOwned: false, lifetime: 4,
          piercing: false, explosive: i % 3 === 0, trail: [],
          hitTargets: [], volleyId: 0,
        });
      }
      // Aimed piercing shot
      projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * C.SHOOTER_PROJ_SPEED * 2,
        vy: Math.sin(angle) * C.SHOOTER_PROJ_SPEED * 2,
        size: 7, damage: Math.floor(e.damage * 1.5), isPlayerOwned: false, lifetime: 4,
        piercing: true, explosive: false, trail: [],
        hitTargets: [], volleyId: 0,
      });
    }
  }

  e.phaseAlpha = Math.min(1, (e.phaseAlpha || 1) + dt * 2);

  // Continuous summoning
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && allEnemies.length < 15) {
    e.summonTimer = 2.5;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    const types: EnemyType[] = ['phantom', 'flash_hunter', 'warper', 'distortion'];
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      spawns.push({ type: types[i % types.length], x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40 });
    }
    emitBossAction({ spawnEnemies: spawns });
  }

  const hpPct = e.hp / e.maxHp;
  // Phase 2 at 60% — lights out
  if (hpPct < 0.6 && e.fuseTimer < 1) {
    e.fuseTimer = 1;
    e.speed *= 1.3;
    emitBossAction({ lightsOut: 5, screenShake: 10, lockDoors: 10 });
  }
  // Phase 3 at 35% — mega summon + panic
  if (hpPct < 0.35 && e.fuseTimer < 2) {
    e.fuseTimer = 2;
    const spawns: Array<{ type: EnemyType; x: number; y: number }> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spawns.push({
        type: (['stalker', 'bomber', 'wraith', 'flash_hunter', 'distortion', 'accelerator'] as EnemyType[])[i],
        x: C.dims.gw / 2 + Math.cos(a) * 80, y: C.dims.gh / 2 + Math.sin(a) * 80,
      });
    }
    emitBossAction({ spawnEnemies: spawns, panic: true, screenShake: 20, lightsOut: 4 });
  }
  // Final desperation at 15%
  if (hpPct < 0.15 && e.fuseTimer < 3) {
    e.fuseTimer = 3;
    e.speed *= 1.5;
    e.damage = Math.floor(e.damage * 1.4);
    emitBossAction({ panic: true, screenShake: 25, lockDoors: 15 });
  }
}

// ============ MAIN BOSS UPDATE DISPATCHER ============

export function updateBossAI(
  e: EnemyState, player: PlayerState,
  dx: number, dy: number, dist: number, dt: number,
  projectiles: ProjectileState[], allEnemies: EnemyState[]
) {
  const n = normalize(dx, dy);
  const floor = bossFloor;

  switch (floor) {
    case 1: updateBoss1(e, player, n, dx, dy, dist, dt, projectiles); break;
    case 2: updateBoss2(e, player, n, dx, dy, dist, dt, projectiles); break;
    case 3: updateBoss3(e, player, n, dx, dy, dist, dt, projectiles, allEnemies); break;
    case 4: updateBoss4(e, player, n, dx, dy, dist, dt, projectiles); break;
    case 5: updateBoss5(e, player, n, dx, dy, dist, dt, projectiles); break;
    case 6: updateBoss6(e, player, n, dx, dy, dist, dt, projectiles, allEnemies); break;
    default: updateBoss1(e, player, n, dx, dy, dist, dt, projectiles); break;
  }

  // Clamp
  const margin = C.TILE_SIZE + e.width / 2;
  e.x = Math.max(margin, Math.min(C.dims.gw - margin, e.x));
  e.y = Math.max(margin, Math.min(C.dims.gh - margin, e.y));
}
