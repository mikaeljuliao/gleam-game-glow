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
  // Joystick visual state
  const [joystick, setJoystick] = useState({ active: false, originX: 0, originY: 0, posX: 0, posY: 0 });
  const joystickRafRef = useRef<number>(0);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Poll joystick state from engine for visual feedback
  useEffect(() => {
    if (!isMobile) return;
    const poll = () => {
      const js = engineRef.current?.input.getJoystickState();
      if (js) {
        setJoystick({
          active: js.active,
          originX: js.originX,
          originY: js.originY,
          posX: js.posX,
          posY: js.posY,
        });
      }
      joystickRafRef.current = requestAnimationFrame(poll);
    };
    joystickRafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(joystickRafRef.current);
  }, [isMobile, engineRef]);

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

  const handlePotion = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Simulate 'Q' key press via input manager
    const engine = engineRef.current;
    if (!engine) return;
    // Directly trigger potion use like keyboard Q
    engine.input.triggerKey('q');
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


  if (!isMobile) return null;

  const safeBottom = isLandscape ? 12 : 80;
  const safeLeft = isLandscape ? 12 : 16;
  const safeRight = isLandscape ? 12 : 16;
  const btnSize = isLandscape ? 54 : 60;
  const smallBtn = isLandscape ? 40 : 44;

  const btnBase: React.CSSProperties = {
    borderRadius: '50%',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  const makeBtn = (bg: string, border: string, color: string, size = btnSize, fontSize = 10): React.CSSProperties => ({
    ...btnBase,
    width: size,
    height: size,
    fontSize,
    background: bg,
    border: `2px solid ${border}`,
    color,
    boxShadow: `0 0 14px ${bg}, 0 4px 8px rgba(0,0,0,0.6)`,
  });

  // Joystick rendering helpers
  const joystickBaseR = isLandscape ? 52 : 58;
  const joystickKnobR = isLandscape ? 22 : 26;
  const joystickLeft = isLandscape ? safeLeft : safeLeft;
  const joystickBottom = safeBottom;

  // Compute knob displacement clamped to base radius
  let knobDX = 0, knobDY = 0;
  if (joystick.active) {
    const rawDX = joystick.posX - joystick.originX;
    const rawDY = joystick.posY - joystick.originY;
    const dist = Math.sqrt(rawDX * rawDX + rawDY * rawDY);
    const maxDist = joystickBaseR * 0.7;
    const clampedDist = Math.min(dist, maxDist);
    if (dist > 0) {
      knobDX = (rawDX / dist) * clampedDist;
      knobDY = (rawDY / dist) * clampedDist;
    }
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>

      {/* ── JOYSTICK (bottom-left) ── */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: joystickBottom,
          left: joystickLeft,
          width: joystickBaseR * 2,
          height: joystickBaseR * 2,
        }}
      >
        {/* Base ring */}
        <svg
          width={joystickBaseR * 2}
          height={joystickBaseR * 2}
          style={{ position: 'absolute', top: 0, left: 0, opacity: joystick.active ? 0.7 : 0.35 }}
        >
          <circle
            cx={joystickBaseR} cy={joystickBaseR} r={joystickBaseR - 3}
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(100,180,255,0.6)"
            strokeWidth="2"
          />
          {/* Crosshair guides */}
          <line x1={joystickBaseR} y1={4} x2={joystickBaseR} y2={joystickBaseR * 2 - 4} stroke="rgba(100,180,255,0.25)" strokeWidth="1" />
          <line x1={4} y1={joystickBaseR} x2={joystickBaseR * 2 - 4} y2={joystickBaseR} stroke="rgba(100,180,255,0.25)" strokeWidth="1" />
        </svg>
        {/* Knob */}
        <div style={{
          position: 'absolute',
          left: joystickBaseR - joystickKnobR + knobDX,
          top: joystickBaseR - joystickKnobR + knobDY,
          width: joystickKnobR * 2,
          height: joystickKnobR * 2,
          borderRadius: '50%',
          background: joystick.active
            ? 'radial-gradient(circle at 35% 35%, rgba(180,210,255,0.95), rgba(60,120,255,0.7))'
            : 'radial-gradient(circle at 35% 35%, rgba(160,190,255,0.5), rgba(40,100,200,0.35))',
          border: '2px solid rgba(100,180,255,0.8)',
          boxShadow: joystick.active ? '0 0 16px rgba(80,160,255,0.8)' : '0 0 8px rgba(60,120,255,0.4)',
          transition: joystick.active ? 'none' : 'left 0.12s, top 0.12s',
        }} />
      </div>

      {/* ── COMBAT BUTTONS (bottom-right) ── */}
      <div
        className="pointer-events-auto absolute flex gap-3 items-end"
        style={{ bottom: safeBottom, right: safeRight }}
      >
        {/* Ranged */}
        <button
          style={makeBtn('rgba(150,50,255,0.35)', 'rgba(180,100,255,0.7)', '#cc88ff', btnSize, 11)}
          onTouchStart={handleRanged}
        >
          <span style={{ textAlign: 'center', lineHeight: 1.1 }}>🏹{'\n'}TIRO</span>
        </button>

        {/* Dash */}
        <button
          style={makeBtn('rgba(50,120,255,0.35)', 'rgba(100,160,255,0.7)', '#88bbff', btnSize, 9)}
          onTouchStart={handleDash}
        >
          <span style={{ textAlign: 'center', lineHeight: 1.1 }}>⚡{'\n'}DASH</span>
        </button>
      </div>

      {/* ── POTION BUTTON (bottom-center-ish) ── */}
      <div
        className="pointer-events-auto absolute"
        style={{ bottom: safeBottom, left: '50%', transform: 'translateX(-50%)' }}
      >
        <button
          style={makeBtn('rgba(60,180,80,0.35)', 'rgba(80,220,110,0.7)', '#88ffaa', smallBtn + 4, 18)}
          onTouchStart={handlePotion}
          title="Usar Poção (Q)"
        >
          🧪
        </button>
      </div>

      {/* ── UTILITY BUTTONS (top-right) ── */}
      <div
        className="pointer-events-auto absolute flex gap-2"
        style={{ top: isLandscape ? 8 : 14, right: safeRight }}
      >
        <button
          style={makeBtn('rgba(200,170,50,0.35)', 'rgba(220,190,80,0.6)', '#ddcc66', smallBtn, 18)}
          onTouchStart={handleInventory}
        >
          🎒
        </button>
        <button
          style={makeBtn('rgba(50,150,100,0.35)', 'rgba(80,180,130,0.6)', '#66ddaa', smallBtn, 18)}
          onTouchStart={handleMap}
        >
          🗺️
        </button>
        <button
          style={makeBtn('rgba(80,200,150,0.35)', 'rgba(100,220,170,0.6)', '#88ffcc', smallBtn, 18)}
          onTouchStart={handleSanctuary}
        >
          💚
        </button>
      </div>

      {/* ── HINT BAR (very bottom) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: isLandscape ? 2 : 36,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(180,180,200,0.4)',
          fontSize: 7,
          fontFamily: 'Arial, Helvetica, sans-serif',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em',
        }}
      >
        ◀ MOVER │ ▶ ATACAR (toque direito) │ Q = Poção
      </div>
    </div>
  );
};

export default MobileHUD;
