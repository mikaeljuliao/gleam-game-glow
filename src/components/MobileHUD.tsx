import { useEffect, useRef, useCallback, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { isAmuletEquipped } from '@/game/amulets';
import { SFX } from '@/game/audio';

interface MobileHUDProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onOpenInventory: () => void;
  onOpenMap: () => void;
}

const MobileHUD = ({ engineRef, onOpenInventory, onOpenMap }: MobileHUDProps) => {
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

  const handleInventory = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    SFX.uiOpen();
    onOpenInventory();
  }, [onOpenInventory]);

  const handleMap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const engine = engineRef.current;
    if (engine && isAmuletEquipped(engine.amuletInventory, 'cartographer')) {
      SFX.mapOpen();
      onOpenMap();
    }
  }, [engineRef, onOpenMap]);

  const handleSanctuary = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    engineRef.current?.trySanctuaryHeal();
  }, [engineRef]);

  const handleVendorInteract = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    engineRef.current?.tryVendorInteract();
  }, [engineRef]);

  if (!isMobile) return null;

  const btnSize = isLandscape ? 56 : 58;
  const smallBtn = isLandscape ? 40 : 42;
  const safeBottom = isLandscape ? 14 : 64;
  const safeRight = isLandscape ? 16 : 16;

  const btnStyle = (bg: string, border: string, color: string, size = btnSize): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: '50%',
    background: bg,
    border: `2px solid ${border}`,
    color,
    fontSize: isLandscape ? 11 : 10,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 'bold',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: `0 0 10px ${bg}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>
      {/* Combat buttons - bottom right */}
      <div
        className="pointer-events-auto absolute flex gap-3"
        style={{ bottom: safeBottom, right: safeRight }}
      >
        <button
          style={btnStyle('rgba(150, 50, 255, 0.4)', 'rgba(180, 100, 255, 0.6)', '#cc88ff')}
          onTouchStart={handleRanged}
        >
          TIRO
        </button>
        <button
          style={btnStyle('rgba(50, 120, 255, 0.4)', 'rgba(100, 160, 255, 0.6)', '#88bbff')}
          onTouchStart={handleDash}
        >
          DASH
        </button>
      </div>

      {/* Utility buttons - top right */}
      <div
        className="pointer-events-auto absolute flex gap-2"
        style={{ top: isLandscape ? 8 : 12, right: safeRight }}
      >
        <button
          style={btnStyle('rgba(200, 170, 50, 0.35)', 'rgba(220, 190, 80, 0.5)', '#ddcc66', smallBtn)}
          onTouchStart={handleInventory}
        >
          🎒
        </button>
        <button
          style={btnStyle('rgba(50, 150, 100, 0.35)', 'rgba(80, 180, 130, 0.5)', '#66ddaa', smallBtn)}
          onTouchStart={handleMap}
        >
          🗺️
        </button>
        <button
          style={btnStyle('rgba(80, 200, 150, 0.35)', 'rgba(100, 220, 170, 0.5)', '#88ffcc', smallBtn)}
          onTouchStart={handleSanctuary}
        >
          💚
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
