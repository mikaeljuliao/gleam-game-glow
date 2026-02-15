import { Particle } from './types';
import { COLORS } from './constants';

export function createParticles(): Particle[] {
  return [];
}

export function spawnBlood(particles: Particle[], x: number, y: number, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 50;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.7,
      size: 1 + Math.random() * 2,
      color: `hsl(${Math.random() * 15}, 80%, ${30 + Math.random() * 20}%)`,
      type: 'blood',
    });
  }
}

export function spawnDamageText(particles: Particle[], x: number, y: number, text: string, color = COLORS.damageText) {
  particles.push({
    x, y: y - 5,
    vx: -5 + Math.random() * 10,
    vy: -35,
    life: 0.9,
    maxLife: 0.9,
    size: 9,
    color,
    type: 'text',
    text,
  });
}

export function spawnXPParticle(particles: Particle[], x: number, y: number, count = 3) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: -10 + Math.random() * 20,
      vy: -20 - Math.random() * 15,
      life: 0.6,
      maxLife: 0.6,
      size: 2,
      color: COLORS.xpText,
      type: 'xp',
    });
  }
}

// Soul collection animation — elegant blue energy particles that fly toward the player
export function spawnSoulCollectParticle(particles: Particle[], fromX: number, fromY: number, toX: number, toY: number, amount: number) {
  const count = Math.min(Math.max(2, amount), 6);
  for (let i = 0; i < count; i++) {
    // Compute velocity toward player with some spread
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 120 + Math.random() * 60;
    // Add lateral spread for elegance
    const spread = (Math.random() - 0.5) * 80;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    
    const hue = 210 + Math.random() * 30; // blue range
    const lightness = 55 + Math.random() * 25;
    
    particles.push({
      x: fromX + (Math.random() - 0.5) * 8,
      y: fromY + (Math.random() - 0.5) * 8,
      vx: (dx / dist) * speed + perpX * spread,
      vy: (dy / dist) * speed + perpY * spread - 15,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 2 + Math.random() * 1.5,
      color: `hsl(${hue}, 80%, ${lightness}%)`,
      type: 'soul',
    });
  }
  // Central bright spark
  particles.push({
    x: fromX,
    y: fromY,
    vx: 0,
    vy: -20,
    life: 0.3,
    maxLife: 0.3,
    size: 4,
    color: 'hsl(220, 90%, 75%)',
    type: 'soul',
  });
}

export function spawnExplosion(particles: Particle[], x: number, y: number, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 80;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.7,
      size: 2 + Math.random() * 4,
      color: `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)`,
      type: 'explosion',
    });
  }
  // Shockwave ring
  particles.push({
    x, y, vx: 0, vy: 0,
    life: 0.3, maxLife: 0.3,
    size: 0, color: 'rgba(255, 200, 100, 0.4)',
    type: 'shockwave', radius: 5,
  });
}

export function spawnDust(particles: Particle[], x: number, y: number) {
  particles.push({
    x: x + Math.random() * 10 - 5,
    y: y + Math.random() * 10 - 5,
    vx: Math.random() * 4 - 2,
    vy: -Math.random() * 5,
    life: 1.5 + Math.random(),
    maxLife: 2.5,
    size: 1 + Math.random(),
    color: 'rgba(100, 100, 120, 0.25)',
    type: 'dust',
  });
}

export function spawnSpark(particles: Particle[], x: number, y: number, color: string, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 50;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.15 + Math.random() * 0.2,
      maxLife: 0.35,
      size: 1 + Math.random(),
      color,
      type: 'spark',
    });
  }
}

export function spawnTrail(particles: Particle[], x: number, y: number, color: string) {
  particles.push({
    x, y, vx: 0, vy: 0,
    life: 0.15, maxLife: 0.15,
    size: 3 + Math.random() * 2,
    color,
    type: 'trail',
  });
}

export function spawnEmbers(particles: Particle[], x: number, y: number, count = 4) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 10,
      vy: -10 - Math.random() * 20,
      life: 0.8 + Math.random() * 1,
      maxLife: 1.8,
      size: 1,
      color: `hsl(${20 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
      type: 'ember',
    });
  }
}

export function spawnGhostParticle(particles: Particle[], x: number, y: number) {
  particles.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 5,
    vy: -8 - Math.random() * 5,
    life: 0.5 + Math.random() * 0.3,
    maxLife: 0.8,
    size: 2 + Math.random() * 2,
    color: COLORS.wraithGlow,
    type: 'ghost',
  });
}

export function spawnBomberExplosion(particles: Particle[], x: number, y: number) {
  spawnExplosion(particles, x, y, 25);
  // Extra fire ring
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 50 + Math.random() * 30;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5, maxLife: 0.5,
      size: 3,
      color: COLORS.bomberGlow,
      type: 'explosion',
    });
  }
  // Big shockwave
  particles.push({
    x, y, vx: 0, vy: 0,
    life: 0.4, maxLife: 0.4,
    size: 0, color: 'rgba(255, 150, 50, 0.5)',
    type: 'shockwave', radius: 8,
  });
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.type === 'text') {
      p.vy *= 0.95;
    }
    if (p.type === 'dust' || p.type === 'ember') {
      p.vy -= 3 * dt;
    }
    if (p.type === 'soul') {
      // Soul particles decelerate and fade gracefully
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy -= 8 * dt; // slight float upward
    }
    if (p.type === 'shockwave' && p.radius !== undefined) {
      p.radius += 150 * dt;
    }
  }
  return particles.filter(p => p.life > 0);
}
