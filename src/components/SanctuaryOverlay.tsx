import { useState, useEffect } from 'react';
import { SFX } from '@/game/audio';

interface SanctuaryOverlayProps {
    souls: number;
    hp: number;
    maxHp: number;
    floor: number;
    onHeal: () => boolean;
    onClose: () => void;
}

const SanctuaryOverlay = ({ souls, hp, maxHp, floor, onHeal, onClose }: SanctuaryOverlayProps) => {
    const [currentSouls, setCurrentSouls] = useState(souls);
    const [currentHp, setCurrentHp] = useState(hp);
    const [isHealing, setIsHealing] = useState(false);
    const healCost = 50 + floor * 10;
    const canHeal = currentSouls >= healCost && currentHp < maxHp;

    const handleHeal = () => {
        if (!canHeal || isHealing) return;

        setIsHealing(true);
        const success = onHeal();

        if (success) {
            SFX.uiClose();
            onClose();
        }
    };

    const hpPercent = (currentHp / maxHp) * 100;

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{
                background: 'radial-gradient(circle, rgba(10, 5, 20, 0.9) 0%, rgba(5, 2, 10, 0.98) 100%)',
                backdropFilter: 'blur(8px)'
            }}
        >
            <div
                className="relative max-w-lg w-full p-8 rounded-2xl border flex flex-col items-center gap-8"
                style={{
                    background: 'rgba(25, 15, 50, 0.6)',
                    borderColor: 'rgba(120, 100, 240, 0.4)',
                    boxShadow: '0 0 60px rgba(80, 60, 180, 0.3)',
                    backdropFilter: 'blur(12px)'
                }}
            >
                {/* Header */}
                <div className="flex flex-col items-center gap-2">
                    <div
                        className="w-16 h-16 flex items-center justify-center rounded-full mb-2"
                        style={{
                            background: 'rgba(106, 13, 173, 0.1)',
                            border: '2px solid rgba(172, 77, 255, 0.3)',
                            boxShadow: '0 0 20px rgba(106, 13, 173, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: 32 }}>✦</span>
                    </div>
                    <h2
                        style={{
                            color: '#ccaaee',
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: 24,
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            textShadow: '0 0 10px rgba(172, 77, 255, 0.5)'
                        }}
                    >
                        Santuário
                    </h2>
                    <p style={{ color: '#7080aa', fontSize: 13, fontStyle: 'italic' }}>"Recupere sua essência nas sombras"</p>
                </div>

                {/* Stats Grid */}
                <div className="w-full grid grid-cols-2 gap-6">
                    {/* Life Bar */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-end px-1">
                            <span style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vitalidade</span>
                            <span style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>{Math.ceil(currentHp)} / {maxHp}</span>
                        </div>
                        <div className="h-4 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                            <div
                                className="h-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${hpPercent}%`,
                                    background: 'linear-gradient(90deg, #331122 0%, #aa4466 100%)',
                                    boxShadow: '0 0 10px rgba(170, 68, 102, 0.3)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Souls Stat */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-end px-1">
                            <span style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Almas</span>
                            <span style={{ color: '#ac4dff', fontSize: 13, fontWeight: 600 }}>{currentSouls}</span>
                        </div>
                        <div className="h-4 w-full bg-black/40 rounded-full border border-white/5 flex items-center px-1">
                            <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, (currentSouls / healCost) * 100)}%`,
                                    background: '#6a0dad',
                                    boxShadow: '0 0 8px rgba(106, 13, 173, 0.4)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="w-full flex flex-col gap-4 mt-4">
                    <button
                        onClick={handleHeal}
                        disabled={!canHeal || isHealing}
                        className="w-full py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                        style={{
                            background: canHeal
                                ? 'linear-gradient(180deg, rgba(106, 13, 173, 0.15) 0%, rgba(60, 20, 100, 0.25) 100%)'
                                : 'rgba(30, 30, 40, 0.2)',
                            border: `1px solid ${canHeal ? 'rgba(172, 77, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                            color: canHeal ? '#ccaaee' : '#555',
                            cursor: canHeal && !isHealing ? 'pointer' : 'not-allowed',
                            opacity: isHealing ? 0.6 : 1,
                            transform: canHeal && !isHealing ? 'scale(1)' : 'scale(0.98)'
                        }}
                    >
                        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>
                            {isHealing ? 'CANALIZANDO...' : 'RELAXAR NO SANTUÁRIO'}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>
                            Custo: <span style={{ color: currentSouls >= healCost ? '#ac4dff' : '#ff6666' }}>{healCost} Almas</span>
                        </span>
                    </button>

                    <button
                        onClick={() => { SFX.uiClose(); onClose(); }}
                        className="w-full py-3 rounded-lg text-white/40 hover:text-white/70 transition-colors text-xs uppercase tracking-[0.2em]"
                    >
                        Retornar às Sombras
                    </button>
                </div>

                {/* Atmospheric Embers */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-30">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                filter: 'blur(1px)',
                                animationDuration: `${2 + Math.random() * 3}s`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SanctuaryOverlay;
