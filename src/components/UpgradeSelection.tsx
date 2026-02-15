import { Upgrade } from '@/game/types';
import { useEffect, useState } from 'react';

interface Props {
  choices: Upgrade[];
  onSelect: (upgrade: Upgrade) => void;
}

const rarityColors: Record<string, { border: string; bg: string; glow: string }> = {
  common: { border: '#888888', bg: 'rgba(100,100,100,0.15)', glow: 'rgba(150,150,150,0.2)' },
  rare: { border: '#4488ff', bg: 'rgba(68,136,255,0.12)', glow: 'rgba(68,136,255,0.3)' },
  epic: { border: '#bb44ff', bg: 'rgba(187,68,255,0.12)', glow: 'rgba(187,68,255,0.3)' },
  legendary: { border: '#ffaa00', bg: 'rgba(255,170,0,0.15)', glow: 'rgba(255,170,0,0.5)' },
};

const UpgradeSelection = ({ choices, onSelect }: Props) => {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsSmall(Math.min(window.innerWidth, window.innerHeight) < 500);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center"
      style={{ background: 'rgba(5, 5, 10, 0.85)', padding: isSmall ? '8px' : '16px' }}
    >
      <h2
        className="font-bold tracking-wider"
        style={{
          fontFamily: "'Cinzel', serif",
          color: '#ffcc00',
          textShadow: '0 0 20px rgba(255, 200, 0, 0.4), 0 0 40px rgba(255, 150, 0, 0.2)',
          fontSize: isSmall ? '18px' : isLandscape && isMobile ? '22px' : '32px',
          marginBottom: isSmall ? '4px' : '8px',
        }}
      >
        SUBIU DE NÍVEL!
      </h2>
      <p
        style={{
          color: '#aaaabb',
          fontFamily: 'monospace',
          fontSize: isSmall ? '10px' : '14px',
          marginBottom: isSmall ? '8px' : isLandscape ? '12px' : '24px',
        }}
      >
        Escolha um upgrade
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isLandscape ? 'row' : isSmall ? 'column' : 'row',
          gap: isSmall ? '8px' : '12px',
          padding: '0 8px',
          maxWidth: '100%',
          maxHeight: isLandscape && isMobile ? '70vh' : undefined,
          overflowY: isLandscape && isMobile ? 'auto' : undefined,
          alignItems: isSmall && !isLandscape ? 'stretch' : 'stretch',
          justifyContent: 'center',
        }}
      >
        {choices.map((upgrade) => {
          const rc = rarityColors[upgrade.rarity] || rarityColors.common;
          return (
            <button
              key={upgrade.id}
              onClick={() => onSelect(upgrade)}
              style={{
                display: 'flex',
                flexDirection: isSmall && !isLandscape ? 'row' : 'column',
                alignItems: 'center',
                padding: isSmall ? '10px 14px' : '14px',
                width: isSmall && !isLandscape ? '100%' : isLandscape && isMobile ? '140px' : '150px',
                minHeight: isMobile ? '48px' : undefined,
                border: `2px solid ${rc.border}`,
                borderRadius: '8px',
                background: rc.bg,
                boxShadow: `0 0 15px ${rc.glow}`,
                transition: 'all 0.2s',
                gap: isSmall && !isLandscape ? '10px' : '4px',
                cursor: 'pointer',
                textAlign: isSmall && !isLandscape ? 'left' : 'center',
                touchAction: 'manipulation',
              }}
            >
              <span style={{ fontSize: isSmall ? '24px' : '28px', flexShrink: 0 }}>{upgrade.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    color: rc.border,
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 'bold',
                    fontSize: isSmall ? '12px' : '13px',
                    display: 'block',
                  }}
                >
                  {upgrade.name}
                </span>
                <span
                  style={{
                    color: '#aaaabb',
                    fontFamily: 'monospace',
                    fontSize: isSmall ? '10px' : '11px',
                    lineHeight: '1.3',
                    display: 'block',
                    marginTop: '2px',
                  }}
                >
                  {upgrade.description}
                </span>
              </div>
              <span
                style={{
                  color: rc.border,
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  flexShrink: 0,
                }}
              >
                {upgrade.rarity === 'common' ? 'Comum' : upgrade.rarity === 'rare' ? 'Raro' : upgrade.rarity === 'epic' ? 'Épico' : '★ Lendário'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UpgradeSelection;
