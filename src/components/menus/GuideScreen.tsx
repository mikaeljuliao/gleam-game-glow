import { Skull, Swords, Map, Crown, Flame, HeartCrack, Zap, Shield, Eye, Book } from 'lucide-react';
import MenuButton from './MenuButton';

interface GuideScreenProps {
    onBack: () => void;
}

const GuideScreen = ({ onBack }: GuideScreenProps) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-start py-6 px-6 animate-in slide-in-from-bottom duration-700 overflow-y-auto">

            {/* Epic Header */}
            <div className="text-center mb-8 relative">
                <div className="absolute inset-0 bg-purple-600/20 blur-3xl rounded-full animate-pulse-slow" />
                <h2 className="text-5xl md:text-6xl font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-red-200 via-purple-300 to-red-500 tracking-widest drop-shadow-lg relative flex items-center justify-center gap-4">
                    <Book className="w-10 h-10 text-purple-400" />
                    GUIA DO ABISMO
                </h2>
                <p className="text-purple-300/60 font-cinzel text-sm tracking-[0.3em] mt-2">SOBREVIVA • CONQUISTE • TRANSCENDA</p>
            </div>

            {/* Two Column Layout */}
            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* LEFT COLUMN */}
                <div className="space-y-6">

                    {/* The Calling */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-purple-950/30 backdrop-blur-md border-2 border-purple-500/40 rounded-xl p-6 shadow-2xl hover:border-purple-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <Skull className="w-7 h-7 text-red-400" />
                                <h3 className="text-3xl font-cinzel text-red-300">O Chamado</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed mb-3 text-base">
                                Você foi arrastado para as <span className="text-purple-400 font-semibold">Masmorras das Sombras</span>,
                                um reino onde a morte é apenas o começo. Cada descida o leva mais fundo no abismo,
                                onde criaturas ancestrais aguardam nas trevas.
                            </p>
                            <p className="text-red-300/80 text-sm italic border-l-4 border-red-500/50 pl-3">
                                Sua missão: sobreviver o máximo possível, colher almas e desvendar os segredos sepultados nas profundezas.
                            </p>
                        </div>
                    </div>

                    {/* Combat System */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-red-950/30 backdrop-blur-md border-2 border-red-500/40 rounded-xl p-6 shadow-2xl hover:border-red-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <Swords className="w-7 h-7 text-red-400" />
                                <h3 className="text-3xl font-cinzel text-red-300">Arsenal & Combate</h3>
                            </div>

                            {/* Controls Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-black/40 border border-red-800/30 rounded-lg p-3 hover:border-red-500/50 transition-colors">
                                    <kbd className="text-xs font-mono text-red-300 bg-gray-900 px-2 py-1 rounded border border-red-700/50">W A S D</kbd>
                                    <p className="text-gray-400 text-xs mt-1">Movimento</p>
                                </div>
                                <div className="bg-black/40 border border-red-800/30 rounded-lg p-3 hover:border-red-500/50 transition-colors">
                                    <kbd className="text-xs font-mono text-red-300 bg-gray-900 px-2 py-1 rounded border border-red-700/50">MOUSE</kbd>
                                    <p className="text-gray-400 text-xs mt-1">Mirar</p>
                                </div>
                                <div className="bg-black/40 border border-red-800/30 rounded-lg p-3 hover:border-red-500/50 transition-colors">
                                    <kbd className="text-xs font-mono text-red-300 bg-gray-900 px-2 py-1 rounded border border-red-700/50">CLICK</kbd>
                                    <p className="text-gray-400 text-xs mt-1">Atacar</p>
                                </div>
                                <div className="bg-black/40 border border-red-800/30 rounded-lg p-3 hover:border-red-500/50 transition-colors">
                                    <kbd className="text-xs font-mono text-red-300 bg-gray-900 px-2 py-1 rounded border border-red-700/50">SPACE</kbd>
                                    <p className="text-gray-400 text-xs mt-1">Habilidade</p>
                                </div>
                            </div>

                            <p className="text-gray-400 text-sm leading-relaxed">
                                Domine a arte do combate corpo-a-corpo e à distância.
                                Cada inimigo possui padrões únicos — <span className="text-red-400">aprenda, adapte-se ou pereça</span>.
                            </p>
                        </div>
                    </div>

                    {/* Exploration */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-blue-950/30 backdrop-blur-md border-2 border-blue-500/40 rounded-xl p-6 shadow-2xl hover:border-blue-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/0 via-blue-600/20 to-blue-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <Map className="w-7 h-7 text-blue-400" />
                                <h3 className="text-3xl font-cinzel text-blue-300">Exploração</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-base mb-3">
                                As masmorras são <span className="text-blue-400 font-semibold">infinitas e procedurais</span>.
                                Cada andar é único, repleto de armadilhas mortais, santuários místicos e tesouros ocultos.
                            </p>
                            <div className="bg-black/30 border-l-4 border-blue-500/60 p-3 rounded">
                                <p className="text-blue-200 text-sm flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    <span>Pressione <kbd className="px-2 py-0.5 bg-gray-900 border border-blue-700/50 rounded text-xs font-mono">E</kbd> para interagir com objetos e portais</span>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">

                    {/* Souls System */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-cyan-950/30 backdrop-blur-md border-2 border-cyan-500/40 rounded-xl p-6 shadow-2xl hover:border-cyan-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/0 via-cyan-600/20 to-cyan-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <Flame className="w-7 h-7 text-cyan-400" />
                                <h3 className="text-3xl font-cinzel text-cyan-300">Almas</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed mb-3 text-base">
                                Cada inimigo derrotado libera sua <span className="text-cyan-400 font-semibold">essência vital</span>.
                                As almas são a moeda do abismo — use-as com sabedoria.
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2 text-gray-300">
                                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-cyan-300">Comprar itens</strong> em lojas místicas espalhadas pelas masmorras</span>
                                </li>
                                <li className="flex items-start gap-2 text-gray-300">
                                    <HeartCrack className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-cyan-300">Curar ferimentos</strong> em santuários (custo aumenta a cada uso)</span>
                                </li>
                                <li className="flex items-start gap-2 text-gray-300">
                                    <Crown className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-cyan-300">Desbloquear ranks</strong> acumulando almas entre partidas</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Amulets */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-purple-950/30 backdrop-blur-md border-2 border-purple-500/40 rounded-xl p-6 shadow-2xl hover:border-purple-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="text-3xl">🔮</div>
                                <h3 className="text-3xl font-cinzel text-purple-300">Amuletos Ancestrais</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed mb-4 text-base">
                                Relíquias poderosas que <span className="text-purple-400 font-semibold">definem seu estilo de jogo</span>.
                                Derrotar chefes pode revelar amuletos lendários.
                            </p>

                            <div className="space-y-2">
                                <div className="bg-black/30 border border-purple-700/30 rounded-lg p-3 hover:border-purple-500/50 transition-colors">
                                    <p className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                                        <span className="text-lg">🗺️</span> Cartógrafo
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Revela todo o mapa do andar atual</p>
                                </div>
                                <div className="bg-black/30 border border-purple-700/30 rounded-lg p-3 hover:border-purple-500/50 transition-colors">
                                    <p className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                                        <span className="text-lg">🩸</span> Coletor de Almas
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Mais almas = mais poder e velocidade</p>
                                </div>
                                <div className="bg-black/30 border border-purple-700/30 rounded-lg p-3 hover:border-purple-500/50 transition-colors">
                                    <p className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                                        <span className="text-lg">⚡</span> Ritmo de Guerra
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Abates consecutivos aceleram ataques</p>
                                </div>
                            </div>

                            <p className="text-purple-300/70 text-xs mt-3 italic border-t border-purple-800/30 pt-3">
                                Equipe até 4 amuletos simultaneamente. Escolha sua build.
                            </p>
                        </div>
                    </div>

                    {/* Survival Tips */}
                    <div className="group relative bg-gradient-to-br from-black/60 to-orange-950/30 backdrop-blur-md border-2 border-orange-500/40 rounded-xl p-6 shadow-2xl hover:border-orange-400/60 transition-all duration-500">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/0 via-orange-600/20 to-orange-600/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-7 h-7 text-orange-400" />
                                <h3 className="text-3xl font-cinzel text-orange-300">Mandamentos da Sobrevivência</h3>
                            </div>
                            <ul className="space-y-2.5 text-sm">
                                <li className="flex items-start gap-2.5 text-gray-300 hover:text-orange-200 transition-colors">
                                    <span className="text-orange-400 font-bold text-lg mt-[-2px]">▸</span>
                                    <span><strong>Nunca pare de se mover</strong> — inimigos cercam os imprudentes</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-gray-300 hover:text-orange-200 transition-colors">
                                    <span className="text-orange-400 font-bold text-lg mt-[-2px]">▸</span>
                                    <span><strong>Priorize ameaças</strong> — elimine os perigos maiores primeiro</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-gray-300 hover:text-orange-200 transition-colors">
                                    <span className="text-orange-400 font-bold text-lg mt-[-2px]">▸</span>
                                    <span><strong>Explore cada canto</strong> — tesouros e santuários estão escondidos</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-gray-300 hover:text-orange-200 transition-colors">
                                    <span className="text-orange-400 font-bold text-lg mt-[-2px]">▸</span>
                                    <span><strong>Estude padrões de bosses</strong> — cada um tem fraquezas únicas</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-gray-300 hover:text-orange-200 transition-colors">
                                    <span className="text-orange-400 font-bold text-lg mt-[-2px]">▸</span>
                                    <span><strong>Gerencie suas almas</strong> — morrer significa perdê-las todas</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* Epic Footer Quote */}
            <div className="max-w-3xl text-center mb-6 px-4">
                <div className="relative bg-gradient-to-r from-transparent via-red-950/40 to-transparent border-y border-red-500/30 py-4">
                    <p className="text-red-200/80 font-cinzel text-lg italic tracking-wide">
                        "Nas profundezas, somente os fortes sobrevivem.<br />Os fracos alimentam a escuridão."
                    </p>
                    <p className="text-purple-400/50 text-xs mt-2 tracking-widest">— CRÔNICAS DO ABISMO</p>
                </div>
            </div>

            {/* Back Button */}
            <div className="mt-4 mb-6">
                <MenuButton onClick={onBack} variant="secondary">
                    VOLTAR AO MENU
                </MenuButton>
            </div>

        </div>
    );
};

export default GuideScreen;
