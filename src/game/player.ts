import { PlayerState, Vec2 } from './types';
import * as C from './constants';
import { SFX } from './audio';
import { hasEffect } from './traps';

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
    meleeComboStep: 1,
    activeComboStep: 1,
    meleeComboTimer: 0,
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
    potions: 0,
    maxPotions: 3,
    strengthBuffTimer: 0,
    defenseBuffTimer: 0,
    speedBuffTimer: 0,
    temporaryMoveSpeedMult: 1,
    temporaryAttackSpeedMult: 1,
    footstepTimer: 0,
    isMoving: false,
    weapon: 'sword',
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

  // Combo reset timer: if player waits too long, back to step 1
  if (p.meleeComboTimer > 0) {
    p.meleeComboTimer -= dt;
    if (p.meleeComboTimer <= 0 && !p.meleeAttacking) {
      p.meleeComboStep = 1;
    }
  }

  if (p.isDashing) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) p.isDashing = false;
  }

  // Footstep Sound Logic (Ghostly Walk)
  if ((moveDir.x !== 0 || moveDir.y !== 0) && !p.isDashing) {
    if (p.footstepTimer > 0) {
      p.footstepTimer -= dt;
    } else {
      SFX.footstep();
      // Random interval for natural feel (0.32s to 0.38s)
      p.footstepTimer = 0.35 + Math.random() * 0.06;
    }
  } else {
    // Reset timer when stopping so next step is immediate
    p.footstepTimer = 0.05;
  }

  const buffSpeed = p.speedBuffTimer > 0 ? 1.4 : 1.0;
  const dashSpeed = p.dashEnhanced ? C.PLAYER_DASH_SPEED * 1.5 : C.PLAYER_DASH_SPEED;

  // Combine multipliers: Permanent (upgrades) * Buffs * Temporary (amulets)
  let speedMult = p.moveSpeedMult * buffSpeed * p.temporaryMoveSpeedMult;

  // Apply Diminishing Returns: Scaled reduction after 1.5x speed
  if (speedMult > 1.5) {
    const excess = speedMult - 1.5;
    speedMult = 1.5 + excess * 0.4; // Only 40% of excess speed is applied
  }

  let speed = p.isDashing ? dashSpeed : p.speed * speedMult;

  // PROTECTION: No silent slowdowns.
  // We only allow speed <= baseline if a trap or debuff is explicit.
  const isSlowedByTrap = hasEffect('slowness');
  if (!isSlowedByTrap && speed < C.PLAYER_SPEED && !p.isDashing) {
    speed = C.PLAYER_SPEED;
  }

  // Apply Absolute Speed Cap (for non-dash movement)
  if (!p.isDashing && speed > C.PLAYER_MAX_SPEED_CAP) {
    speed = C.PLAYER_MAX_SPEED_CAP;
  }

  // Add weight/commitment to melee attacks: slow down during anticipation and swing
  if (p.meleeAttacking && p.meleeTimer > 0.1) {
    speed *= 0.5;
  }

  p.x += moveDir.x * speed * dt;
  p.y += moveDir.y * speed * dt;

  p.isMoving = (moveDir.x !== 0 || moveDir.y !== 0);

  if (p.isMoving) {
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
  const finalAttackSpeed = p.attackSpeedMult * p.temporaryAttackSpeedMult;

  const weaponCooldownMult = 1.0;
  const weaponTimerMult = 1.0;

  // Progression: 4th hit is slightly slower but more powerful (handled in engine/renderer)
  const isFinalHit = p.meleeComboStep === 4;
  const comboMult = isFinalHit ? 1.5 : 1.0;


  const finalCooldownMult = comboMult * weaponCooldownMult;
  const finalTimerMult = comboMult * weaponTimerMult;

  p.meleeCooldown = (C.MELEE_COOLDOWN * finalCooldownMult) / finalAttackSpeed;
  p.meleeAttacking = true;
  p.meleeAngle = Math.atan2(mouseY - p.y, mouseX - p.x);
  p.meleeTimer = 0.25 * finalTimerMult;

  // Update combo state
  p.meleeComboTimer = 0.8; // Window to continue (0.8s is generous for fluid feel)
  p.activeComboStep = p.meleeComboStep;
  p.meleeComboStep = (p.meleeComboStep % 4) + 1;

  return true;
}

export function canRangedAttack(p: PlayerState): boolean {
  return p.rangedCooldown <= 0;
}

export function doRangedAttack(p: PlayerState) {
  const finalAttackSpeed = p.attackSpeedMult * p.temporaryAttackSpeedMult;
  p.rangedCooldown = C.RANGED_COOLDOWN / finalAttackSpeed;
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

  // Apply armor and defense buff
  const buffArmorMult = p.defenseBuffTimer > 0 ? 0.7 : 1.0;
  const finalDamage = amount * p.armor * buffArmorMult;

  p.hp = Math.max(0, p.hp - finalDamage);
  p.invincibleTime = 0.5;
  return p.hp <= 0;
}
