import { Vec2, Particle, Portal, PlayerState } from './types';
import * as C from './constants';

export interface PortalOrbitalParticle {
    angle: number;
    radius: number;
    angularSpeed: number;
    radialSpeed: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
    opacity: number;
    dot?: boolean; // For EnergyDots on the edge
}

export class BossPortalSystem {
    private particles: PortalOrbitalParticle[] = [];
    private groundParticles: any[] = [];
    private spawnTimer = 0;
    private portalPos: Vec2 | null = null;
    private portalExists = false;
    private interactionAlpha = 0; // For floating text fade
    private transitionTimer = 0;
    private isTransitioning = false;
    private convergeTriggered = false;

    constructor() { }

    spawn(x: number, y: number) {
        this.portalPos = { x, y };
        this.portalExists = true;
        this.particles = [];
        this.groundParticles = [];
        this.spawnTimer = 0;
        this.interactionAlpha = 0;
        this.transitionTimer = 0;
        this.isTransitioning = false;
        this.convergeTriggered = false;
        console.log("Portal spawned at:", x, y);
    }

    reset() {
        this.portalExists = false;
        this.portalPos = null;
        this.particles = [];
        this.groundParticles = [];
        this.isTransitioning = false;
        this.convergeTriggered = false;
    }

    isActive() {
        return this.portalExists;
    }

    getPos() {
        return this.portalPos;
    }

    update(dt: number, player: PlayerState, onEnter: () => void) {
        if (!this.portalExists || !this.portalPos) return;

        const dx = player.x - this.portalPos.x;
        const dy = player.y - this.portalPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Proximity Logic
        const interactRange = 120;
        const targetAlpha = dist < interactRange ? 1 : 0;
        this.interactionAlpha += (targetAlpha - this.interactionAlpha) * dt * 4;

        // 2. Spawn Rate logic
        // longe = 8 p/s, perto = 35 p/s. 
        // We can use smoothstep based on distance.
        const t = 1 - Math.min(1, dist / 300);
        const smoothT = t * t * (3 - 2 * t); // smoothstep manual
        const spawnRate = 8 + (35 - 8) * smoothT;

        this.spawnTimer += dt;
        if (!this.isTransitioning && this.spawnTimer >= 1 / spawnRate) {
            this.spawnTimer = 0;
            this.spawnOrbitalParticle();
        }

        // 3. Update Particles
        this.particles = this.particles.filter(p => {
            if (this.convergeTriggered) {
                p.radialSpeed += 800 * dt;
                p.angularSpeed *= 1.1;
            }

            p.angle += p.angularSpeed * dt;

            // Acceleration increases near center
            const accel = 1 + (150 / (p.radius + 10));
            p.radius -= p.radialSpeed * accel * dt;

            p.life -= dt;
            p.opacity = Math.min(1, p.life * 2);

            return p.radius > 3 && p.life > 0;
        });

        // 4. Ground Particles (Player proximity)
        if (dist < 100 && !this.isTransitioning) {
            if (Math.random() < 0.3) {
                this.spawnGroundParticle(player);
            }
        }

        this.updateGroundParticles(dt);

        // 5. Transition Sequence
        if (this.isTransitioning) {
            this.transitionTimer += dt;
            if (this.transitionTimer > 0.1 && !this.convergeTriggered) {
                this.convergeTriggered = true;
            }
            if (this.transitionTimer > 1.2) {
                onEnter();
            }
        }
    }

    private spawnOrbitalParticle() {
        if (!this.portalPos) return;
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        this.particles.push({
            angle,
            radius,
            angularSpeed: 2 + Math.random() * 3,
            radialSpeed: 20 + Math.random() * 20,
            size: 1 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#ac4dff' : '#6a00ff',
            life: 3,
            maxLife: 3,
            opacity: 0
        });
    }

    private spawnGroundParticle(player: PlayerState) {
        if (!this.portalPos) return;
        const angle = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * 15;
        this.groundParticles.push({
            x: player.x + Math.cos(angle) * r,
            y: player.y + Math.sin(angle) * r + 10,
            targetX: this.portalPos.x,
            targetY: this.portalPos.y,
            life: 1.0,
            progress: 0,
            size: 1 + Math.random() * 2,
            color: '#8b4dff'
        });
    }

    private updateGroundParticles(dt: number) {
        this.groundParticles = this.groundParticles.filter(p => {
            p.progress += dt * 1.5;
            p.life -= dt;

            // Curved path toward portal
            const t = p.progress;
            // Lerp with some curve
            const midX = (p.x + p.targetX) / 2 + Math.sin(t * 10) * 20;
            const midY = (p.y + p.targetY) / 2 + Math.cos(t * 10) * 20;

            // For now simple lerp for simplicity but satisfying
            p.curX = p.x * (1 - t) + p.targetX * t + Math.sin(t * Math.PI) * 15;
            p.curY = p.y * (1 - t) + p.targetY * t + Math.cos(t * Math.PI) * 10;

            return p.life > 0 && p.progress < 1;
        });
    }

    startTransition() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.transitionTimer = 0;
        this.convergeTriggered = false;

        // Burst of particles on start
        for (let i = 0; i < 40; i++) {
            this.spawnOrbitalParticle();
        }
    }

    render(ctx: CanvasRenderingContext2D, time: number, player: PlayerState) {
        if (!this.portalExists || !this.portalPos) return;

        const { x, y } = this.portalPos;
        const dx = player.x - x;
        const dy = player.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ctx.save();
        ctx.translate(x, y);

        // --- LAYER 3: CORE ---
        this.renderCore(ctx, time);

        // --- LAYER 2: INTERMEDIATE (Distortion) ---
        this.renderIntermediate(ctx, time, dist);

        // --- LAYER 1: OUTER (Organic Borders) ---
        this.renderOuter(ctx, time);

        // --- PARTICLES ---
        this.renderParticles(ctx);

        ctx.restore();

        // --- GROUND PARTICLES ---
        this.renderGroundParticles(ctx);

        // --- FLOATING TEXT ---
        if (this.interactionAlpha > 0.01) {
            this.renderFloatingText(ctx, time);
        }

        // --- TRANSITION OVERLAY ---
        if (this.isTransitioning) {
            this.renderTransitionOverlay(ctx);
        }
    }

    private renderCore(ctx: CanvasRenderingContext2D, time: number) {
        // Deep void core with slow internal particles
        const pulse = Math.sin(time * 2) * 0.05 + 0.95;

        // Background gradient sense of depth
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40 * pulse);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.7, '#050008');
        grad.addColorStop(1, '#1a0033');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25 * pulse, 55 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // slow internal orbiters (fake for core depth)
        for (let i = 0; i < 5; i++) {
            const angle = time * 0.5 + (i * Math.PI * 2 / 5);
            const r = 10 + Math.sin(time + i) * 5;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r * 2;
            ctx.fillStyle = 'rgba(150, 100, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private renderIntermediate(ctx: CanvasRenderingContext2D, time: number, dist: number) {
        // Distortion rings
        const proximityIntensity = Math.max(0, 1 - dist / 150);
        const ringCount = 2;

        ctx.setLineDash([10, 5]);
        for (let i = 0; i < ringCount; i++) {
            const lTime = (time * 0.5 + i * 0.5) % 1;
            const alpha = (1 - lTime) * 0.3 * proximityIntensity;
            const rMult = 1 + lTime * 0.5;

            ctx.strokeStyle = `rgba(180, 150, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, 35 * rMult, 75 * rMult, Math.sin(time * 0.5 + i) * 0.1, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    private renderOuter(ctx: CanvasRenderingContext2D, time: number) {
        // 3 organic borders with procedural deformation
        const layers = 3;
        for (let l = 0; l < layers; l++) {
            const t = time * (0.8 + l * 0.2);
            const alpha = 0.4 - l * 0.1;
            const w = 28 + l * 4;
            const h = 65 + l * 8;

            ctx.strokeStyle = `rgba(160, 80, 255, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            const segments = 24;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const noise = Math.sin(angle * 4 + t * 3) * 3 + Math.cos(angle * 7 - t * 2) * 2;
                const rW = w + noise;
                const rH = h + noise * 2;

                const px = Math.cos(angle) * rW;
                const py = Math.sin(angle) * rH;

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);

                // Energy dots on the edge
                if (i % 6 === 0 && Math.random() < 0.1) {
                    this.renderEnergyDot(ctx, px, py, time + i);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    private renderEnergyDot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
        const size = Math.sin(t * 10) * 1.5 + 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(200, 150, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderParticles(ctx: CanvasRenderingContext2D) {
        for (const p of this.particles) {
            const px = Math.cos(p.angle) * p.radius;
            const py = Math.sin(p.angle) * p.radius * 1.5; // Elliptical orbit

            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);

            // tiny trail
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity * 0.5;
            const tx = Math.cos(p.angle - 0.1) * p.radius;
            const ty = Math.sin(p.angle - 0.1) * p.radius * 1.5;
            ctx.fillRect(tx - p.size / 3, ty - p.size / 3, p.size * 0.7, p.size * 0.7);
        }
        ctx.globalAlpha = 1.0;
    }

    private renderGroundParticles(ctx: CanvasRenderingContext2D) {
        for (const p of this.groundParticles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.curX, p.curY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    private renderFloatingText(ctx: CanvasRenderingContext2D, time: number) {
        if (!this.portalPos) return;
        const { x, y } = this.portalPos;
        const floatY = Math.sin(time * 3) * 3;
        const alpha = this.interactionAlpha;

        ctx.save();
        ctx.textAlign = 'center';

        // Discrete background bar
        const text = "[E] AVANÇAR PARA O PRÓXIMO ANDAR";
        ctx.font = "600 10px " + C.HUD_FONT;
        const metrics = ctx.measureText(text);
        const bgW = metrics.width + 20;

        ctx.fillStyle = `rgba(20, 0, 40, ${alpha * 0.7})`;
        this.roundRect(ctx, x - bgW / 2, y - 95 + floatY, bgW, 18, 4);
        ctx.fill();

        ctx.strokeStyle = `rgba(150, 100, 255, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = `rgba(220, 200, 255, ${alpha})`;
        ctx.fillText(text, x, y - 82 + floatY);

        ctx.restore();
    }

    private renderTransitionOverlay(ctx: CanvasRenderingContext2D) {
        const t = this.transitionTimer;
        // Fade to black
        const alpha = Math.min(1, t / 1.0);

        const center = this.portalPos!;
        const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 1000 * (1 - alpha * 0.8));
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, C.dims.gw, C.dims.gh);

        if (t > 0.8) {
            ctx.fillStyle = `rgba(0, 0, 0, ${(t - 0.8) * 5})`;
            ctx.fillRect(0, 0, C.dims.gw, C.dims.gh);
        }
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

export const portalSystem = new BossPortalSystem();
