import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { loadRankData, getRankProgress, RANK_TIERS } from '@/game/rank';

const TitleScreen = ({ onStart, onStartFloor, hasSave = false }: { onStart: (continueGame?: boolean) => void; onStartFloor?: (floor: number) => void; hasSave?: boolean }) => {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'stats' | 'help'>('play');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rankData = loadRankData();
  const { current: rank, next, progress } = getRankProgress(rankData.stats.totalSouls);
  const stats = rankData.stats;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId = 0;
    const particles: Array<{ x: number; y: number; vy: number; vx: number; size: number; alpha: number }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        vy: -0.15 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.2,
        size: 1 + Math.random() * 2,
        alpha: 0.05 + Math.random() * 0.25,
      });
    }

    const draw = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.fillStyle = '#06060d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grd = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.35, 30, canvas.width / 2, canvas.height * 0.35, canvas.width * 0.7);
      grd.addColorStop(0, 'rgba(40, 15, 50, 0.25)');
      grd.addColorStop(1, 'rgba(6, 6, 13, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        ctx.fillStyle = `rgba(100, 60, 140, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const tabStyle = (tab: string) => ({
    fontFamily: 'monospace',
    fontSize: '11px',
    letterSpacing: '0.15em',
    color: activeTab === tab ? '#ddccee' : '#555566',
    background: activeTab === tab ? 'rgba(80, 50, 120, 0.25)' : 'transparent',
    borderBottom: activeTab === tab ? `2px solid ${rank.color}` : '2px solid transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute inset-0 z-10 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-lg px-4 py-6 md:py-10 flex flex-col items-center min-h-full">
          
          {/* Title */}
          <div className="text-center mb-4 md:mb-6 flex-shrink-0">
            <h1
              className="text-4xl md:text-6xl font-bold tracking-wider leading-none"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#cc4444',
                textShadow: '0 0 20px rgba(200, 50, 50, 0.4), 0 0 40px rgba(150, 20, 20, 0.2), 2px 2px 0 #1a0a0a',
              }}
            >
              DUNGEON
            </h1>
            <h2
              className="text-lg md:text-2xl tracking-[0.3em] mt-1"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#8866aa',
                textShadow: '0 0 12px rgba(120, 80, 160, 0.3)',
              }}
            >
              OF SHADOWS
            </h2>
          </div>

          {/* Compact Rank Badge */}
          <div
            className="w-full rounded-lg border px-4 py-3 mb-4 flex-shrink-0"
            style={{
              background: 'rgba(10, 10, 20, 0.6)',
              borderColor: `${rank.color}44`,
              boxShadow: `0 0 15px ${rank.glowColor}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{rank.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold tracking-widest truncate"
                    style={{ fontFamily: "'Cinzel', serif", color: rank.color, textShadow: `0 0 8px ${rank.glowColor}` }}
                  >
                    {rank.name.toUpperCase()}
                  </span>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: '#555566', fontFamily: 'monospace' }}>
                    {stats.totalSouls} almas
                  </span>
                </div>
                <p className="text-xs italic mt-0.5" style={{ color: rank.color, opacity: 0.6, fontFamily: 'monospace', fontSize: '10px' }}>
                  "{rank.title}"
                </p>
                {next && (
                  <div className="mt-1.5">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30, 30, 50, 0.8)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress * 100}%`,
                          background: `linear-gradient(90deg, ${rank.color}, ${next.color})`,
                          boxShadow: `0 0 4px ${rank.glowColor}`,
                        }}
                      />
                    </div>
                    <p className="text-center mt-1" style={{ color: '#444455', fontFamily: 'monospace', fontSize: '9px' }}>
                      {next.icon} {next.name} — {next.soulsRequired - stats.totalSouls} almas restantes
                    </p>
                  </div>
                )}
                {!next && (
                  <p className="text-xs mt-1" style={{ color: rank.color, fontFamily: 'monospace', fontSize: '9px' }}>
                    ✦ Rank Máximo ✦
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2 mb-4 flex-shrink-0">
            <button
              onClick={() => onStart(false)}
              className="w-full py-3 text-base font-bold tracking-widest border rounded transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#ddcccc',
                background: 'linear-gradient(180deg, rgba(160, 35, 35, 0.35), rgba(120, 20, 20, 0.25))',
                borderColor: '#773333',
                textShadow: '0 0 10px rgba(200, 50, 50, 0.4)',
                boxShadow: '0 4px 20px rgba(150, 30, 30, 0.15)',
              }}
            >
              NOVA RUN
            </button>

            {hasSave && (
              <button
                onClick={() => onStart(true)}
                className="w-full py-3 text-base font-bold tracking-widest border rounded transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: '#aaddaa',
                  background: 'linear-gradient(180deg, rgba(30, 110, 30, 0.3), rgba(20, 80, 20, 0.2))',
                  borderColor: '#336633',
                  textShadow: '0 0 10px rgba(50, 200, 50, 0.4)',
                  boxShadow: '0 4px 20px rgba(30, 100, 30, 0.1)',
                }}
              >
                CONTINUAR
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="w-full flex-shrink-0">
            <div className="flex border-b" style={{ borderColor: '#222233' }}>
              {(['play', 'stats', 'help'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 px-2 text-center uppercase cursor-pointer"
                  style={tabStyle(tab)}
                >
                  {tab === 'play' ? '⚔️ Jogar' : tab === 'stats' ? '📊 Stats' : '❓ Ajuda'}
                </button>
              ))}
            </div>

            <div
              className="w-full rounded-b-lg border border-t-0 p-4"
              style={{
                background: 'rgba(10, 10, 20, 0.5)',
                borderColor: '#222233',
                minHeight: '140px',
              }}
            >
              {/* Play tab */}
              {activeTab === 'play' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: 'monospace' }}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(20, 20, 40, 0.5)' }}>
                      <span style={{ color: '#aabbcc' }}>🎮 WASD</span>
                      <span style={{ color: '#666677' }}>Mover</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(20, 20, 40, 0.5)' }}>
                      <span style={{ color: '#aabbcc' }}>🖱️ Esq.</span>
                      <span style={{ color: '#666677' }}>Ataque</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(20, 20, 40, 0.5)' }}>
                      <span style={{ color: '#aabbcc' }}>🔮 Dir./E</span>
                      <span style={{ color: '#666677' }}>Projétil</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(20, 20, 40, 0.5)' }}>
                      <span style={{ color: '#aabbcc' }}>⚡ F</span>
                      <span style={{ color: '#666677' }}>Dash</span>
                    </div>
                  </div>
                  <div className="text-xs space-y-1 pt-1" style={{ color: '#666677', fontFamily: 'monospace', fontSize: '10px' }}>
                    <p>💀 Mate inimigos → Portas abrem</p>
                    <p>🚪 Explore novas salas pelo andar</p>
                    <p>🏆 Suba de nível e escolha upgrades</p>
                    <p>👹 Derrote o Boss para avançar!</p>
                  </div>
                </div>
              )}

              {/* Stats tab */}
              {activeTab === 'stats' && (
                <div>
                  {stats.totalRuns > 0 ? (
                    <div className="space-y-1.5" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {[
                        ['Total de Runs', stats.totalRuns],
                        ['Almas Coletadas', stats.totalSouls],
                        ['Melhor Andar', stats.bestFloor],
                        ['Melhor Nível', stats.bestLevel],
                        ['Salas Exploradas', stats.totalRoomsExplored],
                        ['Dano Total', Math.floor(stats.totalDamageDealt)],
                        ['Tempo Total', formatTime(stats.totalTimePlayed)],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between py-1 px-2 rounded" style={{ background: 'rgba(20, 20, 40, 0.3)' }}>
                          <span style={{ color: '#7766aa' }}>{label}</span>
                          <span style={{ color: '#bbaadd' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6" style={{ color: '#444455', fontFamily: 'monospace', fontSize: '12px' }}>
                      Nenhuma run registrada ainda.
                      <br />
                      <span style={{ fontSize: '10px' }}>Jogue para ver suas estatísticas aqui.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Help tab */}
              {activeTab === 'help' && (
                <div className="space-y-3" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#777788' }}>
                  <div>
                    <p className="font-bold mb-1" style={{ color: '#9988bb', fontSize: '12px' }}>🎯 Objetivo</p>
                    <p>Explore o dungeon, derrote inimigos e bosses, e avance pelos andares o máximo que conseguir.</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: '#9988bb', fontSize: '12px' }}>⭐ Rank</p>
                    <p>Cada inimigo derrotado conta como uma alma. Acumule almas entre runs para subir de rank — de Alma Perdida até Deus da Escuridão.</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: '#9988bb', fontSize: '12px' }}>🔧 Upgrades</p>
                    <p>Ao subir de nível, escolha entre 3 upgrades. Combine upgrades do mesmo tipo para ativar sinergias!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dev Mode (small toggle at bottom) */}
          <button
            onClick={() => setShowDevMenu(true)}
            className="mt-4 px-3 py-1 text-xs tracking-widest border rounded transition-all duration-300 hover:opacity-80 flex-shrink-0"
            style={{
              fontFamily: 'monospace',
              color: '#444455',
              background: 'rgba(30, 30, 50, 0.2)',
              borderColor: '#222233',
              fontSize: '10px',
            }}
          >
            🛠️ DEV
          </button>

          {/* Spacer */}
          <div className="flex-1 min-h-4" />
        </div>
      </div>

      {/* Dev Mode Modal */}
      <Dialog open={showDevMenu} onOpenChange={setShowDevMenu}>
        <DialogContent
          className="border rounded-lg p-0 overflow-hidden"
          style={{
            background: 'rgba(10, 8, 20, 0.98)',
            borderColor: '#333355',
            boxShadow: '0 0 40px rgba(100, 60, 160, 0.2), 0 0 80px rgba(0,0,0,0.6)',
            maxWidth: '380px',
          }}
        >
          <DialogTitle className="sr-only">Dev Mode</DialogTitle>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🛠️</span>
              <h3
                className="text-sm font-bold tracking-[0.2em] uppercase"
                style={{ fontFamily: 'monospace', color: '#8877aa' }}
              >
                Dev Mode
              </h3>
            </div>

            <div
              className="rounded-lg border p-4 mb-4"
              style={{ background: 'rgba(20, 15, 35, 0.6)', borderColor: '#222244' }}
            >
              <p className="text-xs mb-3" style={{ color: '#666688', fontFamily: 'monospace' }}>
                Iniciar em andar específico:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(floor => (
                  <button
                    key={floor}
                    onClick={() => { setShowDevMenu(false); onStartFloor?.(floor); }}
                    className="py-2.5 text-sm font-bold border rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      fontFamily: 'monospace',
                      color: '#ddaa44',
                      background: 'linear-gradient(180deg, rgba(80, 60, 15, 0.4), rgba(60, 45, 10, 0.2))',
                      borderColor: '#554422',
                      textShadow: '0 0 8px rgba(200, 150, 50, 0.3)',
                    }}
                  >
                    F{floor}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p style={{ color: '#333344', fontFamily: 'monospace', fontSize: '9px' }}>
                Stats escalonadas automaticamente por andar
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TitleScreen;
