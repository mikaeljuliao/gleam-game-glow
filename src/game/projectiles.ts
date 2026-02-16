import { ProjectileState, PlayerState } from './types';
import * as C from './constants';

export function createPlayerProjectile(p: PlayerState, targetX: number, targetY: number): ProjectileState[] {
  const projectiles: ProjectileState[] = [];
  const baseAngle = Math.atan2(targetY - p.y, targetX - p.x);
  const count = p.projectileCount;

  const volleyId = Date.now() + Math.random();
  for (let i = 0; i < count; i++) {
    const spread = count > 1 ? (i - (count - 1) / 2) * 0.15 : 0;
    const angle = baseAngle + spread;
    projectiles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * C.PROJECTILE_SPEED,
      vy: Math.sin(angle) * C.PROJECTILE_SPEED,
      size: C.PROJECTILE_SIZE,
      damage: p.projectileDamage * p.damageMultiplier,
      isPlayerOwned: true,
      lifetime: C.PROJECTILE_LIFETIME,
      piercing: p.piercing,
      explosive: p.explosive,
      trail: [],
      hitTargets: [],
      volleyId,
    });
  }
  return projectiles;
}

export function updateProjectile(proj: ProjectileState, dt: number): boolean {
  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.lifetime -= dt;

  if (proj.x < C.TILE_SIZE || proj.x > C.dims.gw - C.TILE_SIZE ||
    proj.y < C.TILE_SIZE || proj.y > C.dims.gh - C.TILE_SIZE) {
    return false;
  }

  return proj.lifetime > 0;
}
