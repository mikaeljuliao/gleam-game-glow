import { Particle, Vec2, EnemyState, EssenceCore, PlayerState } from './types';
import { SFX } from './audio';
import { spawnSpark } from './particles';

export const DIMENSIONAL_COLORS = {
    primary: '#2a0052',      // Dark purple
    glow: '#6a0dad',         // Bright purple
    glowLight: '#ac4dff',    // Light violet
    white: '#e8d5ff',        // Near-white lavender
    boss: '#4b0082',         // Indigo
    bossGlow: '#cc44ff',     // Boss bright violet
    streak: '#ff88ff',       // Multi-kill pink/violet
};

// ─── DEATH PARTICLES ──────────────────────────────────────────────────────────
export const DeathParticles = {
    spawn(particles: Particle[], x: number, y: number, angle: number, count: number, isBoss: boolean, weapon?: string) {
        const weaponMult = weapon === 'daggers' ? 1.3 : weapon === 'staff' ? 0.8 : 1.0;
        const arcSpread = weapon === 'daggers' ? 0.9 : weapon === 'staff' ? Math.PI * 2 : 1.5;

        // Layer 1 — Main shards (fast, directional)
        for (let i = 0; i < count; i++) {
            const pAngle = angle + (Math.random() - 0.5) * arcSpread;
            const speed = (55 + Math.random() * 100) * (isBoss ? 1.6 : 1) * weaponMult;
            const life = 0.3 + Math.random() * 0.45;

            const colorRoll = i % 4;
            const color = colorRoll === 0 ? DIMENSIONAL_COLORS.glowLight
                : colorRoll === 1 ? DIMENSIONAL_COLORS.glow
                    : colorRoll === 2 ? DIMENSIONAL_COLORS.white
                        : DIMENSIONAL_COLORS.primary;

            particles.push({
                x, y,
                vx: Math.cos(pAngle) * speed + (Math.random() - 0.5) * 18,
                vy: Math.sin(pAngle) * speed - (15 + Math.random() * 25),
                life,
                maxLife: life,
                size: (isBoss ? 3.5 : 2) + Math.random() * 2.5,
                color,
                type: 'dimensional_shard',
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 15,
            });
        }

        // Layer 2 — Micro sparks (tight burst, high brightness)
        const microCount = isBoss ? 12 : 6;
        for (let i = 0; i < microCount; i++) {
            const mAngle = Math.random() * Math.PI * 2;
            const mSpeed = 20 + Math.random() * 60;
            const mLife = 0.12 + Math.random() * 0.12;
            particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: Math.cos(mAngle) * mSpeed,
                vy: Math.sin(mAngle) * mSpeed - 10,
                life: mLife,
                maxLife: mLife,
                size: 0.8 + Math.random() * 1.2,
                color: Math.random() < 0.5 ? DIMENSIONAL_COLORS.white : DIMENSIONAL_COLORS.glowLight,
                type: 'spark',
            });
        }

        // Layer 3 — Slow-rising essence wisps (linger elegantly)
        const wispCount = isBoss ? 6 : 3;
        for (let i = 0; i < wispCount; i++) {
            const wAngle = (i / wispCount) * Math.PI * 2 + Math.random() * 0.4;
            const wSpeed = 8 + Math.random() * 20;
            const wLife = 0.6 + Math.random() * 0.5;
            particles.push({
                x: x + Math.cos(wAngle) * 4,
                y: y + Math.sin(wAngle) * 4,
                vx: Math.cos(wAngle) * wSpeed,
                vy: Math.sin(wAngle) * wSpeed - 18,
                life: wLife,
                maxLife: wLife,
                size: isBoss ? 3 : 1.8,
                color: `rgba(172, 77, 255, ${0.5 + Math.random() * 0.4})`,
                type: 'dimensional_shard',
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 5,
            });
        }
    },

    // Kill streak burst — extra particles for rapid kills
    spawnStreakBurst(particles: Particle[], x: number, y: number) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const speed = 50 + Math.random() * 40;
            const life = 0.25 + Math.random() * 0.2;
            particles.push({
                x, y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - 10,
                life, maxLife: life,
                size: 1.5 + Math.random(),
                color: Math.random() < 0.6 ? DIMENSIONAL_COLORS.streak : DIMENSIONAL_COLORS.white,
                type: 'spark',
            });
        }
    }
};

// ─── ESSENCE CORE DROP ────────────────────────────────────────────────────────
export const EssenceCoreDrop = {
    create(x: number, y: number, isBoss: boolean, xp: number, souls: number): EssenceCore {
        return {
            id: Math.random().toString(36).substr(2, 9),
            x, y,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60,
            collected: false,
            spawnTime: 0,
            type: isBoss ? 'boss' : 'basic',
            xp,
            souls
        };
    }
};

// ─── DIMENSIONAL DEATH EFFECT ─────────────────────────────────────────────────
export const DimensionalDeathEffect = {
    // Shockwave ring — tight dimensional pulse
    spawnWave(particles: Particle[], x: number, y: number, isBoss = false) {
        // Primary wave
        particles.push({
            x, y, vx: 0, vy: 0,
            life: isBoss ? 0.7 : 0.45, maxLife: isBoss ? 0.7 : 0.45,
            size: 0,
            color: isBoss ? 'rgba(204, 68, 255, 0.5)' : 'rgba(172, 77, 255, 0.45)',
            type: 'shockwave',
            radius: isBoss ? 16 : 10,
        });

        // Inner tight flash ring (faster, smaller)
        particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.2, maxLife: 0.2,
            size: 0,
            color: 'rgba(232, 213, 255, 0.6)',
            type: 'shockwave',
            radius: 5,
        });
    },

    // ─── BOSS DRAMATIC DEATH ───────────────────────────────────────────────────
    spawnBossDeathSequence(particles: Particle[], x: number, y: number) {
        // 1. Triple massive shockwaves
        for (let i = 0; i < 3; i++) {
            particles.push({
                x, y, vx: 0, vy: 0,
                life: 0.8 + i * 0.2, maxLife: 1.0 + i * 0.2,
                size: 0,
                color: i === 0 ? DIMENSIONAL_COLORS.white : DIMENSIONAL_COLORS.bossGlow,
                type: 'shockwave',
                radius: 12 + i * 15,
            });
        }

        // 2. Fragment storm (all directions)
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 200;
            const life = 0.6 + Math.random() * 0.8;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life, maxLife: life,
                size: 3 + Math.random() * 4,
                color: Math.random() < 0.5 ? DIMENSIONAL_COLORS.white : DIMENSIONAL_COLORS.bossGlow,
                type: 'dimensional_shard',
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 20,
            });
        }

        // 3. Central void implosion flash
        particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4,
            size: 80, color: 'rgba(255, 255, 255, 0.9)',
            type: 'explosion'
        });
    }
};

// ─── ESSENCE MAGNET SYSTEM ────────────────────────────────────────────────────
export const EssenceMagnetSystem = {
    update(cores: EssenceCore[], player: PlayerState, particles: Particle[], dt: number, onCollect: (c: EssenceCore) => void): EssenceCore[] {
        for (const core of cores) {
            core.spawnTime += dt;

            // Initial scatter / ground physics
            const friction = Math.pow(0.04, dt);
            core.vx *= friction;
            core.vy *= friction;
            core.x += core.vx * dt;
            core.y += core.vy * dt;

            if (core.spawnTime > 0.4) { // Magnetism delay
                const dx = player.x - core.x;
                const dy = player.y - core.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 12) {
                    core.collected = true;
                    onCollect(core);
                    SFX.xpPickup();
                    // Absorption spark — satisfying collect feel
                    spawnSpark(particles, player.x, player.y, DIMENSIONAL_COLORS.glowLight, 10);
                    spawnSpark(particles, player.x, player.y, DIMENSIONAL_COLORS.white, 5);
                } else if (dist < 200) { // Magnetism range
                    const speed = Math.min(650, 120 + Math.pow(core.spawnTime * 10, 2));
                    core.x += (dx / dist) * speed * dt;
                    core.y += (dy / dist) * speed * dt;

                    // Essence trail — tighter, more dynamic
                    if (Math.random() < 0.4) {
                        particles.push({
                            x: core.x, y: core.y,
                            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                            life: 0.2, maxLife: 0.2,
                            size: 1.5 + Math.random(),
                            color: `rgba(172, 77, 255, ${0.4 + Math.random() * 0.4})`,
                            type: 'essence_trail'
                        });
                    }
                }
            }
        }
        return cores.filter(c => !c.collected);
    }
};
