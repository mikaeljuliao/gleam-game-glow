import { PlayerState, Vec2 } from './types';
import * as C from './constants';

export function createPlayer(): PlayerState {
  return {
    x: C.dims.gw / 2,
    y: C.dims.gh / 2,
    width: C.PLAYER_SIZE,
    height: C.PLAYER_SIZE,
    hp: C.PLAYER_MAX_HP,
    maxHp: C.PLAYER_MAX_HP,
    speed: C.PLAYER_SPEED,
    xp: 0,
    xpToNext: C.XP_BASE,
    level: 1,
    facing: { x: 0, y: -1 },
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    meleeCooldown: 0,
    rangedCooldown: 0,
    invincibleTime: 0,
    upgrades: [],
    baseDamage: C.MELEE_DAMAGE,
    projectileDamage: C.RANGED_DAMAGE,
    projectileCount: 1,
    attackSpeedMult: 1,
    moveSpeedMult: 1,
    damageMultiplier: 1,
    areaMultiplier: 1,
    meleeAttacking: false,
    meleeAngle: 0,
    meleeTimer: 0,
    lifesteal: 0,
    piercing: false,
    explosive: false,
    trail: [],
    idleTime: 0,
    xpGlowTimer: 0,
    armor: 1,
    critChance: 0,
    critMultiplier: 2,
    xpMultiplier: 1,
    dashEnhanced: false,
    thorns: 0,
    xpMagnetRange: 0,
    fireAura: false,
    fireAuraDPS: 0,
    shieldCooldown: 0,
    shieldReady: false,
    chainBounces: 0,
    berserker: false,
    hasRevive: false,
    reviveUsed: false,
    shadowClone: false,
    shadowCloneX: 0,
    shadowCloneY: 0,
    shadowCloneAngle: 0,
    souls: 0,
    hasDisciple: false,
    discipleX: 0,
    discipleY: 0,
    discipleAngle: 0,
  };
}

export function updatePlayer(p: PlayerState, moveDir: Vec2, dt: number) {
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.meleeCooldown > 0) p.meleeCooldown -= dt;
  if (p.rangedCooldown > 0) p.rangedCooldown -= dt;
  if (p.invincibleTime > 0) p.invincibleTime -= dt;
  if (p.meleeTimer > 0) {
    p.meleeTimer -= dt;
    if (p.meleeTimer <= 0) p.meleeAttacking = false;
  }

  if (p.isDashing) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) p.isDashing = false;
  }

  const dashSpeed = p.dashEnhanced ? C.PLAYER_DASH_SPEED * 1.5 : C.PLAYER_DASH_SPEED;
  let speed = p.isDashing ? dashSpeed : p.speed * p.moveSpeedMult;

  // Add weight/commitment to melee attacks: slow down during anticipation and swing
  if (p.meleeAttacking && p.meleeTimer > 0.1) {
    speed *= 0.5;
  }

  p.x += moveDir.x * speed * dt;
  p.y += moveDir.y * speed * dt;

  if (moveDir.x !== 0 || moveDir.y !== 0) {
    p.facing = { x: moveDir.x, y: moveDir.y };
  }

  const margin = C.TILE_SIZE + p.width / 2;
  p.x = Math.max(margin, Math.min(C.dims.gw - margin, p.x));
  p.y = Math.max(margin, Math.min(C.dims.gh - margin, p.y));
}

export function tryDash(p: PlayerState): boolean {
  if (p.dashCooldown <= 0 && !p.isDashing) {
    p.isDashing = true;
    const durationMult = p.dashEnhanced ? 1.8 : 1;
    p.dashTimer = C.PLAYER_DASH_DURATION * durationMult;
    p.invincibleTime = C.PLAYER_DASH_DURATION * durationMult;
    p.dashCooldown = C.PLAYER_DASH_COOLDOWN;
    return true;
  }
  return false;
}

export function tryMelee(p: PlayerState, mouseX: number, mouseY: number): boolean {
  if (p.meleeCooldown > 0) return false;
  // Melee sequence: 0.05s anticipation -> 0.1s swing -> 0.1s recovery
  p.meleeCooldown = C.MELEE_COOLDOWN / p.attackSpeedMult;
  p.meleeAttacking = true;
  p.meleeAngle = Math.atan2(mouseY - p.y, mouseX - p.x);
  p.meleeTimer = 0.25;
  return true;
}

export function canRangedAttack(p: PlayerState): boolean {
  return p.rangedCooldown <= 0;
}

export function doRangedAttack(p: PlayerState) {
  p.rangedCooldown = C.RANGED_COOLDOWN / p.attackSpeedMult;
}

export function addXP(p: PlayerState, amount: number): boolean {
  p.xp += amount;
  if (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = Math.floor(C.XP_BASE * Math.pow(C.XP_MULTIPLIER, p.level - 1));
    return true;
  }
  return false;
}

export function damagePlayer(p: PlayerState, amount: number): boolean {
  if (p.invincibleTime > 0) return false;
  p.hp = Math.max(0, p.hp - amount);
  p.invincibleTime = 0.5;
  return p.hp <= 0;
}
