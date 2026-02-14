import { useRef, useEffect } from 'react';
import { GameEngine } from '@/game/engine';
import { GameCallbacks, Upgrade, Synergy, GameStats } from '@/game/types';
import MobileHUD from './MobileHUD';

interface GameCanvasProps {
  onLevelUp: (choices: Upgrade[]) => void;
  onGameOver: (stats: GameStats) => void;
  onSynergyActivated: (synergy: Synergy) => void;
  onFloorChange: (floor: number) => void;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

const GameCanvas = ({ onLevelUp, onGameOver, onSynergyActivated, onFloorChange, engineRef }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: GameCallbacks = {
      onLevelUp,
      onGameOver,
      onSynergyActivated,
      onFloorChange,
    };

    const engine = new GameEngine(canvas, callbacks);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        style={{ imageRendering: 'pixelated', background: '#000', touchAction: 'none' }}
        tabIndex={0}
      />
      <MobileHUD engineRef={engineRef} />
    </div>
  );
};

export default GameCanvas;
