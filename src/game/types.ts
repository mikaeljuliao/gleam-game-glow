export interface Vec2 {
  x: number;
  y: number;
}

// Viewport info for dynamic resolution rendering
export interface Viewport {
  gox: number;  // game offset X within the render canvas
  goy: number;  // game offset Y within the render canvas
  rw: number;   // total render width
  rh: number;   // total render height
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  xp: number;
  xpToNext: number;
  level: number;
  facing: Vec2;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  meleeCooldown: number;
  rangedCooldown: number;
  invincibleTime: number;
  upgrades: string[];
  baseDamage: number;
  projectileDamage: number;
  projectileCount: number;
  attackSpeedMult: number;
  moveSpeedMult: number;
  damageMultiplier: number;
  areaMultiplier: number;
  meleeAttacking: boolean;
  meleeAngle: number;
  meleeTimer: number;
  meleeComboStep: number;  // Next hit in sequence (1 to 4)
  activeComboStep: number; // Hit currently being performed
  meleeComboTimer: number; // Window to continue combo
  lifesteal: number;
  piercing: boolean;
  explosive: boolean;
  // Trail positions for visual effect
  trail: Vec2[];
  // Idle animation timer
  idleTime: number;
  // XP glow burst timer
  xpGlowTimer: number;
  // New upgrade fields
  armor: number;           // damage reduction multiplier (0.85 = 15% reduction)
  critChance: number;      // 0-1
  critMultiplier: number;  // damage multiplier on crit
  xpMultiplier: number;    // xp gain multiplier
  dashEnhanced: boolean;   // enhanced dash (faster, longer, phases through enemies)
  thorns: number;          // fraction of damage reflected
  xpMagnetRange: number;   // extra xp pickup range
  fireAura: boolean;       // kept for save compat
  fireAuraDPS: number;
  shieldCooldown: number;  // kept for save compat
  shieldReady: boolean;    // kept for save compat
  chainBounces: number;    // projectile bounces to nearby targets
  berserker: boolean;      // low hp damage boost
  hasRevive: boolean;      // one-time revive
  reviveUsed: boolean;
  shadowClone: boolean;    // legacy compat
  shadowCloneX: number;
  shadowCloneY: number;
  shadowCloneAngle: number;
  souls: number;
  hasDisciple: boolean;
  discipleX: number;
  discipleY: number;
  discipleAngle: number;
  // Potion System
  potions: number;
  maxPotions: number;
  // Buff Timers (Seconds)
  strengthBuffTimer: number;
  defenseBuffTimer: number;
  speedBuffTimer: number;
  // Temporary Multipliers (Amulets, Buffs, etc)
  temporaryMoveSpeedMult: number;
  temporaryAttackSpeedMult: number;
  footstepTimer: number;
}

export type EnemyType = 'chaser' | 'shooter' | 'tank' | 'boss' | 'wraith' | 'bomber' | 'swarm' | 'necromancer' | 'stalker' | 'phantom' | 'flash_hunter' | 'distortion' | 'flicker_fiend' | 'warper' | 'accelerator';

export type TrapType = 'spikes' | 'phantom_summon' | 'poison_cloud' | 'bear_trap';

export interface EnemyState {
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  vx: number;
  vy: number;
  attackCooldown: number;
  aiState: 'idle' | 'chase' | 'attack' | 'charge' | 'cooldown' | 'teleport' | 'fuse' | 'phasing';
  stateTimer: number;
  flashTime: number;
  knockbackX: number;
  knockbackY: number;
  // Wraith specific
  phaseAlpha: number;
  teleportTarget: Vec2 | null;
  // Bomber specific
  fuseTimer: number;
  // Spawn animation
  spawnTimer: number;
  // Visual wobble
  wobble: number;
  // Stalker specific
  stealthAlpha: number;
  lunging: boolean;
  // Necromancer specific
  summonTimer: number;
  lastVolleyId?: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  damage: number;
  isPlayerOwned: boolean;
  lifetime: number;
  piercing: boolean;
  explosive: boolean;
  // Trail
  trail: Vec2[];
  // Enemies hit by this projectile (to prevent multi-hits per frame)
  hitTargets: EnemyState[];
  // ID shared by all projectiles in a single shot
  volleyId: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'blood' | 'dust' | 'xp' | 'text' | 'explosion' | 'spark' | 'trail' | 'shockwave' | 'ember' | 'ghost' | 'fog' | 'horror' | 'soul';
  text?: string;
  radius?: number;
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonRoom {
  gridX: number;
  gridY: number;
  doors: { north: boolean; south: boolean; east: boolean; west: boolean };
  enemies: EnemySpawn[];
  obstacles: Obstacle[];
  cleared: boolean;
  visited: boolean;
  isBossRoom: boolean;
  type: 'normal' | 'boss' | 'start' | 'treasure' | 'trap' | 'shrine' | 'vendor';
  // Special room state
  treasureCollected?: boolean;
  trapTriggered?: boolean;
  shrineUsed?: boolean;
  trapType?: TrapType;
  // Hidden traps (new system)
  hiddenTraps?: import('./traps').HiddenTrap[];
  // Vendor shop inventories (persisted per room)
  merchantShopItems?: ShopItem[];
  alchemistShopItems?: ShopItem[];
}

export interface HorrorEvent {
  type: 'whisper' | 'flicker' | 'shadow' | 'heartbeat' | 'eyes' | 'scream';
  timer: number;
  x?: number;
  y?: number;
  data?: any;
}

export interface EnemySpawn {
  type: EnemyType;
  x: number;
  y: number;
}

export interface DungeonMap {
  rooms: Map<string, DungeonRoom>;
  currentRoomKey: string;
  floor: number;
}

export type UpgradeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  icon: string;
  synergyTags: string[];
  apply: (player: PlayerState) => void;
}

export interface Synergy {
  id: string;
  name: string;
  description: string;
  requiredTags: string[];
  applied: boolean;
  apply: (player: PlayerState) => void;
}

export interface GameStats {
  enemiesDefeated: number;
  roomsExplored: number;
  floor: number;
  level: number;
  timePlayed: number;
  damageDealt: number;
  damageTaken: number;
  upgradesCollected: number;
  synergiesActivated: number;
}

export interface ScreenEffect {
  type: 'shake' | 'flash' | 'slowmo';
  intensity: number;
  duration: number;
  timer: number;
  color?: string;
}

export interface ShopItem {
  upgrade: Upgrade;
  cost: number;
  sold: boolean;
  amuletId?: string; // if this is an amulet shop item
  isPotion?: boolean; // New flag for potion refills
  purchasesThisFloor?: number;
  maxPurchasesPerFloor?: number;
}

export interface GameCallbacks {
  onLevelUp: (choices: Upgrade[]) => void;
  onGameOver: (stats: GameStats) => void;
  onSynergyActivated: (synergy: Synergy) => void;
  onFloorChange: (floor: number) => void;
  onShopOpen: (items: ShopItem[], souls: number, shopType: 'normal' | 'potion') => void;
  onShopClose: () => void;
  onAmuletDrop: (amuletId: string) => void;
  onInventoryOpen: () => void;
  onInventoryClose: () => void;
  onAmuletReveal: (amuletId: string) => void;
  onSanctuaryOpen: () => void;
  onSanctuaryClose: () => void;
}
