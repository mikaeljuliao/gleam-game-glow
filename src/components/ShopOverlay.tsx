import { useState, useEffect } from 'react';
import { ShopItem } from '@/game/types';
import { SFX } from '@/game/audio';

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
  common: 'rgba(120, 120, 120, 0.08)',
  rare: 'rgba(68, 136, 255, 0.08)',
  epic: 'rgba(187, 68, 255, 0.08)',
  legendary: 'rgba(255, 170, 0, 0.08)',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'none',
  rare: '0 0 8px rgba(68, 136, 255, 0.15)',
  epic: '0 0 10px rgba(187, 68, 255, 0.2)',
  legendary: '0 0 14px rgba(255, 170, 0, 0.25)',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

interface ShopOverlayProps {
  items: ShopItem[];
  coins: number;
  onBuy: (index: number) => void;
  onClose: () => void;
}

const ShopOverlay = ({ items, coins: souls, onBuy, onClose }: ShopOverlayProps) => {
  const [dialogue, setDialogue] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [buyFlash, setBuyFlash] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
    if (item.sold || souls < item.cost) {
      SFX.actionBlocked();
      return;
    }
    onBuy(index);
    SFX.shopBuy();
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

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="relative flex flex-col max-w-2xl w-full mx-4 rounded-lg border overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(22, 18, 14, 0.98) 0%, rgba(14, 12, 10, 0.99) 100%)',
          borderColor: 'rgba(160, 130, 70, 0.25)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            borderBottom: '1px solid rgba(160, 130, 70, 0.15)',
            background: 'rgba(40, 30, 15, 0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 22 }}>🧙</span>
            <h2
              style={{
                color: '#d4c090',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Mercador das Sombras
            </h2>
          </div>

          {/* Soul counter */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{
              background: 'rgba(40, 80, 160, 0.12)',
              border: '1px solid rgba(60, 120, 200, 0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <polygon points="7,1 12,7 7,13 2,7" fill="#5599dd" />
              <polygon points="7,3 10,7 7,11 4,7" fill="#88ccff" />
            </svg>
            <span
              style={{
                color: '#88ccff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {souls}
            </span>
          </div>
        </div>

        {/* Dialogue */}
        <div
          className="px-5 py-2"
          style={{
            borderBottom: '1px solid rgba(160, 130, 70, 0.1)',
          }}
        >
          <div
            className="italic text-center"
            style={{
              color: '#b8a878',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              letterSpacing: '0.04em',
              minHeight: 20,
            }}
          >
            "{displayedText}"
            <span style={{ opacity: displayedText.length < dialogue.length ? 1 : 0 }}>▌</span>
          </div>
        </div>

        {/* Content: Grid + Detail panel */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Item Grid */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{
              borderRight: selectedItem ? '1px solid rgba(160, 130, 70, 0.1)' : 'none',
            }}
          >
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              }}
            >
              {items.map((item, idx) => {
                const canAfford = souls >= item.cost;
                const isSold = item.sold;
                const isSelected = selectedIndex === idx;
                const rarity = item.upgrade.rarity;

                return (
                  <button
                    key={idx}
                    onClick={() => { SFX.shopSelect(); setSelectedIndex(isSelected ? null : idx); }}
                    className="flex flex-col items-center p-3 rounded transition-all text-center"
                    style={{
                      background: isSold
                        ? 'rgba(25, 25, 25, 0.4)'
                        : isSelected
                        ? 'rgba(160, 130, 70, 0.15)'
                        : buyFlash === idx
                        ? 'rgba(220, 190, 80, 0.15)'
                        : RARITY_BG[rarity],
                      border: `1.5px solid ${
                        isSold
                          ? 'rgba(50, 50, 50, 0.3)'
                          : isSelected
                          ? RARITY_COLORS[rarity]
                          : `${RARITY_COLORS[rarity]}40`
                      }`,
                      boxShadow: isSelected && !isSold ? RARITY_GLOW[rarity] : 'none',
                      opacity: isSold ? 0.35 : canAfford ? 1 : 0.5,
                      cursor: isSold ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {/* Icon */}
                    <span
                      style={{
                        fontSize: 24,
                        filter: isSold ? 'grayscale(1)' : 'none',
                        marginBottom: 4,
                      }}
                    >
                      {item.upgrade.icon}
                    </span>

                    {/* Name */}
                    <span
                      style={{
                        color: isSold ? '#555' : RARITY_COLORS[rarity],
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textDecoration: isSold ? 'line-through' : 'none',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.upgrade.name}
                    </span>

                    {/* Rarity + amulet tag */}
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        style={{
                          color: RARITY_COLORS[rarity],
                          fontSize: 8,
                          opacity: 0.7,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {RARITY_LABELS[rarity]}
                      </span>
                      {item.amuletId && (
                        <span
                          style={{
                            color: '#cc88ff',
                            fontSize: 7,
                            background: 'rgba(140, 80, 220, 0.2)',
                            padding: '0 4px',
                            borderRadius: 2,
                            textTransform: 'uppercase',
                          }}
                        >
                          Amuleto
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div
                      className="flex items-center gap-1 mt-2"
                      style={{
                        color: isSold ? '#444' : canAfford ? '#88ccff' : '#cc5555',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14">
                        <polygon points="7,1 12,7 7,13 2,7" fill={isSold ? '#444' : canAfford ? '#5599dd' : '#aa4444'} />
                        <polygon points="7,3 10,7 7,11 4,7" fill={isSold ? '#555' : canAfford ? '#88ccff' : '#cc5555'} />
                      </svg>
                      {isSold ? 'VENDIDO' : item.cost}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div
              className="flex flex-col p-4"
              style={{
                width: 220,
                background: 'rgba(15, 12, 8, 0.6)',
                flexShrink: 0,
              }}
            >
              <div className="flex flex-col items-center mb-4">
                <span style={{ fontSize: 36, marginBottom: 8 }}>{selectedItem.upgrade.icon}</span>
                <h3
                  style={{
                    color: RARITY_COLORS[selectedItem.upgrade.rarity],
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  {selectedItem.upgrade.name}
                </h3>
                <span
                  style={{
                    color: RARITY_COLORS[selectedItem.upgrade.rarity],
                    fontSize: 9,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}
                >
                  {RARITY_LABELS[selectedItem.upgrade.rarity]}
                </span>
                {selectedItem.amuletId && (
                  <span
                    style={{
                      color: '#cc88ff',
                      fontSize: 9,
                      background: 'rgba(140, 80, 220, 0.2)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    🔮 Amuleto
                  </span>
                )}
              </div>

              {/* Description */}
              <div
                className="flex-1 mb-4"
                style={{
                  color: '#909080',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 11,
                  lineHeight: 1.5,
                  letterSpacing: '0.02em',
                }}
              >
                {selectedItem.upgrade.description}
              </div>

              {/* Price + Buy button */}
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center justify-center gap-2 py-2 rounded"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(60, 120, 200, 0.2)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <polygon points="7,1 12,7 7,13 2,7" fill={selectedItem.sold ? '#555' : souls >= selectedItem.cost ? '#5599dd' : '#aa4444'} />
                    <polygon points="7,3 10,7 7,11 4,7" fill={selectedItem.sold ? '#666' : souls >= selectedItem.cost ? '#88ccff' : '#cc5555'} />
                  </svg>
                  <span
                    style={{
                      color: selectedItem.sold ? '#555' : souls >= selectedItem.cost ? '#88ccff' : '#cc5555',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {selectedItem.cost}
                  </span>
                </div>

                <button
                  onClick={() => selectedIndex !== null && handleBuy(selectedIndex)}
                  disabled={selectedItem.sold || souls < selectedItem.cost}
                  className="w-full py-2.5 rounded font-medium transition-all hover:brightness-110"
                  style={{
                    background: selectedItem.sold
                      ? 'rgba(40, 40, 40, 0.4)'
                      : souls >= selectedItem.cost
                      ? 'rgba(60, 130, 70, 0.5)'
                      : 'rgba(80, 30, 30, 0.4)',
                    color: selectedItem.sold
                      ? '#555'
                      : souls >= selectedItem.cost
                      ? '#88ee88'
                      : '#cc6666',
                    border: `1px solid ${
                      selectedItem.sold
                        ? 'rgba(60, 60, 60, 0.3)'
                        : souls >= selectedItem.cost
                        ? 'rgba(80, 180, 100, 0.4)'
                        : 'rgba(180, 60, 60, 0.3)'
                    }`,
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    cursor: selectedItem.sold || souls < selectedItem.cost ? 'not-allowed' : 'pointer',
                  }}
                >
                  {selectedItem.sold ? 'VENDIDO' : souls >= selectedItem.cost ? 'COMPRAR' : 'ALMAS INSUFICIENTES'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-center px-5 py-3"
          style={{
            borderTop: '1px solid rgba(160, 130, 70, 0.1)',
            background: 'rgba(30, 25, 15, 0.3)',
          }}
        >
          <button
            onClick={() => { SFX.uiClose(); onClose(); }}
            className="px-6 py-2 rounded font-medium transition-all hover:brightness-110"
            style={{
              background: 'rgba(80, 60, 30, 0.4)',
              color: '#d4c090',
              border: '1px solid rgba(160, 130, 70, 0.25)',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            Sair da Loja
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopOverlay;