import { useState, useEffect } from 'react';
import { ShopItem } from '@/game/types';

const VENDOR_DIALOGUES = [
  "Você sobreviveu... impressionante.",
  "Tenho algo que pode te ajudar.",
  "Não garanto que verá o próximo andar.",
  "Escolha com cuidado.",
  "As sombras estão ficando mais famintas.",
  "Almas por poder... um bom negócio, não?",
  "Cada item aqui custou a vida de alguém.",
  "Não se demore... eles podem sentir seu cheiro.",
];

const RARITY_COLORS: Record<string, string> = {
  common: '#999999',
  rare: '#6699dd',
  epic: '#aa66dd',
  legendary: '#ddaa55',
};

const RARITY_BG: Record<string, string> = {
  common: 'rgba(120, 120, 120, 0.1)',
  rare: 'rgba(68, 136, 255, 0.1)',
  epic: 'rgba(187, 68, 255, 0.1)',
  legendary: 'rgba(255, 170, 0, 0.1)',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

interface ShopOverlayProps {
  items: ShopItem[];
  coins: number; // actually souls now
  onBuy: (index: number) => void;
  onClose: () => void;
}

const ShopOverlay = ({ items, coins: souls, onBuy, onClose }: ShopOverlayProps) => {
  const [dialogue, setDialogue] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [buyFlash, setBuyFlash] = useState<number | null>(null);

  useEffect(() => {
    const text = VENDOR_DIALOGUES[Math.floor(Math.random() * VENDOR_DIALOGUES.length)];
    setDialogue(text);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, []);

  const handleBuy = (index: number) => {
    const item = items[index];
    if (item.sold || souls < item.cost) return;
    onBuy(index);
    setBuyFlash(index);
    setTimeout(() => setBuyFlash(null), 300);
    const newDialogue = [
      "Boa escolha.",
      "Use com sabedoria.",
      "Que isso te mantenha vivo... por mais tempo.",
      "Sábio investimento.",
    ][Math.floor(Math.random() * 4)];
    setDialogue(newDialogue);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(newDialogue.slice(0, i));
      if (i >= newDialogue.length) clearInterval(interval);
    }, 35);
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="relative flex flex-col items-center p-6 rounded-lg border max-w-md w-full mx-4"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 25, 20, 0.97) 0%, rgba(20, 18, 15, 0.98) 100%)',
          borderColor: 'rgba(160, 130, 70, 0.3)',
        }}
      >
        {/* Vendor title */}
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: '28px' }}>🧙</span>
          <h2
            className="text-lg font-medium"
            style={{
              color: '#d4c090',
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: '0.08em',
            }}
          >
            Mercador das Sombras
          </h2>
        </div>

        {/* Dialogue */}
        <div
          className="w-full px-4 py-2 mb-4 rounded text-center italic"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            color: '#b8a878',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '13px',
            letterSpacing: '0.04em',
            minHeight: '36px',
            borderLeft: '2px solid rgba(160, 130, 70, 0.25)',
            borderRight: '2px solid rgba(160, 130, 70, 0.25)',
          }}
        >
          "{displayedText}"
          <span style={{ opacity: displayedText.length < dialogue.length ? 1 : 0 }}>▌</span>
        </div>

        {/* Souls */}
        <div
          className="flex items-center gap-2 mb-4 px-4 py-1.5 rounded"
          style={{
            background: 'rgba(40, 80, 160, 0.12)',
            border: '1px solid rgba(60, 120, 200, 0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
            <polygon points="7,1 12,7 7,13 2,7" fill="#5599dd" />
            <polygon points="7,3 10,7 7,11 4,7" fill="#88ccff" />
          </svg>
          <span
            style={{
              color: '#88ccff',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            {souls} Almas
          </span>
        </div>

        {/* Items */}
        <div className="w-full space-y-2 mb-4">
          {items.map((item, idx) => {
            const canAfford = souls >= item.cost;
            const isSold = item.sold;
            return (
              <button
                key={idx}
                onClick={() => handleBuy(idx)}
                disabled={isSold || !canAfford}
                className="w-full flex items-center gap-3 p-3 rounded transition-all"
                style={{
                  background: isSold
                    ? 'rgba(30, 30, 30, 0.5)'
                    : buyFlash === idx
                    ? 'rgba(220, 190, 80, 0.15)'
                    : RARITY_BG[item.upgrade.rarity],
                  border: `1px solid ${isSold ? 'rgba(60, 60, 60, 0.3)' : RARITY_COLORS[item.upgrade.rarity]}40`,
                  opacity: isSold ? 0.4 : canAfford ? 1 : 0.6,
                  cursor: isSold || !canAfford ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ fontSize: '22px', filter: isSold ? 'grayscale(1)' : 'none' }}>
                  {item.upgrade.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: isSold ? '#666' : RARITY_COLORS[item.upgrade.rarity],
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '13px',
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textDecoration: isSold ? 'line-through' : 'none',
                      }}
                    >
                      {item.upgrade.name}
                    </span>
                    <span
                      style={{
                        color: RARITY_COLORS[item.upgrade.rarity],
                        fontSize: '9px',
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {RARITY_LABELS[item.upgrade.rarity]}
                    </span>
                    {item.amuletId && (
                      <span
                        style={{
                          color: '#cc88ff',
                          fontSize: '9px',
                          background: 'rgba(140, 80, 220, 0.2)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Amuleto
                      </span>
                    )}
                  </div>
                  <span style={{ color: isSold ? '#555' : '#909090', fontFamily: "'Montserrat', sans-serif", fontSize: '11px', letterSpacing: '0.02em' }}>
                    {isSold ? 'VENDIDO' : item.upgrade.description}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: isSold ? '#555' : canAfford ? '#88ccff' : '#cc5555',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14">
                    <polygon points="7,1 12,7 7,13 2,7" fill={isSold ? '#555' : canAfford ? '#5599dd' : '#aa4444'} />
                    <polygon points="7,3 10,7 7,11 4,7" fill={isSold ? '#666' : canAfford ? '#88ccff' : '#cc5555'} />
                  </svg>
                  {item.cost}
                </div>
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-6 py-2 rounded font-medium transition-all hover:brightness-110"
          style={{
            background: 'rgba(80, 60, 30, 0.5)',
            color: '#d4c090',
            border: '1px solid rgba(160, 130, 70, 0.3)',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '13px',
            letterSpacing: '0.1em',
          }}
        >
          Sair da Loja
        </button>
      </div>
    </div>
  );
};

export default ShopOverlay;
