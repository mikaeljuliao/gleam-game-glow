import { GameStats } from '@/game/types';
import { recordRun, getRankProgress, getRankForSouls, loadRankData, type RankTier } from '@/game/rank';
import { useState, useEffect, useRef } from 'react';

interface Props {
  stats: GameStats;
  onRestart: () => void;
}

const GameOverScreen = ({ stats, onRestart }: Props) => {
  const mins = Math.floor(stats.timePlayed / 60);
  const secs = Math.floor(stats.timePlayed % 60);

  const [rankData, setRankData] = useState<ReturnType<typeof getRankProgress> | null>(null);
  const [rankedUp, setRankedUp] = useState(false);
  const [prevRank, setPrevRank] = useState<RankTier | null>(null);
  const [soulsGained, setSoulsGained] = useState(0);
  const [isSmall, setIsSmall] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const recorded = useRef(false);

  useEffect(() => {
    const check = () => {
      setIsSmall(Math.min(window.innerWidth, window.innerHeight) < 500);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;

    const before = loadRankData();
    const beforeRank = getRankForSouls(before.stats.totalSouls);
    const after = recordRun(stats);
    const afterProgress = getRankProgress(after.stats.totalSouls);

    setSoulsGained(stats.enemiesDefeated);
    setRankData(afterProgress);

    if (afterProgress.current.id !== beforeRank.id) {
      setRankedUp(true);
      setPrevRank(beforeRank);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rank = rankData?.current;
  const compact = isSmall || (isLandscape && window.innerHeight < 450);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto"
      style={{ background: 'rgba(5, 0, 0, 0.9)' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: compact && isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? '12px' : '8px',
          padding: compact ? '12px' : '20px',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Left/Top column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '6px' : '12px' }}>
          <h2
            className="font-bold tracking-wider"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#cc2222',
              textShadow: '0 0 30px rgba(200, 30, 30, 0.5), 0 0 60px rgba(150, 10, 10, 0.3)',
              fontSize: compact ? '24px' : '40px',
            }}
          >
            VOCÊ MORREU
          </h2>

          {/* Rank Up notification */}
          {rankedUp && rank && prevRank && (
            <div
              className="rounded-lg border text-center"
              style={{
                background: 'rgba(10, 5, 20, 0.8)',
                borderColor: rank.color,
                boxShadow: `0 0 30px ${rank.glowColor}, 0 0 60px ${rank.glowColor}`,
                animation: 'pulse 1.5s ease-in-out infinite',
                padding: compact ? '6px 12px' : '12px 24px',
              }}
            >
              <p style={{ color: '#888899', fontFamily: 'monospace', fontSize: compact ? '9px' : '11px', marginBottom: '4px' }}>
                RANK UP!
              </p>
              <div className="flex items-center justify-center gap-3">
                <span style={{ color: prevRank.color, fontFamily: "'Cinzel', serif", fontSize: compact ? '11px' : '13px' }}>
                  {prevRank.icon} {prevRank.name}
                </span>
                <span style={{ color: '#666677' }}>→</span>
                <span
                  style={{
                    color: rank.color,
                    fontFamily: "'Cinzel', serif",
                    fontSize: compact ? '12px' : '15px',
                    fontWeight: 'bold',
                    textShadow: `0 0 12px ${rank.glowColor}`,
                  }}
                >
                  {rank.icon} {rank.name}
                </span>
              </div>
              <p className="italic" style={{ color: rank.color, opacity: 0.7, fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>
                "{rank.title}"
              </p>
            </div>
          )}

          {/* Souls gained */}
          <div className="text-center">
            <span style={{ color: '#aa8888', fontFamily: 'monospace', fontSize: compact ? '11px' : '13px' }}>
              +{soulsGained} almas coletadas
            </span>
          </div>

          {/* Current rank badge */}
          {rank && !rankedUp && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: compact ? '12px' : '14px' }}>{rank.icon}</span>
              <span
                className="font-bold tracking-widest"
                style={{ color: rank.color, fontFamily: "'Cinzel', serif", textShadow: `0 0 8px ${rank.glowColor}`, fontSize: compact ? '10px' : '12px' }}
              >
                {rank.name.toUpperCase()}
              </span>
            </div>
          )}

          {/* Progress to next rank */}
          {rankData && rankData.next && rank && (
            <div style={{ width: compact ? '180px' : '220px' }}>
              <div className="flex justify-between" style={{ color: '#555566', fontFamily: 'monospace', fontSize: '9px', marginBottom: '2px' }}>
                <span>{rankData.next.icon} {rankData.next.name}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ background: 'rgba(30, 20, 20, 0.8)', height: '6px' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rankData.progress * 100}%`,
                    background: `linear-gradient(90deg, ${rank.color}, ${rankData.next.color})`,
                    boxShadow: `0 0 4px ${rank.glowColor}`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right/Bottom column - Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '8px' : '16px' }}>
          <div
            className="border rounded"
            style={{
              background: 'rgba(20, 10, 10, 0.6)',
              borderColor: '#442222',
              fontFamily: 'monospace',
              fontSize: compact ? '11px' : '13px',
              padding: compact ? '10px' : '16px',
              width: compact ? '220px' : '280px',
            }}
          >
            {[
              ['Andar', stats.floor],
              ['Nível', stats.level],
              ['Inimigos', stats.enemiesDefeated],
              ['Salas', stats.roomsExplored],
              ['Dano dado', Math.floor(stats.damageDealt)],
              ['Dano recebido', Math.floor(stats.damageTaken)],
              ['Upgrades', stats.upgradesCollected],
              ['Sinergias', stats.synergiesActivated],
              ['Tempo', `${mins}:${secs.toString().padStart(2, '0')}`],
            ].map(([label, value], i) => (
              <div key={i} className={`flex justify-between ${i < 8 ? 'mb-1' : ''}`} style={{ color: '#aa8888' }}>
                <span>{label}</span>
                <span style={{ color: '#ddcccc' }}>{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onRestart}
            className="font-bold tracking-widest border-2 transition-all duration-300"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#ddcccc',
              background: 'rgba(150, 30, 30, 0.3)',
              borderColor: '#883333',
              textShadow: '0 0 10px rgba(200, 50, 50, 0.5)',
              padding: compact ? '10px 24px' : '12px 32px',
              fontSize: compact ? '14px' : '16px',
              minHeight: '48px',
              touchAction: 'manipulation',
              cursor: 'pointer',
            }}
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
