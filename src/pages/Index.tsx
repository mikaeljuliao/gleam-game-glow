import { useState, useRef, useCallback, useEffect } from 'react';
import TitleScreen from '@/components/TitleScreen';
import GameCanvas from '@/components/GameCanvas';
import UpgradeSelection from '@/components/UpgradeSelection';
import GameOverScreen from '@/components/GameOverScreen';
import ShopOverlay from '@/components/ShopOverlay';
import { GameEngine } from '@/game/engine';
import { initAudio } from '@/game/audio';
import { Upgrade, Synergy, GameStats, ShopItem } from '@/game/types';
import { hasSave, clearSave } from '@/game/save';

type GameState = 'title' | 'playing' | 'upgrading' | 'gameOver' | 'shopping';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('title');
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [synergyNotif, setSynergyNotif] = useState<string | null>(null);
  const [floorNotif, setFloorNotif] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [loadSave, setLoadSave] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopCoins, setShopCoins] = useState(0);

  useEffect(() => {
    document.title = 'Dungeon of Shadows';
  }, []);

  const [devFloor, setDevFloor] = useState<number | null>(null);

  const handleStart = useCallback((continueGame = false) => {
    initAudio();
    setLoadSave(continueGame);
    setDevFloor(null);
    setGameState('playing');
    setGameStats(null);
    setGameKey(k => k + 1);
  }, []);

  const handleStartFloor = useCallback((floor: number) => {
    initAudio();
    setLoadSave(false);
    setDevFloor(floor);
    setGameState('playing');
    setGameStats(null);
    setGameKey(k => k + 1);
  }, []);

  const handleLevelUp = useCallback((choices: Upgrade[]) => {
    setUpgradeChoices(choices);
    setGameState('upgrading');
  }, []);

  const handleUpgradeSelect = useCallback((upgrade: Upgrade) => {
    engineRef.current?.applyUpgrade(upgrade);
    setGameState('playing');
  }, []);

  const handleGameOver = useCallback((stats: GameStats) => {
    setGameStats(stats);
    setGameState('gameOver');
  }, []);

  const handleSynergy = useCallback((synergy: Synergy) => {
    setSynergyNotif(`🔗 ${synergy.name}: ${synergy.description}`);
    setTimeout(() => setSynergyNotif(null), 3000);
  }, []);

  const handleFloorChange = useCallback((floor: number) => {
    setFloorNotif(`⬆️ Andar ${floor}`);
    setTimeout(() => setFloorNotif(null), 2500);
  }, []);

  const handleShopOpen = useCallback((items: ShopItem[], coins: number) => {
    setShopItems(items);
    setShopCoins(coins);
    setGameState('shopping');
  }, []);

  const handleShopClose = useCallback(() => {
    setGameState('playing');
    engineRef.current?.closeShop();
  }, []);

  const handleShopBuy = useCallback((index: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const success = engine.buyShopItem(index);
    if (success) {
      // Update local state
      setShopCoins(engine.player.coins);
      setShopItems(prev => prev.map((item, i) => i === index ? { ...item, sold: true } : item));
    }
  }, []);

  const handleRestart = useCallback(() => {
    setGameState('title');
  }, []);

  // When engine mounts, try to load save if requested
  useEffect(() => {
    if (loadSave && engineRef.current) {
      engineRef.current.loadFromSave();
      setLoadSave(false);
    }
    if (devFloor && engineRef.current) {
      engineRef.current.startAtFloor(devFloor);
      setDevFloor(null);
    }
  }, [loadSave, devFloor, gameKey]);

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: '#000' }}>
      {gameState === 'title' && (
        <TitleScreen onStart={handleStart} onStartFloor={handleStartFloor} hasSave={hasSave()} />
      )}

      {(gameState === 'playing' || gameState === 'upgrading' || gameState === 'shopping') && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="relative w-full h-[64vh] md:h-full">
            <GameCanvas
              key={gameKey}
              onLevelUp={handleLevelUp}
              onGameOver={handleGameOver}
              onSynergyActivated={handleSynergy}
              onFloorChange={handleFloorChange}
              onShopOpen={handleShopOpen}
              onShopClose={handleShopClose}
              engineRef={engineRef}
            />
            {gameState === 'upgrading' && upgradeChoices.length > 0 && (
              <UpgradeSelection
                choices={upgradeChoices}
                onSelect={handleUpgradeSelect}
              />
            )}
            {gameState === 'shopping' && shopItems.length > 0 && (
              <ShopOverlay
                items={shopItems}
                coins={shopCoins}
                onBuy={handleShopBuy}
                onClose={handleShopClose}
              />
            )}
            {synergyNotif && (
              <div
                className="absolute top-4 left-1/2 z-30 px-6 py-2 rounded border pointer-events-none"
                style={{
                  background: 'rgba(100, 50, 200, 0.35)',
                  borderColor: '#7744aa',
                  color: '#ccaaee',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  letterSpacing: '0.05em',
                  animation: 'fadeIn 0.3s ease-out',
                  transform: 'translateX(-50%)',
                }}
              >
                {synergyNotif}
              </div>
            )}
            {floorNotif && (
              <div
                className="absolute top-16 left-1/2 z-30 px-8 py-3 rounded border pointer-events-none"
                style={{
                  background: 'rgba(180, 130, 50, 0.25)',
                  borderColor: '#997733',
                  color: '#ddc088',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '18px',
                  letterSpacing: '0.1em',
                  animation: 'fadeIn 0.3s ease-out',
                  transform: 'translateX(-50%)',
                }}
              >
                {floorNotif}
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'gameOver' && gameStats && (
        <GameOverScreen stats={gameStats} onRestart={handleRestart} />
      )}
    </div>
  );
};

export default Index;
