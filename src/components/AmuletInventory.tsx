import { useState } from 'react';
import { AmuletInventory as AmuletInvType, getAmuletDef, getEquippedCount } from '@/game/amulets';

interface AmuletInventoryProps {
  inventory: AmuletInvType;
  souls: number;
  onToggleEquip: (defId: string) => void;
  onToggleConsumable: (id: string) => void;
  onClose: () => void;
}

const AmuletInventoryOverlay = ({ inventory, souls, onToggleEquip, onToggleConsumable, onClose }: AmuletInventoryProps) => {
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'amulets' | 'consumables'>('amulets');
  const equippedCount = getEquippedCount(inventory);

  const handleToggle = (defId: string) => {
    onToggleEquip(defId);
    setFlashId(defId);
    setTimeout(() => setFlashId(null), 300);
  };

  const handleToggleConsumable = (id: string) => {
    onToggleConsumable(id);
    setFlashId(id);
    setTimeout(() => setFlashId(null), 300);
  };

  const maxSlots = inventory.maxEquipped;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative flex flex-col rounded-xl border w-full max-w-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 10, 35, 0.98) 0%, rgba(10, 5, 20, 1) 100%)',
          borderColor: 'rgba(106, 13, 173, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(106, 13, 173, 0.1)',
          maxHeight: '90vh',
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(106, 13, 173, 0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
              <span className="text-xl">🎒</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-purple-100 uppercase tracking-widest m-0">Inventário</h2>
              <div className="text-[9px] text-purple-400 uppercase tracking-tighter opacity-70">Recursos e Relíquias</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Soul status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/20 border border-purple-400/20">
              <svg width="12" height="12" viewBox="0 0 14 14">
                <polygon points="7,1 12,7 7,13 2,7" fill="#6a0dad" />
                <polygon points="7,3 10,7 7,11 4,7" fill="#ac4dff" />
              </svg>
              <span className="text-sm font-bold text-purple-300 font-mono">{souls}</span>
            </div>

            <button onClick={onClose} className="text-purple-400 hover:text-white transition-colors text-xl">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4">
          <button
            onClick={() => setActiveTab('amulets')}
            className={`pb-2 px-1 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'amulets' ? 'text-purple-200 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
          >
            Amuletos
          </button>
          <button
            onClick={() => setActiveTab('consumables')}
            className={`pb-2 px-1 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'consumables' ? 'text-purple-200 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
          >
            Consumíveis
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto px-6 py-4 custom-scrollbar">
          {activeTab === 'amulets' && (
            <div className="space-y-6">
              {/* Equipped Slots Section */}
              <div>
                <div className="flex items-center justify-between mb-3 text-[10px] text-purple-400/80 uppercase tracking-widest font-bold">
                  <span>Equipamento Ativo</span>
                  <span className={equippedCount >= maxSlots ? 'text-orange-400' : ''}>
                    {equippedCount} / {maxSlots} USADOS
                  </span>
                </div>
                <div className="flex gap-3">
                  {Array.from({ length: maxSlots }).map((_, i) => {
                    const equipped = inventory.owned.filter(a => a.equipped);
                    const amulet = equipped[i];
                    const def = amulet ? getAmuletDef(amulet.defId) : null;

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center rounded-lg relative overflow-hidden group shadow-inner"
                        style={{
                          width: 48,
                          height: 48,
                          background: amulet ? 'rgba(106, 13, 173, 0.15)' : 'rgba(15, 20, 30, 0.6)',
                          border: `1px solid ${amulet ? 'rgba(172, 77, 255, 0.4)' : 'rgba(40, 50, 80, 0.4)'}`,
                        }}
                      >
                        {def ? (
                          <>
                            <span className="text-2xl z-10">{def.icon}</span>
                            <div className="absolute inset-0 bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </>
                        ) : (
                          <span className="text-slate-700 text-xl font-thin">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Owned List */}
              <div>
                <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Sua Coleção</h3>
                {inventory.owned.length === 0 ? (
                  <div className="text-center py-10 bg-slate-900/20 rounded-lg border border-slate-800/40">
                    <div className="text-2xl opacity-20 mb-2">💎</div>
                    <div className="text-xs text-slate-600">Nenhum amuleto encontrado nos andares.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
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
                          className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left relative overflow-hidden group ${isEquipped
                            ? 'bg-purple-600/10 border-purple-500/40'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                            }`}
                          style={{
                            opacity: canEquip || isEquipped ? 1 : 0.4,
                            transform: isFlashing ? 'scale(0.98)' : 'scale(1)',
                          }}
                        >
                          {/* Inner glow for equipped */}
                          {isEquipped && <div className="absolute inset-0 bg-purple-500/5 pulse-subtle" />}

                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-lg z-10 ${isEquipped ? 'bg-purple-600/20 border border-purple-400/30' : 'bg-slate-800/80 border border-slate-700'
                            }`}>
                            <span className="text-xl">{def.icon}</span>
                          </div>

                          <div className="flex-1 min-w-0 z-10">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-bold uppercase tracking-wide ${isEquipped ? 'text-purple-300' : 'text-slate-400'}`}>
                                {def.name}
                              </span>
                              {isEquipped && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded uppercase font-bold tracking-tighter">
                                  Equipado
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed m-0">
                              {def.description}
                            </p>
                          </div>

                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isEquipped ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-slate-800 border-slate-700 text-transparent'
                            }`}>
                            <span className="text-xs">✓</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'consumables' && (
            <div className="space-y-4">
              {!inventory.consumables || inventory.consumables.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/20 rounded-lg border border-slate-800/40">
                  <div className="text-2xl opacity-20 mb-2">🧪</div>
                  <div className="text-xs text-slate-600">Nenhum consumível no inventário.</div>
                </div>
              ) : (
                inventory.consumables.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleConsumable(item.id)}
                    className={`w-full p-4 rounded-xl border flex items-center gap-5 transition-all text-left relative overflow-hidden group ${item.equipped ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      }`}
                  >
                    {item.equipped && <div className="absolute inset-0 bg-emerald-500/5 pulse-subtle" />}

                    <div className="relative z-10">
                      <div className={`w-14 h-14 flex items-center justify-center rounded-2xl relative shadow-lg transition-all ${item.equipped ? 'bg-emerald-900/40 border-2 border-emerald-400/40' : 'bg-slate-800 border border-slate-700'
                        }`}>
                        <span className="text-3xl">{item.id === 'potion_refill' ? '🧪' : '📦'}</span>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded shadow-lg">
                          {item.quantity}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 z-10">
                      <h3 className={`font-bold text-sm m-0 flex items-center gap-2 ${item.equipped ? 'text-emerald-100' : 'text-slate-300'}`}>
                        {item.id === 'potion_refill' ? 'Elixir de Vida' : 'Item Desconhecido'}
                        {item.equipped && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-black">EQUIPADO [Q]</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1 mb-0 italic">Clique para equipar no slot de atalho.</p>
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${item.equipped ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-transparent'
                      }`}>
                      <span className="text-xs">✓</span>
                    </div>
                  </button>
                ))
              )}

              {/* Utility Info */}
              <div className="p-3 bg-purple-900/10 border border-purple-500/10 rounded-lg flex items-start gap-3 mt-4">
                <span className="text-lg mt-0.5">💡</span>
                <div>
                  <div className="text-[11px] font-bold text-purple-300 uppercase mb-0.5">Dicas</div>
                  <p className="text-[10px] text-purple-400/60 leading-tight m-0 italic">
                    Use <span className="text-white font-bold">Q</span> em combate para consumir o item equipado. A Alquimista vende elixires.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(106, 13, 173, 0.15)', background: 'rgba(15, 10, 25, 0.4)' }}
        >
          <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">
            Sistema de Amuletos v2.5 // Bio-Glow Engine
          </div>

          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all font-bold text-[11px] uppercase tracking-widest shadow-lg"
          >
            Sair do Menu [I]
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(106, 13, 173, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(106, 13, 173, 0.4); }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.1; }
        }
        .pulse-subtle { animation: pulse-subtle 3s infinite ease-in-out; }

        @keyframes pulse-heavy {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .pulse-heavy { animation: pulse-heavy 4s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default AmuletInventoryOverlay;

