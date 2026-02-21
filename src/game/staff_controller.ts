/**
 * StaffWeaponController
 * =====================
 * Handles the complete fire cycle for the Void Staff weapon:
 *   1. Player presses attack → starts charge (0.25s)
 *   2. During charge → visual energy builds on staff tip
 *   3. Charge complete → fire bolt, screen shake, impact particles
 *
 * The staff REPLACES melee and hand-ranged completely.
 * No reuse of katana/sword code.
 */

import { PlayerState, ProjectileState, Vec2 } from './types';
import * as C from './constants';
import { StaffPositioning } from './renderer';

// ── Staff constants ──────────────────────────────────────────────────────────

/** Charge duration in seconds before bolt fires */
export const STAFF_CHARGE_DURATION = 0.26;

/** Base cooldown between shots (attackSpeedMult is applied) */
export const STAFF_COOLDOWN_BASE = 0.9;

/** Bolt travel speed px/s */
export const STAFF_BOLT_SPEED = 420;

/** Bolt lifetime in seconds */
export const STAFF_BOLT_LIFETIME = 1.6;

/** Bolt size (radius equivalent) */
export const STAFF_BOLT_SIZE = 9;

/** Damage multiplier vs player projectileDamage */
export const STAFF_DAMAGE_MULT = 2.0;

// ── Staff tip socket ── removed, now using StaffPositioning system ── ─────────────


// ── Controller ───────────────────────────────────────────────────────────────

export class StaffWeaponController {
    private p: PlayerState;
    private cooldownTimer = 0;

    // Public so engine can read
    public isCharging = false;
    public chargeTimer = 0;
    public chargeTarget: Vec2 = { x: 0, y: 0 };
    private time = 0;

    constructor(player: PlayerState) {
        this.p = player;
        // Initialise player state fields
        this.p.isStaffCharging = false;
        this.p.staffChargeTimer = 0;
        this.p.staffChargeTarget = { x: 0, y: 0 };
    }

    /** Call every frame with dt and gameTime */
    update(dt: number, time: number) {
        this.time = time;
        if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

        // Sync to player state for renderer
        this.p.isStaffCharging = this.isCharging;
        this.p.staffChargeTimer = this.chargeTimer;

        if (this.isCharging) {
            this.chargeTimer -= dt;
            this.p.staffChargeTimer = this.chargeTimer;
        }
    }

    /** Returns true if a new charge can begin */
    canFire(): boolean {
        return this.cooldownTimer <= 0 && !this.isCharging;
    }

    /** Begin charging toward target. Returns false if not ready. */
    startCharge(targetX: number, targetY: number): boolean {
        if (!this.canFire()) return false;
        this.isCharging = true;
        this.chargeTimer = STAFF_CHARGE_DURATION;
        this.chargeTarget = { x: targetX, y: targetY };
        this.p.staffChargeTarget = { x: targetX, y: targetY };
        // Slow player while charging
        this.p.isRangedCharging = true;
        return true;
    }

    /**
     * Call this each frame AFTER update().
     * Returns a fired bolt array when charge completes, or [] otherwise.
     */
    tryFireIfCharged(): ProjectileState[] {
        if (!this.isCharging || this.chargeTimer > 0) return [];

        this.isCharging = false;
        this.p.isStaffCharging = false;
        this.p.isRangedCharging = false;

        const attackSpeed = this.p.attackSpeedMult * this.p.temporaryAttackSpeedMult;
        this.cooldownTimer = STAFF_COOLDOWN_BASE / attackSpeed;

        const count = this.p.projectileCount;
        const tip = this.getStaffTipWorld();
        const baseAngle = Math.atan2(
            this.chargeTarget.y - tip.y,
            this.chargeTarget.x - tip.x
        );

        const bolts: ProjectileState[] = [];
        const volleyId = Date.now() + Math.random();

        for (let i = 0; i < count; i++) {
            // Spread: projectiles fan out if more than 1
            let angle = baseAngle;
            if (count > 1) {
                const spread = 0.15; // radians spread between shots
                angle = baseAngle + (i - (count - 1) / 2) * spread;
            }
            bolts.push(this._createBolt(tip, angle, volleyId));
        }

        return bolts;
    }

    /** Get the world-space staff tip position (Point of fire) */
    getStaffTipWorld(): Vec2 {
        // Now using central positioning system from renderer
        return StaffPositioning.getTipSocketWorld(this.p, this.time);
    }

    private _createBolt(tip: Vec2, angle: number, volleyId: number): ProjectileState {
        const damage = this.p.projectileDamage * this.p.damageMultiplier * STAFF_DAMAGE_MULT;

        return {
            x: tip.x,
            y: tip.y,
            vx: Math.cos(angle) * STAFF_BOLT_SPEED,
            vy: Math.sin(angle) * STAFF_BOLT_SPEED,
            size: STAFF_BOLT_SIZE * this.p.areaMultiplier,
            damage,
            isPlayerOwned: true,
            lifetime: STAFF_BOLT_LIFETIME,
            maxLifetime: STAFF_BOLT_LIFETIME,
            piercing: this.p.piercing,
            explosive: this.p.explosive,
            trail: [],
            hitTargets: [],
            volleyId,
            angle,
            animationTimer: 0,
            projectileKind: 'staff_bolt',
        };
    }

    /**
     * Fires a staff volley immediately at the given target.
     * Used for auto-repeat effects like 'Cruel Repetition'.
     */
    fireDirect(target: Vec2): ProjectileState[] {
        const count = this.p.projectileCount;
        const tip = this.getStaffTipWorld();
        const baseAngle = Math.atan2(
            target.y - tip.y,
            target.x - tip.x
        );

        const bolts: ProjectileState[] = [];
        const volleyId = Date.now() + Math.random();

        for (let i = 0; i < count; i++) {
            let angle = baseAngle;
            if (count > 1) {
                const spread = 0.15;
                angle = baseAngle + (i - (count - 1) / 2) * spread;
            }
            bolts.push(this._createBolt(tip, angle, volleyId));
        }
        return bolts;
    }

    reset() {
        this.isCharging = false;
        this.chargeTimer = 0;
        this.cooldownTimer = 0;
        this.p.isStaffCharging = false;
        this.p.isRangedCharging = false;
    }
}
