/**
 * Enemy Projectile System
 * ========================
 * Factory functions for every enemy projectile kind.
 * Each kind carries a `projectileKind` tag so the renderer
 * can give it a unique visual without touching game logic.
 *
 * Kinds:
 *   basic     — small shadowy orb (Shooter)
 *   needle    — thin fast spike  (Flash Hunter / Boss 2 rapid burst)
 *   heavy     — slow pulsing orb (Boss charge trail / Boss 5)
 *   boss_orb  — standard boss radial shot
 *   boss_arc  — wide arc sweep  (Boss 1 burst)
 *   boss_void — piercing void beam (Boss 6 aimed)
 *   boss_frag — dimensional fragment that splits (Boss 4 / Boss 6)
 */

import { ProjectileState } from './types';
import * as C from './constants';

// ── Shared defaults ──────────────────────────────────────────────────────────

function base(
    x: number, y: number,
    vx: number, vy: number,
    size: number, damage: number, lifetime: number
): Omit<ProjectileState, 'projectileKind'> {
    const angle = Math.atan2(vy, vx);
    return {
        x, y, vx, vy, size, damage, lifetime,
        maxLifetime: lifetime,
        isPlayerOwned: false,
        piercing: false,
        explosive: false,
        trail: [],
        hitTargets: [],
        volleyId: Date.now() + Math.random(),
        angle,
        animationTimer: 0,
    };
}

// ── Factories ────────────────────────────────────────────────────────────────

/** Small dark orb — Shooter enemies */
export function makeBasicProjectile(
    x: number, y: number,
    toX: number, toY: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED
): ProjectileState {
    const angle = Math.atan2(toY - y, toX - x);
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 3.5, damage, 3),
        projectileKind: 'basic',
    };
}

/** Thin fast needle — Flash Hunter / Boss 2 rapid burst */
export function makeNeedleProjectile(
    x: number, y: number,
    angle: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED * 1.6
): ProjectileState {
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 2.5, damage, 2.2),
        projectileKind: 'needle',
    };
}

/** Slow heavy pulsing orb — Boss charge trail / Boss 5 slam */
export function makeHeavyProjectile(
    x: number, y: number,
    vx: number, vy: number,
    damage: number,
    explosive = false,
    lifetime = 2.5
): ProjectileState {
    return {
        ...base(x, y, vx, vy, 7, damage, lifetime),
        explosive,
        projectileKind: 'heavy',
    };
}

/** Generic boss radial orb */
export function makeBossOrbProjectile(
    x: number, y: number,
    angle: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED * 0.75,
    lifetime = 3.5
): ProjectileState {
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, damage, lifetime),
        projectileKind: 'boss_orb',
    };
}

/** Boss arc sweep — wide arc cut energy shot */
export function makeBossArcProjectile(
    x: number, y: number,
    angle: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED * 0.65
): ProjectileState {
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, damage, 3),
        projectileKind: 'boss_arc',
    };
}

/** Piercing void beam — Boss 6 aimed */
export function makeBossVoidProjectile(
    x: number, y: number,
    angle: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED * 2.2
): ProjectileState {
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, damage, 4),
        piercing: true,
        projectileKind: 'boss_void',
    };
}

/** Dimensional fragment — splits into 2 after 40% of lifetime */
export function makeBossFragProjectile(
    x: number, y: number,
    angle: number,
    damage: number,
    speed = C.SHOOTER_PROJ_SPEED * 1.4
): ProjectileState {
    return {
        ...base(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 4.5, damage, 3.5),
        projectileKind: 'boss_frag',
    };
}

// ── Split logic (called from engine update) ──────────────────────────────────

/**
 * Returns child fragments if a boss_frag has travelled 40% of its lifetime.
 * Returns empty array otherwise (caller should NOT push duplicates).
 */
export function tryFragSplit(proj: ProjectileState): ProjectileState[] {
    if (proj.projectileKind !== 'boss_frag') return [];
    const ratio = proj.lifetime / proj.maxLifetime;
    // Only split once, exactly when crossing the 60% elapsed mark
    if (ratio > 0.6 || (proj as any)._split) return [];
    (proj as any)._split = true;

    const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
    const baseAngle = Math.atan2(proj.vy, proj.vx);
    return [
        makeBossOrbProjectile(proj.x, proj.y, baseAngle + 0.35, proj.damage, speed * 0.7, proj.lifetime),
        makeBossOrbProjectile(proj.x, proj.y, baseAngle - 0.35, proj.damage, speed * 0.7, proj.lifetime),
    ];
}
