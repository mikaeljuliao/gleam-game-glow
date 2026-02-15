import { DungeonMap, DungeonRoom } from '@/game/types';

interface CartographerMapProps {
  dungeon: DungeonMap;
  onClose: () => void;
}

function roomKey(x: number, y: number): string {
  return `${x},${y}`;
}

const ROOM_TYPE_CONFIG: Record<string, { color: string; border: string; glow: string; icon: string; label: string }> = {
  start: { color: 'rgba(60, 130, 200, 0.3)', border: 'rgba(100, 170, 240, 0.7)', glow: 'rgba(80, 150, 255, 0.3)', icon: '🏠', label: 'Início' },
  boss: { color: 'rgba(200, 40, 40, 0.35)', border: 'rgba(255, 80, 80, 0.9)', glow: 'rgba(255, 60, 60, 0.4)', icon: '💀', label: 'Boss' },
  vendor: { color: 'rgba(50, 160, 100, 0.3)', border: 'rgba(100, 240, 160, 0.8)', glow: 'rgba(80, 220, 140, 0.3)', icon: '💰', label: 'Mercador + Santuário' },
  treasure: { color: 'rgba(200, 170, 40, 0.3)', border: 'rgba(255, 220, 80, 0.8)', glow: 'rgba(255, 200, 50, 0.3)', icon: '◆', label: 'Tesouro' },
  trap: { color: 'rgba(200, 70, 50, 0.3)', border: 'rgba(255, 120, 90, 0.8)', glow: 'rgba(255, 100, 70, 0.3)', icon: '⚠', label: 'Armadilha' },
  normal: { color: 'rgba(50, 55, 80, 0.35)', border: 'rgba(90, 100, 140, 0.5)', glow: 'none', icon: '', label: 'Sala' },
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
  const cellSize = Math.min(72, Math.floor(Math.min(520 / cols, 420 / rows)));
  const gap = Math.max(6, Math.floor(cellSize * 0.18));

  // Build connection lines
  const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const room of dungeon.rooms.values()) {
    const rx = (room.gridX - minGX) * (cellSize + gap) + cellSize / 2;
    const ry = (room.gridY - minGY) * (cellSize + gap) + cellSize / 2;
    if (room.doors.east && dungeon.rooms.has(roomKey(room.gridX + 1, room.gridY))) {
      const nx = rx + cellSize + gap;
      connections.push({ x1: rx + cellSize / 2, y1: ry, x2: nx - cellSize / 2, y2: ry });
    }
    if (room.doors.south && dungeon.rooms.has(roomKey(room.gridX, room.gridY + 1))) {
      const ny = ry + cellSize + gap;
      connections.push({ x1: rx, y1: ry + cellSize / 2, x2: rx, y2: ny - cellSize / 2 });
    }
  }

  const totalW = cols * (cellSize + gap) - gap;
  const totalH = rows * (cellSize + gap) - gap;

  const isCurrent = (room: DungeonRoom) => roomKey(room.gridX, room.gridY) === dungeon.currentRoomKey;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.94)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-[92vw] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <span style={{ fontSize: 28 }}>🗺️</span>
          <div>
            <h2
              style={{
                color: '#c8ddf0',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: 0,
                textShadow: '0 0 20px rgba(80, 140, 255, 0.3)',
              }}
            >
              Mapa do Andar {dungeon.floor}
            </h2>
            <p style={{
              color: '#6888aa',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 11,
              margin: '2px 0 0',
              letterSpacing: '0.08em',
            }}>
              Amuleto do Cartógrafo — visão completa
            </p>
          </div>
        </div>

        {/* Map container */}
        <div
          className="relative overflow-auto rounded-xl border p-7"
          style={{
            background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.98) 0%, rgba(4, 8, 18, 0.99) 100%)',
            borderColor: 'rgba(60, 110, 180, 0.3)',
            boxShadow: 'inset 0 0 40px rgba(40, 80, 160, 0.08), 0 0 60px rgba(40, 80, 160, 0.1)',
            maxHeight: '68vh',
            maxWidth: '85vw',
          }}
        >
          {/* SVG connections */}
          <svg
            width={totalW}
            height={totalH}
            style={{ position: 'absolute', top: 28, left: 28, pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(80, 130, 200, 0.6)" />
                <stop offset="100%" stopColor="rgba(80, 130, 200, 0.3)" />
              </linearGradient>
            </defs>
            {connections.map((c, i) => (
              <line
                key={i}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke="url(#connGrad)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="6 4"
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
              // Use room.type directly - no shrine type anymore, vendor includes sanctuary
              const roomType = room.type === 'shrine' ? 'vendor' : room.type;
              const config = ROOM_TYPE_CONFIG[roomType] || ROOM_TYPE_CONFIG.normal;
              const visited = room.visited;
              const cleared = room.cleared;

              return (
                <div
                  key={idx}
                  className="relative flex flex-col items-center justify-center rounded-lg transition-all"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: current
                      ? 'rgba(50, 110, 220, 0.4)'
                      : config.color,
                    border: `2px solid ${current ? 'rgba(100, 170, 255, 1)' : config.border}`,
                    boxShadow: current
                      ? '0 0 16px rgba(80, 150, 255, 0.5), inset 0 0 10px rgba(80, 150, 255, 0.2), 0 0 30px rgba(80, 150, 255, 0.2)'
                      : config.glow !== 'none'
                      ? `0 0 10px ${config.glow}`
                      : 'inset 0 1px 2px rgba(255,255,255,0.03)',
                    animation: current ? 'pulse 2s ease-in-out infinite' : 'none',
                    opacity: 1,
                  }}
                >
                  {/* Room icon — always visible (cartographer reveals all) */}
                  {config.icon && (
                    <span
                      style={{
                        fontSize: cellSize > 50 ? 20 : 15,
                        filter: cleared ? 'grayscale(0.3)' : 'none',
                        opacity: cleared && roomType !== 'vendor' && roomType !== 'boss' ? 0.6 : 1,
                      }}
                    >
                      {config.icon}
                    </span>
                  )}

                  {/* Room label for special rooms */}
                  {cellSize > 55 && roomType !== 'normal' && (
                    <span style={{
                      fontSize: 7,
                      color: config.border,
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginTop: 1,
                      opacity: 0.8,
                    }}>
                      {roomType === 'boss' ? 'BOSS' : roomType === 'vendor' ? 'MERCADOR' : roomType === 'trap' ? 'PERIGO' : roomType === 'treasure' ? 'TESOURO' : ''}
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
                        textShadow: '0 0 6px rgba(80, 150, 255, 0.6)',
                      }}
                    >
                      AQUI
                    </div>
                  )}

                  {/* Visited check */}
                  {visited && cleared && !current && roomType === 'normal' && (
                    <span style={{ color: 'rgba(100, 200, 130, 0.7)', fontSize: 13, fontWeight: 700 }}>✓</span>
                  )}

                  {/* Not visited — show faded but still identifiable */}
                  {!visited && roomType === 'normal' && !config.icon && (
                    <span style={{
                      color: 'rgba(80, 100, 140, 0.4)',
                      fontSize: cellSize > 50 ? 14 : 10,
                    }}>
                      •
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center justify-center gap-5 mt-5 px-4"
          style={{
            color: '#7899bb',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {Object.entries(ROOM_TYPE_CONFIG)
            .filter(([key]) => key !== 'normal')
            .map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="rounded-sm"
                  style={{
                    width: 14,
                    height: 14,
                    background: cfg.color,
                    border: `2px solid ${cfg.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    boxShadow: cfg.glow !== 'none' ? `0 0 6px ${cfg.glow}` : 'none',
                  }}
                >
                  {cfg.icon}
                </div>
                <span>{cfg.label}</span>
              </div>
            ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-5 px-8 py-2.5 rounded-lg transition-all hover:brightness-125"
          style={{
            background: 'linear-gradient(135deg, rgba(40, 60, 100, 0.5), rgba(30, 50, 80, 0.4))',
            color: '#99bbdd',
            border: '1px solid rgba(80, 140, 220, 0.3)',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            boxShadow: '0 2px 12px rgba(40, 80, 160, 0.15)',
          }}
        >
          Fechar [M]
        </button>
      </div>
    </div>
  );
};

export default CartographerMap;
