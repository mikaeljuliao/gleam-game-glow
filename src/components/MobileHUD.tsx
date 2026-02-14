import { useEffect, useRef, useCallback, useState } from 'react';
import { GameEngine } from '@/game/engine';

interface MobileHUDProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
}

const MobileHUD = ({ engineRef }: MobileHUDProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const handleDash = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    engineRef.current?.input.triggerDash();
  }, [engineRef]);

  const handleRanged = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const engine = engineRef.current;
    if (!engine) return;
    const p = engine.player;
    let aimX = p.x + p.facing.x * 50;
    let aimY = p.y + p.facing.y * 50;
    if (engine.enemies.length > 0) {
      let minDist = Infinity;
      for (const en of engine.enemies) {
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        const d = dx * dx + dy * dy;
        if (d < minDist) {
          minDist = d;
          aimX = en.x;
          aimY = en.y;
        }
      }
    }
    engine.input.triggerRanged(aimX, aimY);
  }, [engineRef]);

  if (!isMobile) return null;

  const btnSize = isLandscape ? 56 : 58;
  const safeBottom = isLandscape ? 14 : 64;
  const safeRight = isLandscape ? 16 : 16;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>
      {/* Buttons always side by side */}
      <div
        className="pointer-events-auto absolute flex gap-3"
        style={{
          bottom: safeBottom,
          right: safeRight,
        }}
      >
        <button
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: '50%',
            background: 'rgba(150, 50, 255, 0.4)',
            border: '2.5px solid rgba(180, 100, 255, 0.6)',
            color: '#cc88ff',
            fontSize: isLandscape ? 12 : 11,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'bold',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 0 12px rgba(150, 50, 255, 0.3)',
          }}
          onTouchStart={handleRanged}
        >
          TIRO
        </button>
        <button
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: '50%',
            background: 'rgba(50, 120, 255, 0.4)',
            border: '2.5px solid rgba(100, 160, 255, 0.6)',
            color: '#88bbff',
            fontSize: isLandscape ? 12 : 11,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'bold',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 0 12px rgba(50, 120, 255, 0.3)',
          }}
          onTouchStart={handleDash}
        >
          DASH
        </button>
      </div>

      {/* Hint text */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(180,180,200,0.4)',
          fontSize: 8,
          fontFamily: 'Arial, Helvetica, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {isLandscape ? 'Esq: mover │ Dir: atacar │ Botões: habilidades' : 'Esquerda: mover │ Direita: atacar'}
      </div>
    </div>
  );
};

export default MobileHUD;
