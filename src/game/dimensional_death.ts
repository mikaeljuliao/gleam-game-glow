import { Particle, Vec2, EnemyState, EssenceCore, PlayerState } from './types';
import { SFX } from './audio';
import { spawnSpark } from './particles';

export const DIMENSIONAL_COLORS = {
    primary: '#2a0052', // Dark purple
    glow: '#6a0dad',    // Bright purple
    boss: '#4b0082',    // Indigo
};

export const DeathParticles = {
    spawn(particles: Particle[], x: number, y: number, angle: number, count: number, isBoss: boolean) {
        for (let i = 0; i < count; i++) {
            const pAngle = angle + (Math.random() - 0.5) * 1.5;
            const speed = 40 + Math.random() * 80 * (isBoss ? 1.5 : 1);
            const life = 0.4 + Math.random() * 0.4;

            particles.push({
                x, y,
                vx: Math.cos(pAngle) * speed + (Math.random() - 0.5) * 20,
                vy: Math.sin(pAngle) * speed - (10 + Math.random() * 20), // Slight upward tendency
                life,
                maxLife: life,
                size: (isBoss ? 3 : 2) + Math.random() * 2,
                color: i % 3 === 0 ? DIMENSIONAL_COLORS.glow : DIMENSIONAL_COLORS.primary,
                type: 'dimensional_shard',
            });
        }
    }
};

export const EssenceCoreDrop = {
    create(x: number, y: number, isBoss: boolean, xp: number, souls: number): EssenceCore {
        return {
            id: Math.random().toString(36).substr(2, 9),
            x, y,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            collected: false,
            spawnTime: 0,
            type: isBoss ? 'boss' : 'basic',
            xp,
            souls
        };
    }
};

export const DimensionalDeathEffect = {
    // Hit stop logic is handled by setting engine.hitStopTimer

    applyImpactFlash(e: EnemyState) {
        e.flashTime = 0.05;
        // We'll use a special flag or check the flashTime + a new identity to invert colors in renderer
    },

    spawnWave(particles: Particle[], x: number, y: number) {
        particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.6, maxLife: 0.6,
            size: 0,
            color: 'rgba(172, 77, 255, 0.4)',
            type: 'shockwave',
            radius: 12,
        });
    }
};

export const EssenceMagnetSystem = {
    update(cores: EssenceCore[], player: PlayerState, particles: Particle[], dt: number, onCollect: (c: EssenceCore) => void): EssenceCore[] {
        for (const core of cores) {
            core.spawnTime += dt;

            // Initial friction / ground physics
            const friction = Math.pow(0.05, dt);
            core.vx *= friction;
            core.vy *= friction;
            core.x += core.vx * dt;
            core.y += core.vy * dt;

            if (core.spawnTime > 0.45) { // Magnetism delay
                const dx = player.x - core.x;
                const dy = player.y - core.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 12) {
                    core.collected = true;
                    onCollect(core);
                    SFX.xpPickup();
                    // Absorbtion spark
                    spawnSpark(particles, player.x, player.y, '#ac4dff', 8);
                } else if (dist < 180) { // Magnetism range
                    const speed = Math.min(600, 100 + Math.pow(core.spawnTime * 10, 2));
                    core.x += (dx / dist) * speed * dt;
                    core.y += (dy / dist) * speed * dt;

                    // Essence trail
                    if (Math.random() < 0.3) {
                        particles.push({
                            x: core.x, y: core.y,
                            vx: core.vx * 0.1, vy: core.vy * 0.1,
                            life: 0.3, maxLife: 0.3,
                            size: 2, color: 'rgba(172, 77, 255, 0.5)',
                            type: 'essence_trail'
                        });
                    }
                }
            }
        }
        return cores.filter(c => !c.collected);
    }
};
