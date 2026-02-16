
import MenuButton from './MenuButton';

interface CreditsScreenProps {
    onBack: () => void;
}

const CreditsScreen = ({ onBack }: CreditsScreenProps) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-700">

            <h2 className="text-4xl font-cinzel text-white mb-16 tracking-widest drop-shadow-lg">
                CRÉDITOS
            </h2>

            <div className="space-y-12 text-center max-w-2xl px-6">

                <div className="space-y-2">
                    <h3 className="text-purple-400 font-mono text-sm uppercase tracking-widest">Created By</h3>
                    <p className="text-3xl font-cinzel text-white">Nathanael</p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-purple-400 font-mono text-sm uppercase tracking-widest">Development</h3>
                    <p className="text-xl font-cinzel text-gray-300">Gleam Game Glow Studios</p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-purple-400 font-mono text-sm uppercase tracking-widest">Assets</h3>
                    <p className="text-lg font-cinzel text-gray-400">
                        Procedural Generation Engine
                    </p>
                </div>

            </div>

            <div className="mt-20">
                <MenuButton onClick={onBack} variant="secondary">
                    VOLTAR
                </MenuButton>
            </div>

        </div>
    );
};

export default CreditsScreen;
