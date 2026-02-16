import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import MainMenu from './menus/MainMenu';

const TitleScreen = ({ onStart, onStartFloor, hasSave = false }: { onStart: (continueGame?: boolean) => void; onStartFloor?: (floor: number) => void; hasSave?: boolean }) => {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* New Main Menu System */}
      <MainMenu
        onStart={onStart}
        hasSave={hasSave}
        onOpenDevMenu={() => setShowDevMenu(true)}
      />

      {/* Dev Mode Modal - Kept for utility */}
      <Dialog open={showDevMenu} onOpenChange={setShowDevMenu}>
        <DialogContent
          className="border rounded-lg p-0 overflow-hidden"
          style={{
            background: 'rgba(10, 8, 20, 0.98)',
            borderColor: '#333355',
            maxWidth: '380px',
          }}
        >
          <DialogTitle className="sr-only">Dev Mode</DialogTitle>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🛠️</span>
              <h3
                className="text-sm font-medium uppercase"
                style={{ fontFamily: 'monospace', color: '#8877aa', letterSpacing: '0.2em' }}
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
                    className="py-2.5 text-sm font-medium border rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      fontFamily: 'monospace',
                      color: '#ccaa55',
                      letterSpacing: '0.1em',
                      background: 'linear-gradient(180deg, rgba(80, 60, 15, 0.4), rgba(60, 45, 10, 0.2))',
                      borderColor: '#554422',
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
