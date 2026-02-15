import { DungeonMap, DungeonRoom } from '@/game/types';

interface CartographerMapProps {
  dungeon: DungeonMap;
  onClose: () => void;
}

function roomKey(x: number, y: number): string {
  return `${x},${y}`;
}

const ROOM_TYPE_CONFIG: Record<string, { color: string; border: string; icon: string; label: string }> = {
  start: { color: 'rgba(60, 130, 200, 0.25)', border: 'rgba(100, 170, 240, 0.6)', icon: '🏠', label: 'Início' },
  boss: { color: 'rgba(200, 50, 50, 0.3)', border: 'rgba(255, 100, 100, 0.8)', icon: '💀', label: 'Boss' },
  vendor: { color: 'rgba(50, 160, 100, 0.3)', border: 'rgba(100, 240, 160, 0.8)', icon: '💰', label: 'Mercador' },
  treasure: { color: 'rgba(200, 170, 40, 0.25)', border: 'rgba(255, 220, 80, 0.7)', icon: '◆', label: 'Tesouro' },
  trap: { color: 'rgba(200, 70, 50, 0.25)', border: 'rgba(255, 120, 90, 0.7)', icon: '⚠', label: 'Armadilha' },
  shrine: { color: 'rgba(140, 70, 220, 0.25)', border: 'rgba(200, 130, 255, 0.7)', icon: '✦', label: 'Santuário' },
  normal: { color: 'rgba(60, 65, 90, 0.3)', border: 'rgba(100, 110, 150, 0.5)', icon: '', label: 'Sala' },
};

const CartographerMap = ({ dungeon, onClose }: CartographerMapProps) => {
  // Find bounds
  let minGX = Infinity, maxGX = -Infinity, minGY = Infinity, maxGY = -Infinity;
  for (const room of dungeon.rooms.values()) {
    if (room.gridX < minGX) minGX = room.gridX;
    if (room.gridX > maxGX) maxGX = room.gridX;
    if (room.gridY < minGY) minGY = room.gridY;
    if (room.gridY > maxGY) maxGY = room.gridY;
  }

  const cols = maxGX - minGX + 1;
  const rows = maxGY - minGY + 1;
  const cellSize = Math.min(72, Math.floor(Math.min(500 / cols, 400 / rows)));
  const gap = Math.max(4, Math.floor(cellSize * 0.15));

  // Build connection lines
  const connections: { x1: number; y1: number; x2: number; y2: number; visited: boolean }[] = [];
  for (const room of dungeon.rooms.values()) {
    const rx = (room.gridX - minGX) * (cellSize + gap) + cellSize / 2;
    const ry = (room.gridY - minGY) * (cellSize + gap) + cellSize / 2;
    if (room.doors.east && dungeon.rooms.has(roomKey(room.gridX + 1, room.gridY))) {
      const nx = rx + cellSize + gap;
      const neighbor = dungeon.rooms.get(roomKey(room.gridX + 1, room.gridY))!;
      connections.push({ x1: rx + cellSize / 2, y1: ry, x2: nx - cellSize / 2, y2: ry, visited: room.visited && neighbor.visited });
    }
    if (room.doors.south && dungeon.rooms.has(roomKey(room.gridX, room.gridY + 1))) {
      const ny = ry + cellSize + gap;
      const neighbor = dungeon.rooms.get(roomKey(room.gridX, room.gridY + 1))!;
      connections.push({ x1: rx, y1: ry + cellSize / 2, x2: rx, y2: ny - cellSize / 2, visited: room.visited && neighbor.visited });
    }
  }

  const totalW = cols * (cellSize + gap) - gap;
  const totalH = rows * (cellSize + gap) - gap;

  const isCurrent = (room: DungeonRoom) => roomKey(room.gridX, room.gridY) === dungeon.currentRoomKey;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: 24 }}>🗺️</span>
          <h2
            style={{
              color: '#b8d4e8',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Mapa do Andar {dungeon.floor}
          </h2>
        </div>

        {/* Map container */}
        <div
          className="relative overflow-auto rounded-lg border p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 14, 28, 0.98) 0%, rgba(6, 10, 22, 0.99) 100%)',
            borderColor: 'rgba(80, 130, 200, 0.25)',
            maxHeight: '70vh',
            maxWidth: '85vw',
          }}
        >
          {/* SVG connections */}
          <svg
            width={totalW}
            height={totalH}
            style={{ position: 'absolute', top: 24, left: 24, pointerEvents: 'none' }}
          >
            {connections.map((c, i) => (
              <line
                key={i}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke={c.visited ? 'rgba(100, 140, 200, 0.5)' : 'rgba(60, 80, 120, 0.25)'}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* Room grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
              gap: `${gap}px`,
              position: 'relative',
            }}
          >
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const gx = minGX + col;
              const gy = minGY + row;
              const room = dungeon.rooms.get(roomKey(gx, gy));

              if (!room) {
                return <div key={idx} style={{ width: cellSize, height: cellSize }} />;
              }

              const current = isCurrent(room);
              const config = ROOM_TYPE_CONFIG[room.type] || ROOM_TYPE_CONFIG.normal;
              const visited = room.visited;
              const cleared = room.cleared;

              return (
                <div
                  key={idx}
                  className="relative flex flex-col items-center justify-center rounded transition-all"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: current
                      ? 'rgba(60, 120, 220, 0.35)'
                      : visited
                      ? config.color
                      : 'rgba(25, 30, 45, 0.4)',
                    border: `2px solid ${current ? 'rgba(120, 180, 255, 0.9)' : visited ? config.border : 'rgba(50, 60, 80, 0.3)'}`,
                    boxShadow: current
                      ? '0 0 12px rgba(80, 150, 255, 0.4), inset 0 0 8px rgba(80, 150, 255, 0.15)'
                      : 'none',
                    animation: current ? 'pulse 2s ease-in-out infinite' : 'none',
                    opacity: visited ? 1 : 0.35,
                  }}
                >
                  {/* Room icon */}
                  {visited && config.icon && (
                    <span
                      style={{
                        fontSize: cellSize > 50 ? 18 : 14,
                        filter: cleared ? 'none' : 'saturate(1.5)',
                        opacity: cleared && room.type !== 'vendor' ? 0.5 : 1,
                      }}
                    >
                      {config.icon}
                    </span>
                  )}

                  {/* Current player indicator */}
                  {current && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#88ccff',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      AQUI
                    </div>
                  )}

                  {/* Not visited indicator */}
                  {!visited && (
                    <span
                      style={{
                        color: 'rgba(100, 120, 160, 0.5)',
                        fontSize: cellSize > 50 ? 16 : 12,
                        fontWeight: 300,
                      }}
                    >
                      ?
                    </span>
                  )}

                  {/* Cleared check */}
                  {visited && cleared && !current && room.type === 'normal' && (
                    <span style={{ color: 'rgba(100, 200, 130, 0.7)', fontSize: 12 }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center justify-center gap-4 mt-4 px-4"
          style={{
            color: '#8899aa',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
          }}
        >
          {Object.entries(ROOM_TYPE_CONFIG)
            .filter(([key]) => key !== 'normal')
            .map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="rounded"
                  style={{
                    width: 12,
                    height: 12,
                    background: cfg.color,
                    border: `1.5px solid ${cfg.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                  }}
                >
                  {cfg.icon}
                </div>
                <span>{cfg.label}</span>
              </div>
            ))}
        </div>

        {/* Close hint */}
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 rounded transition-all hover:brightness-110"
          style={{
            background: 'rgba(40, 60, 100, 0.4)',
            color: '#88aacc',
            border: '1px solid rgba(80, 140, 220, 0.25)',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.1em',
          }}
        >
          Fechar [M]
        </button>
      </div>
    </div>
  );
};

export default CartographerMap;