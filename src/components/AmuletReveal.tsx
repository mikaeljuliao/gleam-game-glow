import { useEffect, useState } from 'react';
import { getAmuletDef } from '@/game/amulets';
import { SFX } from '@/game/audio';

interface AmuletRevealProps {
  amuletId: string;
  onComplete: () => void;
}

const AmuletReveal = ({ amuletId, onComplete }: AmuletRevealProps) => {
  const [phase, setPhase] = useState<'flash' | 'reveal' | 'details'>('flash');
  const def = getAmuletDef(amuletId);

  useEffect(() => {
    // Phase timings
    const t1 = setTimeout(() => setPhase('reveal'), 600);
    const t2 = setTimeout(() => setPhase('details'), 1800);
    const t3 = setTimeout(() => onComplete(), 4000);
    // Reward sound
    const t4 = setTimeout(() => {
      SFX.amuletEquip();
      setTimeout(() => SFX.levelUp(), 300);
    }, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  if (!def) {
    onComplete();
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={() => phase === 'details' && onComplete()}
    >
      {/* Radial glow */}
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(150, 100, 255, 0.25) 0%, rgba(100, 50, 200, 0.08) 50%, transparent 70%)',
          animation: phase !== 'flash' ? 'pulse 2s ease-in-out infinite' : undefined,
          opacity: phase === 'flash' ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Flash burst */}
      {phase === 'flash' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 60%)',
            animation: 'fade-out 0.6s ease-out forwards',
          }}
        />
      )}

      {/* Content */}
      <div
        className="relative flex flex-col items-center gap-4"
        style={{
          opacity: phase === 'flash' ? 0 : 1,
          transform: phase === 'flash' ? 'scale(0.5)' : 'scale(1)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Amulet icon */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '2px solid rgba(180, 130, 255, 0.6)',
            background: 'rgba(40, 20, 80, 0.8)',
            boxShadow: '0 0 30px rgba(150, 100, 255, 0.4), inset 0 0 20px rgba(150, 100, 255, 0.2)',
            fontSize: 36,
          }}
        >
          {def.icon}
        </div>

        {/* Label */}
        <div
          style={{
            color: 'rgba(180, 130, 255, 0.6)',
            fontSize: 11,
            letterSpacing: '0.2em',
            fontFamily: "'Montserrat', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          Amuleto Obtido
        </div>

        {/* Name */}
        <div
          style={{
            color: '#ddbbff',
            fontSize: 22,
            fontWeight: 600,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: '0.05em',
            textShadow: '0 0 20px rgba(150, 100, 255, 0.5)',
          }}
        >
          {def.name}
        </div>

        {/* Description */}
        {phase === 'details' && (
          <div
            style={{
              color: 'rgba(200, 180, 230, 0.8)',
              fontSize: 13,
              maxWidth: 280,
              textAlign: 'center',
              lineHeight: '1.5',
              fontFamily: "'Montserrat', sans-serif",
              animation: 'fade-in 0.5s ease-out',
            }}
          >
            {def.description}
          </div>
        )}

        {/* Click prompt */}
        {phase === 'details' && (
          <div
            style={{
              color: 'rgba(150, 130, 180, 0.5)',
              fontSize: 10,
              marginTop: 16,
              animation: 'fade-in 0.5s ease-out',
            }}
          >
            clique para continuar
          </div>
        )}
      </div>
    </div>
  );
};

export default AmuletReveal;
