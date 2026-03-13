import { PlayerState, Vec2, EnemyState } from './types';
import * as C from './constants';

export interface KatanaStrike {
    id: number;
    duration: number; // Total attack duration
    activeWindow: [number, number]; // When it can hit (start to end % of duration)
    lunge: number; // Pixels forward
    lift: number; // Vertical offset
    rangeMult: number;
    arcMult: number;
    damageMult: number;
    knockback: number;
    sfx: string;
}

export const KATANA_COMBO: KatanaStrike[] = [
    {
        id: 1,
        duration: 0.18,
        activeWindow: [0.2, 0.6],
        lunge: 10,
        lift: 0,
        rangeMult: 1.1,
        arcMult: 1.2,
        damageMult: 1.0,
        knockback: 2,
        sfx: 'katana1'
    },
    {
        id: 2,
        duration: 0.16,
        activeWindow: [0.15, 0.5],
        lunge: 12,
        lift: 0,
        rangeMult: 1.1,
        arcMult: 1.3,
        damageMult: 1.1,
        knockback: 3,
        sfx: 'katana2'
    },
    {
        id: 3,
        duration: 0.22,
        activeWindow: [0.2, 0.7],
        lunge: 8,
        lift: -6,
        rangeMult: 1.2,
        arcMult: 1.5,
        damageMult: 1.3,
        knockback: 4,
        sfx: 'katana3'
    },
    {
        id: 4,
        duration: 0.45, // Slightly longer for the heavy feel
        activeWindow: [0.3, 0.8],
        lunge: 55,
        lift: 0,
        rangeMult: 1.7, // Massive reach for the finisher
        arcMult: 2.8,
        damageMult: 2.2,
        knockback: 10,
        sfx: 'katana4'
    }
];

export class KatanaComboController {
    private p: PlayerState;
    private comboResetTimer: number = 0;
    private currentStep: number = 0; // 0 to 3

    constructor(player: PlayerState) {
        this.p = player;
    }

    update(dt: number) {
        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0 && !this.p.meleeAttacking) {
                this.reset();
            }
        }
    }

    tryAttack(mouseX: number, mouseY: number): boolean {
        if (this.p.meleeCooldown > 0) return false;

        const strike = KATANA_COMBO[this.currentStep];
        const attackSpeed = this.p.attackSpeedMult * this.p.temporaryAttackSpeedMult;

        // Set state
        this.p.meleeAttacking = true;
        this.p.activeComboStep = this.currentStep + 1;
        const angle = Math.atan2(mouseY - this.p.y, mouseX - this.p.x);
        this.p.meleeAngle = angle;

        // Face the attack direction
        this.p.facing.x = Math.abs(Math.cos(angle)) > 0.1 ? Math.sign(Math.cos(angle)) : 0;
        this.p.facing.y = Math.abs(Math.sin(angle)) > 0.1 ? Math.sign(Math.sin(angle)) : 0;
        if (this.p.facing.x === 0 && this.p.facing.y === 0) this.p.facing.x = 1; // Fallback

        this.p.meleeTimer = strike.duration / attackSpeed;
        this.p.meleeCooldown = (strike.duration + 0.05) / attackSpeed;

        // Reset window
        this.comboResetTimer = 0.7; // Window to next hit

        // Prepare next step
        this.currentStep = (this.currentStep + 1) % 4;
        return true;
    }

    getCurrentStrike(): KatanaStrike {
        return KATANA_COMBO[(this.p.activeComboStep - 1) % 4];
    }

    reset() {
        this.currentStep = 0;
        this.comboResetTimer = 0;
        this.p.activeComboStep = 1;
    }
}
