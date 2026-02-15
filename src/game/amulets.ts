// Amulet system — rare powerful items that define builds
import { PlayerState } from './types';

export interface AmuletDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  // Passive effect applied each tick (dt in seconds)
  onTick?: (player: PlayerState, dt: number, ctx: AmuletContext) => void;
  // Applied when equipped
  onEquip?: (player: PlayerState) => void;
  // Applied when unequipped
  onUnequip?: (player: PlayerState) => void;
}

export interface AmuletContext {
  killStreak: number; // recent kills within window
  lastKillTime: number; // game time of last kill
  gameTime: number;
}

export interface AmuletInstance {
  defId: string;
  equipped: boolean;
}

export interface AmuletInventory {
  owned: AmuletInstance[];
  maxEquipped: number;
}

// ============ AMULET DEFINITIONS ============

export const AMULET_DEFS: AmuletDef[] = [
  {
    id: 'cartographer',
    name: 'Amuleto do Cartógrafo',
    icon: '🗺️',
    description: 'Permite abrir um mapa completo do andar com todas as salas visíveis.',
  },
  {
    id: 'wisdom',
    name: 'Amuleto da Sabedoria',
    icon: '✨',
    description: '+100% XP ganho de todas as fontes.',
    onEquip: (p) => { p.xpMultiplier *= 2; },
    onUnequip: (p) => { p.xpMultiplier /= 2; },
  },
  {
    id: 'cruel_repetition',
    name: 'Repetição Cruel',
    icon: '🔁',
    description: '30% de chance do último ataque se repetir automaticamente.',
  },
  {
    id: 'war_rhythm',
    name: 'Ritmo de Guerra',
    icon: '⚡',
    description: 'Matar inimigos aumenta velocidade de ataque. Pare de matar e perde o bônus.',
  },
  {
    id: 'soul_collector',
    name: 'Coletor de Almas',
    icon: '🩸',
    description: 'Quanto mais almas carrega, mais dano e velocidade. Gastar almas reduz os bônus.',
  },
];

export function getAmuletDef(id: string): AmuletDef | undefined {
  return AMULET_DEFS.find(a => a.id === id);
}

export function createAmuletInventory(): AmuletInventory {
  return { owned: [], maxEquipped: 4 };
}

export function addAmulet(inv: AmuletInventory, defId: string): boolean {
  // Don't add duplicates
  if (inv.owned.some(a => a.defId === defId)) return false;
  inv.owned.push({ defId, equipped: false });
  return true;
}

export function getEquippedCount(inv: AmuletInventory): number {
  return inv.owned.filter(a => a.equipped).length;
}

export function toggleEquip(inv: AmuletInventory, defId: string, player: PlayerState): boolean {
  const amulet = inv.owned.find(a => a.defId === defId);
  if (!amulet) return false;

  if (amulet.equipped) {
    // Unequip
    amulet.equipped = false;
    const def = getAmuletDef(defId);
    if (def?.onUnequip) def.onUnequip(player);
    return true;
  } else {
    // Equip — check limit
    if (getEquippedCount(inv) >= inv.maxEquipped) return false;
    amulet.equipped = true;
    const def = getAmuletDef(defId);
    if (def?.onEquip) def.onEquip(player);
    return true;
  }
}

export function isAmuletEquipped(inv: AmuletInventory, defId: string): boolean {
  return inv.owned.some(a => a.defId === defId && a.equipped);
}

export function getRandomBossAmuletDrop(inv: AmuletInventory): string | null {
  const unowned = AMULET_DEFS.filter(d => !inv.owned.some(a => a.defId === d.id));
  if (unowned.length === 0) return null;
  return unowned[Math.floor(Math.random() * unowned.length)].id;
}

// War Rhythm state (managed externally by engine)
export interface WarRhythmState {
  stacks: number;
  maxStacks: number;
  decayTimer: number;
  decayDelay: number; // seconds before losing stacks
  bonusPerStack: number;
}

export function createWarRhythmState(): WarRhythmState {
  return { stacks: 0, maxStacks: 10, decayTimer: 0, decayDelay: 3, bonusPerStack: 0.08 };
}

// Soul Collector: damage bonus based on souls carried
export function getSoulCollectorBonus(souls: number): number {
  // +1% damage per 10 souls, up to +100%
  return Math.min(1, souls / 1000);
}

// Soul Collector: speed bonus based on souls carried
export function getSoulCollectorSpeedBonus(souls: number): number {
  // +0.5% speed per 10 souls, up to +50%
  return Math.min(0.5, souls / 2000) ;
}
