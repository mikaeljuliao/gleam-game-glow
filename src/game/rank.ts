// Persistent rank system — "Alma do Abismo"
// Tracks lifetime stats across runs and awards gothic ranks

import { GameStats } from './types';

const RANK_KEY = 'dungeon_of_shadows_rank';

export interface RankTier {
  id: string;
  name: string;
  icon: string;
  color: string;
  glowColor: string;
  soulsRequired: number;
  title: string; // short flavor text
}

export const RANK_TIERS: RankTier[] = [
  { id: 'lost_soul',       name: 'Alma Perdida',        icon: '💀', color: '#888888', glowColor: 'rgba(136,136,136,0.3)', soulsRequired: 0,    title: 'Ainda há esperança?' },
  { id: 'wanderer',        name: 'Errante das Sombras',  icon: '👁️', color: '#7799bb', glowColor: 'rgba(119,153,187,0.3)', soulsRequired: 50,   title: 'As sombras te conhecem' },
  { id: 'dark_hunter',     name: 'Caçador Sombrio',      icon: '🗡️', color: '#44cc88', glowColor: 'rgba(68,204,136,0.3)',  soulsRequired: 150,  title: 'A escuridão te guia' },
  { id: 'reaper',          name: 'Ceifador',             icon: '⚔️', color: '#cc4444', glowColor: 'rgba(204,68,68,0.3)',   soulsRequired: 400,  title: 'As almas tremem' },
  { id: 'dark_lord',       name: 'Senhor das Trevas',    icon: '🔥', color: '#ff6600', glowColor: 'rgba(255,102,0,0.3)',   soulsRequired: 800,  title: 'O abismo te reverencia' },
  { id: 'herald',          name: 'Arauto do Abismo',     icon: '👑', color: '#bb44ff', glowColor: 'rgba(187,68,255,0.3)',  soulsRequired: 1500, title: 'Os portais se curvam' },
  { id: 'sovereign',       name: 'Soberano Imortal',     icon: '🌟', color: '#ffcc00', glowColor: 'rgba(255,204,0,0.3)',   soulsRequired: 3000, title: 'A morte te teme' },
  { id: 'god_of_darkness', name: 'Deus da Escuridão',    icon: '🌑', color: '#ff2222', glowColor: 'rgba(255,34,34,0.5)',   soulsRequired: 6000, title: 'Você é a escuridão' },
];

export interface LifetimeStats {
  totalSouls: number;      // total enemies killed across all runs
  totalRuns: number;
  bestFloor: number;
  bestLevel: number;
  totalTimePlayed: number;
  totalDamageDealt: number;
  bossesDefeated: number;
  totalRoomsExplored: number;
}

export interface RankData {
  stats: LifetimeStats;
  currentRankId: string;
}

function defaultStats(): LifetimeStats {
  return {
    totalSouls: 0,
    totalRuns: 0,
    bestFloor: 0,
    bestLevel: 0,
    totalTimePlayed: 0,
    totalDamageDealt: 0,
    bossesDefeated: 0,
    totalRoomsExplored: 0,
  };
}

export function loadRankData(): RankData {
  try {
    const raw = localStorage.getItem(RANK_KEY);
    if (!raw) return { stats: defaultStats(), currentRankId: RANK_TIERS[0].id };
    return JSON.parse(raw) as RankData;
  } catch {
    return { stats: defaultStats(), currentRankId: RANK_TIERS[0].id };
  }
}

export function saveRankData(data: RankData): void {
  try {
    localStorage.setItem(RANK_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save rank data:', e);
  }
}

/** Call after each run ends (game over) to accumulate stats */
export function recordRun(gameStats: GameStats): RankData {
  const data = loadRankData();
  const s = data.stats;

  s.totalSouls += gameStats.enemiesDefeated;
  s.totalRuns += 1;
  s.bestFloor = Math.max(s.bestFloor, gameStats.floor);
  s.bestLevel = Math.max(s.bestLevel, gameStats.level);
  s.totalTimePlayed += gameStats.timePlayed;
  s.totalDamageDealt += gameStats.damageDealt;
  s.totalRoomsExplored += gameStats.roomsExplored;

  // Recalculate rank
  data.currentRankId = getRankForSouls(s.totalSouls).id;

  saveRankData(data);
  return data;
}

export function getRankForSouls(souls: number): RankTier {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (souls >= tier.soulsRequired) rank = tier;
    else break;
  }
  return rank;
}

export function getNextRank(currentRankId: string): RankTier | null {
  const idx = RANK_TIERS.findIndex(r => r.id === currentRankId);
  if (idx < 0 || idx >= RANK_TIERS.length - 1) return null;
  return RANK_TIERS[idx + 1];
}

export function getRankProgress(souls: number): { current: RankTier; next: RankTier | null; progress: number } {
  const current = getRankForSouls(souls);
  const next = getNextRank(current.id);
  if (!next) return { current, next: null, progress: 1 };
  const range = next.soulsRequired - current.soulsRequired;
  const earned = souls - current.soulsRequired;
  return { current, next, progress: Math.min(1, earned / range) };
}
