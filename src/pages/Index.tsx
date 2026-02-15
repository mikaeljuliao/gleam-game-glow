import { useState, useRef, useCallback, useEffect } from 'react';
import TitleScreen from '@/components/TitleScreen';
import GameCanvas from '@/components/GameCanvas';
import UpgradeSelection from '@/components/UpgradeSelection';
import GameOverScreen from '@/components/GameOverScreen';
import ShopOverlay from '@/components/ShopOverlay';
import AmuletInventoryOverlay from '@/components/AmuletInventory';
import CartographerMap from '@/components/CartographerMap';
import { GameEngine } from '@/game/engine';
import { initAudio } from '@/game/audio';
import { Upgrade, Synergy, GameStats, ShopItem, DungeonMap } from '@/game/types';
import { hasSave, clearSave } from '@/game/save';
import { AmuletInventory, createAmuletInventory, addAmulet, toggleEquip, getAmuletDef, isAmuletEquipped } from '@/game/amulets';

type GameState = 'title' | 'playing' | 'upgrading' | 'gameOver' | 'shopping' | 'inventory' | 'cartographer';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('title');
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [synergyNotif, setSynergyNotif] = useState<string | null>(null);
  const [floorNotif, setFloorNotif] = useState<string | null>(null);
  const [amuletNotif, setAmuletNotif] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [loadSave, setLoadSave] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopCoins, setShopCoins] = useState(0);
  const [amuletInv, setAmuletInv] = useState<AmuletInventory>(createAmuletInventory());
  const [prevGameState, setPrevGameState] = useState<GameState>('playing');
  const [cartoDungeon, setCartoDungeon] = useState<DungeonMap | null>(null);

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
    setAmuletInv(createAmuletInventory());
  }, []);

  const handleStartFloor = useCallback((floor: number) => {
    initAudio();
    setLoadSave(false);
    setDevFloor(floor);
    setGameState('playing');
    setGameStats(null);
    setGameKey(k => k + 1);
    setAmuletInv(createAmuletInventory());
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

  const handleShopOpen = useCallback((items: ShopItem[], souls: number) => {
    setShopItems(items);
    setShopCoins(souls);
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
      setShopCoins(engine.player.souls);
      setShopItems(prev => prev.map((item, i) => i === index ? { ...item, sold: true } : item));
    }
  }, []);

  const handleAmuletDrop = useCallback((amuletId: string) => {
    const engine = engineRef.current;
    if (engine) {
      addAmulet(engine.amuletInventory, amuletId);
      setAmuletInv({ ...engine.amuletInventory, owned: [...engine.amuletInventory.owned] });
    }
    const def = getAmuletDef(amuletId);
    if (def) {
      setAmuletNotif(`🔮 Amuleto obtido: ${def.icon} ${def.name}`);
      setTimeout(() => setAmuletNotif(null), 4000);
    }
  }, []);

  const handleInventoryOpen = useCallback(() => {
    setGameState(prev => {
      setPrevGameState(prev);
      return 'inventory';
    });
  }, []);

  const handleInventoryClose = useCallback(() => {
    setGameState('playing');
    engineRef.current?.resume();
  }, []);

  const handleToggleEquip = useCallback((defId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    toggleEquip(engine.amuletInventory, defId, engine.player);
    setAmuletInv({ ...engine.amuletInventory, owned: engine.amuletInventory.owned.map(a => ({ ...a })) });
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

  // Keyboard shortcut for inventory and cartographer map
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'i') {
        if (gameState === 'inventory') {
          handleInventoryClose();
        } else if (gameState === 'playing') {
          engineRef.current?.pause();
          handleInventoryOpen();
        }
      }
      if (key === 'm') {
        if (gameState === 'cartographer') {
          setGameState('playing');
          engineRef.current?.resume();
        } else if (gameState === 'playing') {
          const engine = engineRef.current;
          if (engine && isAmuletEquipped(engine.amuletInventory, 'cartographer')) {
            engine.pause();
            setCartoDungeon(engine.dungeon);
            setGameState('cartographer');
          }
        }
      }
      if (key === 't' && gameState === 'playing') {
        const engine = engineRef.current;
        if (engine) {
          engine.trySanctuaryHeal();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleInventoryOpen, handleInventoryClose]);

  const handleCartoClose = useCallback(() => {
    setGameState('playing');
    engineRef.current?.resume();
  }, []);

  const isGameActive = gameState === 'playing' || gameState === 'upgrading' || gameState === 'shopping' || gameState === 'inventory' || gameState === 'cartographer';

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: '#000' }}>
      {gameState === 'title' && (
        <TitleScreen onStart={handleStart} onStartFloor={handleStartFloor} hasSave={hasSave()} />
      )}

      {isGameActive && (
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
              onAmuletDrop={handleAmuletDrop}
              onInventoryOpen={handleInventoryOpen}
              onInventoryClose={handleInventoryClose}
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
            {gameState === 'inventory' && (
              <AmuletInventoryOverlay
                inventory={amuletInv}
                souls={engineRef.current?.player.souls ?? 0}
                onToggleEquip={handleToggleEquip}
                onClose={handleInventoryClose}
              />
            )}
            {gameState === 'cartographer' && cartoDungeon && (
              <CartographerMap
                dungeon={cartoDungeon}
                onClose={handleCartoClose}
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
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  letterSpacing: '0.1em',
                  animation: 'fadeIn 0.3s ease-out',
                  transform: 'translateX(-50%)',
                }}
              >
                {floorNotif}
              </div>
            )}
            {amuletNotif && (
              <div
                className="absolute top-28 left-1/2 z-30 px-6 py-2 rounded border pointer-events-none"
                style={{
                  background: 'rgba(80, 40, 140, 0.4)',
                  borderColor: '#8855cc',
                  color: '#ddbbff',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '0.05em',
                  animation: 'fadeIn 0.3s ease-out',
                  transform: 'translateX(-50%)',
                }}
              >
                {amuletNotif}
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
