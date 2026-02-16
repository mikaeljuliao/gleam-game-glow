import { useState, useEffect } from 'react';
import { SFX, setMasterVolume, getMasterVolume } from '@/game/audio';
import { getBrightness, setBrightness } from '@/game/brightness'; // Assuming these exist from previous code context
import MenuButton from './MenuButton';
import BrightnessSettings from '../BrightnessSettings'; // Reusing existing component for the modal

interface SettingsScreenProps {
    onBack: () => void;
}

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
    const [volume, setVolume] = useState(getMasterVolume());
    const [showBrightnessModal, setShowBrightnessModal] = useState(false);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        setMasterVolume(v);
    };

    // Play a sound when volume changes (debounced slightly by user drag, but good for feedback)
    const handleVolumeCommit = () => {
        SFX.uiOpen();
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                    ←
                </button>
                <h2 className="text-3xl font-cinzel text-white tracking-widest">
                    CONFIGURAÇÕES
                </h2>
            </div>

            <div className="grid gap-8">

                {/* Audio Section */}
                <section className="bg-black/20 p-6 rounded-lg border border-white/5">
                    <h3 className="text-xl font-cinzel text-purple-200 mb-6 flex items-center gap-2">
                        🔊 Áudio
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-gray-400 font-mono text-sm">VOLUME GERAL</label>
                            <span className="text-purple-400 font-mono">{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            onMouseUp={handleVolumeCommit}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                </section>

                {/* Video Section */}
                <section className="bg-black/20 p-6 rounded-lg border border-white/5">
                    <h3 className="text-xl font-cinzel text-yellow-200 mb-6 flex items-center gap-2">
                        👁️ Vídeo
                    </h3>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-gray-300 font-medium">Calibrar Brilho</div>
                            <div className="text-gray-500 text-sm mt-1">Ajuste o gama para monitores escuros</div>
                        </div>
                        <button
                            onClick={() => setShowBrightnessModal(true)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all text-sm font-mono text-yellow-100"
                        >
                            AJUSTAR
                        </button>
                    </div>
                </section>

            </div>

            <div className="mt-12 flex justify-end">
                <MenuButton onClick={onBack} className="max-w-[200px]" variant="secondary">
                    VOLTAR
                </MenuButton>
            </div>

            {/* Brightness Modal Overlay */}
            <BrightnessSettings open={showBrightnessModal} onClose={() => setShowBrightnessModal(false)} />
        </div>
    );
};

export default SettingsScreen;
