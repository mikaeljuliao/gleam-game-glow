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

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="relative flex flex-col items-center p-6 rounded-lg border max-w-md w-full mx-4"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 15, 30, 0.98) 0%, rgba(12, 10, 20, 0.99) 100%)',
          borderColor: 'rgba(140, 100, 220, 0.35)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: '26px' }}>🔮</span>
          <h2
            className="text-lg font-medium"
            style={{
              color: '#c8a0f0',
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: '0.08em',
            }}
          >
            Amuletos
          </h2>
        </div>

        {/* Souls display */}
        <div
          className="flex items-center gap-2 mb-2 px-4 py-1 rounded"
          style={{
            background: 'rgba(100, 180, 255, 0.08)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
          }}
        >
          <span style={{ fontSize: '16px' }}>👻</span>
          <span
            style={{
              color: '#88ccff',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            {souls} Almas
          </span>
        </div>

        {/* Slot counter */}
        <div
          className="mb-4"
          style={{
            color: equippedCount >= inventory.maxEquipped ? '#ff8866' : '#aa88cc',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '12px',
            letterSpacing: '0.05em',
          }}
        >
          Equipados: {equippedCount}/{inventory.maxEquipped}
        </div>

        {/* Amulet list */}
        {inventory.owned.length === 0 ? (
          <div
            className="w-full text-center py-8"
            style={{
              color: '#666',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '13px',
            }}
          >
            Nenhum amuleto encontrado ainda.
            <br />
            <span style={{ fontSize: '11px', color: '#555' }}>
              Derrote bosses ou compre no mercador.
            </span>
          </div>
        ) : (
          <div className="w-full space-y-2 mb-4">
            {inventory.owned.map((amulet) => {
              const def = getAmuletDef(amulet.defId);
              if (!def) return null;
              const isEquipped = amulet.equipped;
              const canEquip = isEquipped || equippedCount < inventory.maxEquipped;

              return (
                <button
                  key={amulet.defId}
                  onClick={() => handleToggle(amulet.defId)}
                  disabled={!canEquip && !isEquipped}
                  className="w-full flex items-center gap-3 p-3 rounded transition-all"
                  style={{
                    background: flashId === amulet.defId
                      ? 'rgba(180, 140, 255, 0.15)'
                      : isEquipped
                      ? 'rgba(100, 60, 180, 0.15)'
                      : 'rgba(40, 30, 60, 0.4)',
                    border: `1px solid ${isEquipped ? 'rgba(160, 120, 255, 0.5)' : 'rgba(80, 60, 120, 0.3)'}`,
                    cursor: canEquip || isEquipped ? 'pointer' : 'not-allowed',
                    opacity: canEquip || isEquipped ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{def.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          color: isEquipped ? '#c8a0f0' : '#aaa',
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        {def.name}
                      </span>
                      {isEquipped && (
                        <span
                          style={{
                            color: '#88ff88',
                            fontSize: '9px',
                            fontFamily: "'Montserrat', sans-serif",
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            background: 'rgba(50, 200, 80, 0.15)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                          }}
                        >
                          Equipado
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        color: '#888',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '11px',
                      }}
                    >
                      {def.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-6 py-2 rounded font-medium transition-all hover:brightness-110"
          style={{
            background: 'rgba(60, 40, 80, 0.5)',
            color: '#c8a0f0',
            border: '1px solid rgba(140, 100, 220, 0.3)',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '13px',
            letterSpacing: '0.08em',
          }}
        >
          Fechar [I]
        </button>
      </div>
    </div>
  );
};

export default AmuletInventoryOverlay;
