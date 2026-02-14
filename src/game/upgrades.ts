import { Upgrade, Synergy, PlayerState, UpgradeRarity } from './types';

const UPGRADE_POOL: Omit<Upgrade, 'apply'>[] = [
  { id: 'dmg1', name: 'Lâmina Afiada', description: 'Dano corpo-a-corpo +30%', rarity: 'common', icon: '⚔️', synergyTags: ['melee', 'damage'] },
  { id: 'dmg2', name: 'Força Bruta', description: 'Todo dano +20%', rarity: 'rare', icon: '💪', synergyTags: ['damage'] },
  { id: 'spd1', name: 'Botas Sombrias', description: 'Velocidade +25%', rarity: 'common', icon: '👢', synergyTags: ['speed'] },
  { id: 'spd2', name: 'Passo Fantasma', description: 'Velocidade +40%', rarity: 'rare', icon: '💨', synergyTags: ['speed', 'dodge'] },
  { id: 'hp1', name: 'Vitalidade', description: 'Vida máxima +25', rarity: 'common', icon: '❤️', synergyTags: ['health'] },
  { id: 'hp2', name: 'Constituição', description: 'Vida máxima +50', rarity: 'rare', icon: '💖', synergyTags: ['health'] },
  { id: 'atk1', name: 'Frenesi', description: 'Velocidade de ataque +30%', rarity: 'common', icon: '⚡', synergyTags: ['attack_speed'] },
  { id: 'proj1', name: 'Projétil Duplo', description: '+1 projétil', rarity: 'rare', icon: '🔮', synergyTags: ['ranged', 'projectile'] },
  { id: 'proj2', name: 'Triplo Tiro', description: '+2 projéteis', rarity: 'epic', icon: '✨', synergyTags: ['ranged', 'projectile'] },
  { id: 'area1', name: 'Alcance Amplo', description: 'Área de efeito +30%', rarity: 'common', icon: '🌀', synergyTags: ['area'] },
  { id: 'fire1', name: 'Toque Flamejante', description: 'Projéteis ganham fogo (+5 dano)', rarity: 'rare', icon: '🔥', synergyTags: ['fire', 'ranged'] },
  { id: 'life1', name: 'Roubo de Vida', description: 'Recupera 2 HP por inimigo', rarity: 'rare', icon: '🩸', synergyTags: ['health', 'lifesteal'] },
  { id: 'pierce1', name: 'Perfurante', description: 'Projéteis atravessam inimigos', rarity: 'epic', icon: '🏹', synergyTags: ['ranged', 'pierce'] },
  { id: 'explode1', name: 'Explosão', description: 'Projéteis explodem no impacto', rarity: 'epic', icon: '💥', synergyTags: ['ranged', 'explosion'] },
  { id: 'regen1', name: 'Regeneração', description: 'Recupera 1 HP a cada 5s', rarity: 'common', icon: '🌿', synergyTags: ['health', 'regen'] },
];

function getApplyFunction(id: string): (p: PlayerState) => void {
  const fns: Record<string, (p: PlayerState) => void> = {
    dmg1: (p) => { p.baseDamage = Math.floor(p.baseDamage * 1.3); },
    dmg2: (p) => { p.damageMultiplier *= 1.2; },
    spd1: (p) => { p.moveSpeedMult *= 1.25; },
    spd2: (p) => { p.moveSpeedMult *= 1.4; },
    hp1: (p) => { p.maxHp += 25; p.hp += 25; },
    hp2: (p) => { p.maxHp += 50; p.hp += 50; },
    atk1: (p) => { p.attackSpeedMult *= 1.3; },
    proj1: (p) => { p.projectileCount += 1; },
    proj2: (p) => { p.projectileCount += 2; },
    area1: (p) => { p.areaMultiplier *= 1.3; },
    fire1: (p) => { p.projectileDamage += 5; },
    life1: (p) => { p.lifesteal += 2; },
    pierce1: (p) => { p.piercing = true; },
    explode1: (p) => { p.explosive = true; },
    regen1: (p) => { /* handled in engine update */ },
  };
  return fns[id] || (() => {});
}

export function getRandomUpgrades(count: number, ownedIds: string[]): Upgrade[] {
  const available = UPGRADE_POOL.filter(u => !ownedIds.includes(u.id));
  if (available.length === 0) return [];

  // Weighted by rarity
  const weighted: typeof available = [];
  for (const u of available) {
    const copies = u.rarity === 'common' ? 4 : u.rarity === 'rare' ? 2 : 1;
    for (let i = 0; i < copies; i++) weighted.push(u);
  }

  const selected: Upgrade[] = [];
  const usedIds = new Set<string>();

  while (selected.length < count && weighted.length > 0) {
    const idx = Math.floor(Math.random() * weighted.length);
    const u = weighted[idx];
    if (!usedIds.has(u.id)) {
      usedIds.add(u.id);
      selected.push({ ...u, apply: getApplyFunction(u.id) });
    }
    weighted.splice(idx, 1);
  }
  return selected;
}

export const SYNERGIES: Synergy[] = [
  {
    id: 'fire_explosion',
    name: 'Inferno',
    description: 'Projéteis explodem em chamas',
    requiredTags: ['fire', 'explosion'],
    applied: false,
    apply: (p) => { p.projectileDamage += 10; p.explosive = true; },
  },
  {
    id: 'speed_dodge',
    name: 'Sombra Veloz',
    description: 'Dash mais rápido e sem cooldown reduzido',
    requiredTags: ['speed', 'dodge'],
    applied: false,
    apply: (p) => { p.moveSpeedMult *= 1.2; },
  },
  {
    id: 'health_lifesteal',
    name: 'Vampirismo',
    description: 'Roubo de vida dobrado',
    requiredTags: ['health', 'lifesteal'],
    applied: false,
    apply: (p) => { p.lifesteal *= 2; },
  },
  {
    id: 'ranged_pierce',
    name: 'Perfuração Total',
    description: 'Projéteis perfurantes com +50% dano',
    requiredTags: ['ranged', 'pierce'],
    applied: false,
    apply: (p) => { p.projectileDamage = Math.floor(p.projectileDamage * 1.5); },
  },
  {
    id: 'melee_area',
    name: 'Vendaval',
    description: 'Ataque corpo-a-corpo com área massiva',
    requiredTags: ['melee', 'area'],
    applied: false,
    apply: (p) => { p.areaMultiplier *= 1.5; },
  },
];

export function checkSynergies(ownedTags: string[]): Synergy[] {
  const tagSet = new Set(ownedTags);
  return SYNERGIES.filter(s => !s.applied && s.requiredTags.every(t => tagSet.has(t)));
}

export function getOwnedTags(upgrades: Upgrade[], ownedIds: string[]): string[] {
  const allTags: string[] = [];
  for (const id of ownedIds) {
    const u = UPGRADE_POOL.find(up => up.id === id);
    if (u) allTags.push(...u.synergyTags);
  }
  return allTags;
}
