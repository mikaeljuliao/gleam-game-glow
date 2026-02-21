import { ProjectileState, PlayerState } from './types';
import * as C from './constants';

export function createPlayerProjectile(p: PlayerState, targetX: number, targetY: number, originX: number, originY: number): ProjectileState[] {
  const projectiles: ProjectileState[] = [];
  const baseAngle = Math.atan2(targetY - originY, targetX - originX);
  const count = p.projectileCount;

  const volleyId = Date.now() + Math.random();
  for (let i = 0; i < count; i++) {
    const spread = count > 1 ? (i - (count - 1) / 2) * 0.15 : 0;
    const angle = baseAngle + spread;
    projectiles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * C.PROJECTILE_SPEED,
      vy: Math.sin(angle) * C.PROJECTILE_SPEED,
      size: C.PROJECTILE_SIZE * 2.5, // Vacuum Slash is larger
      damage: p.projectileDamage * p.damageMultiplier,
      isPlayerOwned: true,
      lifetime: C.PROJECTILE_LIFETIME * 0.7, // Medium range
      maxLifetime: C.PROJECTILE_LIFETIME * 0.7,
      piercing: p.piercing,
      explosive: p.explosive,
      trail: [],
      hitTargets: [],
      volleyId,
      angle,
      animationTimer: 0,
    });
  }
  return projectiles;
}

export const ProjectileLogic = {
  update(proj: ProjectileState, dt: number): boolean {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.lifetime -= dt;
    proj.animationTimer += dt;

    if (proj.x < C.TILE_SIZE || proj.x > C.dims.gw - C.TILE_SIZE ||
      proj.y < C.TILE_SIZE || proj.y > C.dims.gh - C.TILE_SIZE) {
      return false;
    }

    return proj.lifetime > 0;
  }
};

export function updateProjectile(proj: ProjectileState, dt: number): boolean {
  return ProjectileLogic.update(proj, dt);
}
