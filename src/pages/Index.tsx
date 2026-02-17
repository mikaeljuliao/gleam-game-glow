import { useState, useRef, useCallback, useEffect } from 'react';
import TitleScreen from '@/components/TitleScreen';
import GameCanvas from '@/components/GameCanvas';
import UpgradeSelection from '@/components/UpgradeSelection';
import GameOverScreen from '@/components/GameOverScreen';
import ShopOverlay from '@/components/ShopOverlay';
import AmuletInventoryOverlay from '@/components/AmuletInventory';
import CartographerMap from '@/components/CartographerMap';
import AmuletReveal from '@/components/AmuletReveal';
import SanctuaryOverlay from '@/components/SanctuaryOverlay';
import { GameEngine } from '@/game/engine';
import { initAudio, SFX } from '@/game/audio';
import { Upgrade, Synergy, GameStats, ShopItem, DungeonMap } from '@/game/types';
import { hasSave, clearSave } from '@/game/save';
import { AmuletInventory, createAmuletInventory, addAmulet, toggleEquip, getAmuletDef, isAmuletEquipped, addConsumable, toggleEquipConsumable } from '@/game/amulets';

type GameState = 'title' | 'playing' | 'upgrading' | 'gameOver' | 'shopping' | 'inventory' | 'cartographer' | 'amuletReveal' | 'sanctuary';

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
  const [shopType, setShopType] = useState<'normal' | 'potion'>('normal');
  const [amuletInv, setAmuletInv] = useState<AmuletInventory>(createAmuletInventory());
  const [prevGameState, setPrevGameState] = useState<GameState>('playing');
  const [cartoDungeon, setCartoDungeon] = useState<DungeonMap | null>(null);
  const [revealAmuletId, setRevealAmuletId] = useState<string | null>(null);

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
    // If boss room was just cleared, start victory countdown after upgrade selection
    if (engineRef.current && (engineRef.current as any).pendingNextFloor) {
      (engineRef.current as any).startVictoryCountdown();
    }
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

  const handleShopOpen = useCallback((items: ShopItem[], souls: number, type: 'normal' | 'potion' = 'normal') => {
    setShopItems(items);
    setShopCoins(souls);
    setShopType(type);
    SFX.uiOpen();
    setGameState('shopping');
  }, []);

  const handleShopClose = useCallback(() => {
    setGameState('playing');
    engineRef.current?.closeShop();
  }, []);

  const syncInventoryFromEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const inv = engine.amuletInventory;
    setAmuletInv({
      ...inv,
      owned: inv.owned.map(a => ({ ...a })),
      consumables: inv.consumables.map(c => ({ ...c }))
    });
  }, []);

  const handleShopBuy = useCallback((index: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const success = engine.buyShopItem(index);
    if (success) {
      setShopCoins(engine.player.souls);
      setShopItems(prev => prev.map((item, i) => i === index ? { ...item, sold: true } : item));
      // Sync inventory to show purchased amulets/potions
      syncInventoryFromEngine();
    }
  }, [syncInventoryFromEngine]);

  const handleAmuletDrop = useCallback((amuletId: string) => {
    const engine = engineRef.current;
    if (engine) {
      addAmulet(engine.amuletInventory, amuletId);
      syncInventoryFromEngine();
    }
    const def = getAmuletDef(amuletId);
    if (def) {
      setAmuletNotif(`🔮 Amuleto obtido: ${def.icon} ${def.name}`);
      setTimeout(() => setAmuletNotif(null), 4000);
    }
  }, []);

  // Boss kill amulet reveal sequence
  const handleAmuletReveal = useCallback((amuletId: string) => {
    setRevealAmuletId(amuletId);
    setGameState('amuletReveal');
  }, []);

  const handleAmuletRevealComplete = useCallback(() => {
    setRevealAmuletId(null);
    setGameState('playing');
    // Sync amulet inventory from engine → React state
    syncInventoryFromEngine();
    if (engineRef.current) {
      (engineRef.current as any).handleBossLevelUp();
    }
  }, [syncInventoryFromEngine]);

  const handleInventoryOpen = useCallback(() => {
    SFX.uiOpen();
    syncInventoryFromEngine(); // Ensure current data (including depletion from use)
    setGameState(prev => {
      setPrevGameState(prev);
      return 'inventory';
    });
  }, [syncInventoryFromEngine]);

  const handleInventoryClose = useCallback(() => {
    SFX.uiClose();
    setGameState('playing');
    engineRef.current?.resume();
  }, []);

  const handleToggleEquip = useCallback((defId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const wasEquipped = engine.amuletInventory.owned.find(a => a.defId === defId)?.equipped;
    toggleEquip(engine.amuletInventory, defId, engine.player);
    if (wasEquipped) {
      SFX.amuletUnequip();
    } else {
      SFX.amuletEquip();
    }
    setAmuletInv({ ...engine.amuletInventory, owned: engine.amuletInventory.owned.map(a => ({ ...a })), consumables: engine.amuletInventory.consumables.map(c => ({ ...c })) });
  }, []);

  const handleToggleConsumable = useCallback((id: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const wasEquipped = engine.amuletInventory.consumables.find(c => c.id === id)?.equipped;
    toggleEquipConsumable(engine.amuletInventory, id);
    if (!wasEquipped) {
      SFX.amuletEquip(); // Use same sound for now
    }
    setAmuletInv({ ...engine.amuletInventory, owned: engine.amuletInventory.owned.map(a => ({ ...a })), consumables: engine.amuletInventory.consumables.map(c => ({ ...c })) });
  }, []);

  const handleRestart = useCallback(() => {
    setGameState('title');
  }, []);

  const handleOpenMap = useCallback(() => {
    const engine = engineRef.current;
    if (engine && isAmuletEquipped(engine.amuletInventory, 'cartographer')) {
      SFX.mapOpen();
      engine.pause();
      setCartoDungeon(engine.dungeon);
      setGameState('cartographer');
    }
  }, []);

  const handleSanctuaryOpen = useCallback(() => {
    console.log('[INDEX] handleSanctuaryOpen: syncing souls and opening overlay');
    if (engineRef.current) {
      setShopCoins(engineRef.current.player.souls);
    }
    setGameState('sanctuary');
  }, []);

  const handleSanctuaryClose = useCallback(() => {
    setGameState('playing');
    engineRef.current?.closeSanctuary();
  }, []);

  const handleSanctuaryHeal = useCallback(() => {
    console.log('[INDEX] handleSanctuaryHeal triggered');
    const engine = engineRef.current;
    if (!engine) {
      console.error('[INDEX] Engine ref is null during heal!');
      return false;
    }
    const success = engine.performSanctuaryHeal();
    if (success) {
      console.log('[INDEX] Heal ritual initiated in engine, syncing souls...');
      setShopCoins(engine.player.souls);
    }
    return success;
  }, []);

  // When engine mounts, try to load save if requested
  useEffect(() => {
    if (loadSave && engineRef.current) {
      engineRef.current.loadFromSave();
      setLoadSave(false);
    } else if (devFloor && engineRef.current) {
      engineRef.current.startAtFloor(devFloor);
      setDevFloor(null);
    } else if (engineRef.current && !loadSave && !devFloor) {
      // It's a fresh New Game
      engineRef.current.startNewGame();
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
          SFX.mapClose();
          setGameState('playing');
          engineRef.current?.resume();
        } else if (gameState === 'playing') {
          handleOpenMap();
        }
      }
      if (key === 't' && gameState === 'playing') {
        const engine = engineRef.current;
        if (engine) {
          engine.trySanctuaryHeal();
        }
      }
      // [F] key removed — vendor triggers automatically by proximity
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleInventoryOpen, handleInventoryClose, handleOpenMap]);

  const handleCartoClose = useCallback(() => {
    SFX.mapClose();
    setGameState('playing');
    engineRef.current?.resume();
  }, []);

  const isGameActive = gameState === 'playing' || gameState === 'upgrading' || gameState === 'shopping' || gameState === 'inventory' || gameState === 'cartographer' || gameState === 'amuletReveal' || gameState === 'sanctuary';

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
              onAmuletReveal={handleAmuletReveal}
              onOpenMap={handleOpenMap}
              onSanctuaryOpen={handleSanctuaryOpen}
              onSanctuaryClose={handleSanctuaryClose}
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
                shopType={shopType}
                onBuy={handleShopBuy}
                onClose={handleShopClose}
              />
            )}
            {gameState === 'inventory' && (
              <AmuletInventoryOverlay
                inventory={amuletInv}
                souls={engineRef.current?.player.souls ?? 0}
                onToggleEquip={handleToggleEquip}
                onToggleConsumable={handleToggleConsumable}
                onClose={handleInventoryClose}
              />
            )}
            {gameState === 'cartographer' && cartoDungeon && (
              <CartographerMap
                dungeon={cartoDungeon}
                onClose={handleCartoClose}
              />
            )}
            {gameState === 'amuletReveal' && revealAmuletId && (
              <AmuletReveal
                amuletId={revealAmuletId}
                onComplete={handleAmuletRevealComplete}
              />
            )}
            {gameState === 'sanctuary' && engineRef.current && (
              <SanctuaryOverlay
                souls={engineRef.current.player.souls}
                hp={engineRef.current.player.hp}
                maxHp={engineRef.current.player.maxHp}
                floor={engineRef.current.dungeon.floor}
                onHeal={handleSanctuaryHeal}
                onClose={handleSanctuaryClose}
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
