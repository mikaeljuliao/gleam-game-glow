import { loadRankData, getRankProgress } from '@/game/rank';
import MenuButton from './MenuButton';

interface RankScreenProps {
    onBack: () => void;
}

const RankScreen = ({ onBack }: RankScreenProps) => {
    const rankData = loadRankData();
    const { current: rank, next, progress } = getRankProgress(rankData.stats.totalSouls);
    const stats = rankData.stats;

    const formatTime = (t: number) => {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">

            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-4xl font-cinzel text-purple-200 tracking-[0.2em] mb-2">
                    SALA DOS ETERNOS
                </h2>
                <div className="h-1 w-24 bg-purple-500/50 mx-auto rounded-full" />
            </div>

            <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl items-stretch">

                {/* Left Column: Rank Card */}
                <div className="flex-1 bg-black/40 border border-purple-500/20 rounded-xl p-8 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />

                    <div className="text-8xl mb-4 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_25px_rgba(160,100,255,0.4)]">
                        {rank.icon}
                    </div>

                    <h3 className="text-2xl font-cinzel text-purple-100 font-bold mb-1 tracking-widest text-center">
                        {rank.name.toUpperCase()}
                    </h3>

                    <p className="text-purple-300/60 italic font-mono text-xs mb-6 text-center max-w-[200px]">
                        "{rank.title}"
                    </p>

                    <div className="w-full bg-gray-900/80 h-4 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                            className="h-full bg-gradient-to-r from-purple-900 via-purple-600 to-purple-400 transition-all duration-1000 ease-out"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between w-full mt-2 text-xs font-mono text-gray-500">
                        <span>{stats.totalSouls} ALMAS</span>
                        {next ? (
                            <span>PRÓXIMO: {next.soulsRequired}</span>
                        ) : (
                            <span className="text-yellow-500">MÁXIMO</span>
                        )}
                    </div>
                </div>

                {/* Right Column: Stats Grid */}
                <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-8 backdrop-blur-md flex flex-col justify-between">
                    <h4 className="text-xl font-cinzel text-gray-400 mb-6 flex items-center gap-2">
                        📜 REGISTROS
                    </h4>

                    <div className="grid grid-cols-1 gap-y-4">
                        <StatRow label="Almas Coletadas" value={stats.totalSouls} icon="👻" />
                        <StatRow label="Inimigos Derrotados" value={stats.totalSouls} icon="⚔️" /> {/* Check if logic matches */}
                        <StatRow label="Bosses Eliminados" value={stats.bossesDefeated} icon="👑" />
                        <StatRow label="Melhor Andar" value={stats.bestFloor} icon="楼" />
                        <StatRow label="Salas Exploradas" value={stats.totalRoomsExplored} icon="🗺️" />
                        <StatRow label="Dano Total" value={Math.floor(stats.totalDamageDealt).toLocaleString()} icon="💥" />
                        <StatRow label="Tempo de Jogo" value={formatTime(stats.totalTimePlayed)} icon="⏳" />
                    </div>
                </div>

            </div>

            <div className="mt-12">
                <MenuButton onClick={onBack} variant="secondary" className="px-12">
                    VOLTAR
                </MenuButton>
            </div>
        </div>
    );
};

const StatRow = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-gray-400 font-mono text-sm flex items-center gap-3">
            <span className="opacity-50">{icon}</span> {label}
        </span>
        <span className="text-purple-100 font-mono font-bold">{value}</span>
    </div>
);

export default RankScreen;
