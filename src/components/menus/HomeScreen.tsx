import { SFX } from '@/game/audio';
import MenuButton from './MenuButton';

interface HomeScreenProps {
    onStart: (continueGame?: boolean) => void;
    onNavigate: (screen: string) => void;
    onOpenDevMenu?: () => void;
    hasSave: boolean;
}

const HomeScreen = ({ onStart, onNavigate, onOpenDevMenu, hasSave }: HomeScreenProps) => {
    return (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">

            {/* Game Title - Enhanced */}
            <div className="text-center mb-12 relative group cursor-default">
                <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full transform scale-150 animate-pulse-slow pointer-events-none" />
                <h1 className="text-6xl md:text-8xl font-black tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-b from-red-100 to-red-950 drop-shadow-[0_0_15px_rgba(200,50,50,0.5)] font-cinzel">
                    DUNGEON
                </h1>
                <h2 className="text-2xl md:text-3xl font-light tracking-[0.5em] text-purple-300/80 mt-2 font-cinzel">
                    OF SHADOWS
                </h2>
            </div>

            {/* Main Navigation */}
            <div className="w-full max-w-md flex flex-col gap-3 z-10">
                {hasSave && (
                    <MenuButton
                        onClick={() => onStart(true)}
                        variant="primary"
                        className="border-l-4 border-l-green-500/50"
                    >
                        CONTINUAR JOGO
                    </MenuButton>
                )}

                <MenuButton
                    onClick={() => onStart(false)}
                    variant="primary"
                >
                    NOVO JOGO
                </MenuButton>

                <div className="h-4" /> {/* Spacer */}

                <MenuButton
                    onClick={() => onNavigate('rank')}
                    variant="secondary"
                >
                    RANKS E CONQUISTAS
                </MenuButton>

                <MenuButton
                    onClick={() => onNavigate('settings')}
                    variant="secondary"
                >
                    CONFIGURAÇÕES
                </MenuButton>

                <MenuButton
                    onClick={() => onNavigate('guide')}
                    variant="secondary"
                >
                    GUIA
                </MenuButton>
            </div>

            {/* Footer Version */}
            <div
                onClick={onOpenDevMenu}
                className="absolute bottom-4 right-6 text-xs text-gray-600 font-mono cursor-pointer hover:text-gray-400 transition-colors"
            >
                v0.2.0 • EARLY ACCESS
            </div>
        </div>
    );
};

export default HomeScreen;
