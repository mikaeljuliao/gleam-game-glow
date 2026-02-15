import { useState } from 'react';
import { AmuletInventory as AmuletInvType, getAmuletDef, getEquippedCount } from '@/game/amulets';

interface AmuletInventoryProps {
  inventory: AmuletInvType;
  souls: number;
  onToggleEquip: (defId: string) => void;
  onClose: () => void;
}

const AmuletInventoryOverlay = ({ inventory, souls, onToggleEquip, onClose }: AmuletInventoryProps) => {
  const [flashId, setFlashId] = useState<string | null>(null);
  const equippedCount = getEquippedCount(inventory);

  const handleToggle = (defId: string) => {
    onToggleEquip(defId);
    setFlashId(defId);
    setTimeout(() => setFlashId(null), 300);
  };

  const maxSlots = inventory.maxEquipped;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative flex flex-col items-center rounded-lg border max-w-lg w-full mx-4"
        style={{
          background: 'linear-gradient(180deg, rgba(12, 14, 28, 0.98) 0%, rgba(8, 10, 20, 0.99) 100%)',
          borderColor: 'rgba(80, 140, 220, 0.3)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="w-full flex items-center justify-between px-5 py-3"
          style={{
            borderBottom: '1px solid rgba(80, 140, 220, 0.15)',
            background: 'rgba(30, 50, 100, 0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(60, 100, 200, 0.2)',
                borderRadius: 6,
                border: '1px solid rgba(80, 140, 220, 0.3)',
              }}
            >
              <span style={{ fontSize: 16 }}>🔮</span>
            </div>
            <h2
              style={{
                color: '#88bbee',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Amuletos
            </h2>
          </div>

          {/* Soul counter in header */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded"
            style={{
              background: 'rgba(40, 80, 160, 0.15)',
              border: '1px solid rgba(60, 120, 200, 0.25)',
            }}
          >
            {/* Soul crystal icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <polygon points="7,1 12,7 7,13 2,7" fill="#5599dd" />
              <polygon points="7,3 10,7 7,11 4,7" fill="#88ccff" />
            </svg>
            <span
              style={{
                color: '#88ccff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {souls}
            </span>
          </div>
        </div>

        {/* Equipped Slots Visual */}
        <div className="w-full px-5 pt-4 pb-2">
          <div
            className="flex items-center gap-1 mb-1"
            style={{
              color: '#6688aa',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Slots Equipados
          </div>
          <div className="flex gap-2">
            {Array.from({ length: maxSlots }).map((_, i) => {
              const equipped = inventory.owned.filter(a => a.equipped);
              const amulet = equipped[i];
              const def = amulet ? getAmuletDef(amulet.defId) : null;

              return (
                <div
                  key={i}
                  className="flex items-center justify-center rounded"
                  style={{
                    width: 44,
                    height: 44,
                    background: amulet
                      ? 'rgba(50, 80, 160, 0.25)'
                      : 'rgba(20, 25, 40, 0.6)',
                    border: `1.5px solid ${amulet ? 'rgba(80, 140, 220, 0.5)' : 'rgba(40, 50, 80, 0.4)'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {def ? (
                    <span style={{ fontSize: 20 }}>{def.icon}</span>
                  ) : (
                    <span
                      style={{
                        color: 'rgba(60, 80, 120, 0.4)',
                        fontSize: 18,
                        fontWeight: 300,
                      }}
                    >
                      +
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              color: equippedCount >= maxSlots ? '#cc6644' : '#556688',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 10,
              marginTop: 4,
            }}
          >
            {equippedCount}/{maxSlots} equipados
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full"
          style={{
            height: 1,
            background: 'rgba(80, 140, 220, 0.1)',
            margin: '4px 0',
          }}
        />

        {/* Amulet list */}
        <div className="w-full px-4 py-3">
          {inventory.owned.length === 0 ? (
            <div
              className="text-center py-8"
              style={{
                color: '#445566',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 12,
              }}
            >
              Nenhum amuleto encontrado.
              <br />
              <span style={{ fontSize: 10, color: '#334455' }}>
                Derrote bosses ou compre no mercador.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {inventory.owned.map((amulet) => {
                const def = getAmuletDef(amulet.defId);
                if (!def) return null;
                const isEquipped = amulet.equipped;
                const canEquip = isEquipped || equippedCount < maxSlots;
                const isFlashing = flashId === amulet.defId;

                return (
                  <button
                    key={amulet.defId}
                    onClick={() => handleToggle(amulet.defId)}
                    disabled={!canEquip && !isEquipped}
                    className="w-full flex items-center gap-3 rounded transition-all"
                    style={{
                      padding: '10px 12px',
                      background: isFlashing
                        ? 'rgba(60, 120, 220, 0.2)'
                        : isEquipped
                        ? 'rgba(40, 70, 140, 0.18)'
                        : 'rgba(15, 20, 35, 0.5)',
                      border: `1px solid ${
                        isEquipped
                          ? 'rgba(80, 140, 220, 0.45)'
                          : 'rgba(40, 55, 90, 0.3)'
                      }`,
                      cursor: canEquip || isEquipped ? 'pointer' : 'not-allowed',
                      opacity: canEquip || isEquipped ? 1 : 0.4,
                      textAlign: 'left',
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="flex items-center justify-center rounded"
                      style={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        background: isEquipped
                          ? 'rgba(50, 90, 180, 0.25)'
                          : 'rgba(20, 30, 50, 0.5)',
                        border: `1px solid ${
                          isEquipped ? 'rgba(80, 140, 220, 0.4)' : 'rgba(40, 50, 80, 0.3)'
                        }`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{def.icon}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: isEquipped ? '#99ccee' : '#778899',
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {def.name}
                        </span>
                        {isEquipped && (
                          <span
                            style={{
                              color: '#55aa88',
                              fontSize: 8,
                              fontFamily: "'Montserrat', sans-serif",
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              background: 'rgba(40, 160, 100, 0.15)',
                              padding: '1px 6px',
                              borderRadius: 3,
                              border: '1px solid rgba(40, 160, 100, 0.25)',
                            }}
                          >
                            Ativo
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          color: '#556677',
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          lineHeight: '1.3',
                          marginTop: 2,
                        }}
                      >
                        {def.description}
                      </div>
                    </div>

                    {/* Toggle indicator */}
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        background: isEquipped
                          ? 'rgba(60, 160, 120, 0.3)'
                          : 'rgba(30, 40, 60, 0.4)',
                        border: `1px solid ${
                          isEquipped ? 'rgba(60, 160, 120, 0.5)' : 'rgba(50, 60, 90, 0.3)'
                        }`,
                      }}
                    >
                      {isEquipped && (
                        <span style={{ color: '#66cc99', fontSize: 11 }}>✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="w-full flex justify-center px-5 py-3"
          style={{
            borderTop: '1px solid rgba(80, 140, 220, 0.1)',
            background: 'rgba(20, 30, 50, 0.3)',
          }}
        >
          <button
            onClick={onClose}
            className="px-8 py-2 rounded transition-all hover:brightness-110"
            style={{
              background: 'rgba(40, 60, 100, 0.4)',
              color: '#88aacc',
              border: '1px solid rgba(80, 140, 220, 0.25)',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.1em',
            }}
          >
            Fechar [I]
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmuletInventoryOverlay;
