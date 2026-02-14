export const GAME_WIDTH = 640;
export const HUD_FONT = 'Arial, Helvetica, sans-serif';
export const GAME_HEIGHT = 400;
export const TILE_SIZE = 20;
export const ROOM_COLS = 32;
export const ROOM_ROWS = 20;

// Player
export const PLAYER_SIZE = 16;
export const PLAYER_SPEED = 100;
export const PLAYER_MAX_HP = 100;
export const PLAYER_DASH_SPEED = 280;
export const PLAYER_DASH_DURATION = 0.15;
export const PLAYER_DASH_COOLDOWN = 0.8;
export const MELEE_RANGE = 32;
export const MELEE_ARC = Math.PI / 2;
export const MELEE_DAMAGE = 20;
export const MELEE_COOLDOWN = 0.35;
export const RANGED_DAMAGE = 12;
export const RANGED_COOLDOWN = 0.5;
export const PROJECTILE_SPEED = 200;
export const PROJECTILE_SIZE = 4;
export const PROJECTILE_LIFETIME = 2;

// XP
export const XP_BASE = 30;
export const XP_MULTIPLIER = 1.4;

// Enemies - Chaser (slower)
export const CHASER_HP = 30;
export const CHASER_SPEED = 35;
export const CHASER_DAMAGE = 8;
export const CHASER_SIZE = 13;

// Enemies - Shooter (slower)
export const SHOOTER_HP = 20;
export const SHOOTER_SPEED = 22;
export const SHOOTER_DAMAGE = 6;
export const SHOOTER_SIZE = 12;
export const SHOOTER_FIRE_RATE = 2.2;
export const SHOOTER_RANGE = 150;
export const SHOOTER_PROJ_SPEED = 80;

// Enemies - Tank (slower)
export const TANK_HP = 80;
export const TANK_SPEED = 18;
export const TANK_DAMAGE = 15;
export const TANK_SIZE = 18;
export const TANK_CHARGE_SPEED = 110;
export const TANK_CHARGE_DIST = 70;

// Enemies - Wraith (slower)
export const WRAITH_HP = 25;
export const WRAITH_SPEED = 40;
export const WRAITH_DAMAGE = 12;
export const WRAITH_SIZE = 13;
export const WRAITH_TELEPORT_COOLDOWN = 4;
export const WRAITH_PHASE_DURATION = 1.5;

// Enemies - Bomber (slower)
export const BOMBER_HP = 15;
export const BOMBER_SPEED = 28;
export const BOMBER_CHARGE_SPEED = 90;
export const BOMBER_DAMAGE = 25;
export const BOMBER_SIZE = 12;
export const BOMBER_EXPLOSION_RADIUS = 50;
export const BOMBER_FUSE_DIST = 55;

// Enemies - Swarm (slower)
export const SWARM_HP = 8;
export const SWARM_SPEED = 50;
export const SWARM_DAMAGE = 3;
export const SWARM_SIZE = 8;

// Enemies - Necromancer (summoner, stays far)
export const NECRO_HP = 35;
export const NECRO_SPEED = 18;
export const NECRO_DAMAGE = 5;
export const NECRO_SIZE = 14;
export const NECRO_SUMMON_COOLDOWN = 5;

// Enemies - Stalker (invisible predator)
export const STALKER_HP = 40;
export const STALKER_SPEED = 25;
export const STALKER_DAMAGE = 18;
export const STALKER_SIZE = 14;
export const STALKER_LUNGE_SPEED = 200;
export const STALKER_LUNGE_DIST = 45;
export const STALKER_REVEAL_DIST = 60;

// Enemies - Flash Hunter (appears in light, rushes)
export const FLASH_HUNTER_HP = 20;
export const FLASH_HUNTER_SPEED = 300;
export const FLASH_HUNTER_DAMAGE = 15;
export const FLASH_HUNTER_SIZE = 11;

// Enemies - Distortion (bass spike + glitch entry)
export const DISTORTION_HP = 45;
export const DISTORTION_SPEED = 60;
export const DISTORTION_DAMAGE = 20;
export const DISTORTION_SIZE = 16;

// Enemies - Flicker Fiend (blinks on/off while approaching)
export const FLICKER_HP = 25;
export const FLICKER_SPEED = 55;
export const FLICKER_DAMAGE = 12;
export const FLICKER_SIZE = 12;

// Enemies - Warper (short teleports closer)
export const WARPER_HP = 30;
export const WARPER_SPEED = 20;
export const WARPER_DAMAGE = 14;
export const WARPER_SIZE = 13;
export const WARPER_TELEPORT_INTERVAL = 1.8;

// Enemies - Accelerator (speeds up in light)
export const ACCEL_HP = 35;
export const ACCEL_SPEED = 25;
export const ACCEL_DAMAGE = 16;
export const ACCEL_SIZE = 14;

// Boss
export const BOSS_HP = 400;
export const BOSS_SPEED = 30;
export const BOSS_DAMAGE = 20;
export const BOSS_SIZE = 28;

// Dungeon
export const DUNGEON_SIZE = 7;
export const MIN_ROOMS = 8;
export const MAX_ROOMS = 12;
export const DOOR_WIDTH = 28;

// Light - dark but enemies should be visible
export const LIGHT_RADIUS = 130;

export const COLORS = {
  bg: '#08080f',
  floor1: '#121218',
  floor2: '#15151d',
  wall: '#1e1e30',
  wallTop: '#282845',
  wallEdge: '#0e0e1a',
  player: '#5599ff',
  playerDark: '#3366cc',
  playerLight: '#88bbff',
  playerCloak: '#2a2a55',
  playerTrail: 'rgba(85, 153, 255, 0.3)',
  chaser: '#dd3333',
  chaserDark: '#aa1111',
  shooter: '#aa44dd',
  shooterDark: '#7711aa',
  tank: '#778899',
  tankDark: '#556677',
  wraith: '#44ddcc',
  wraithDark: '#118877',
  wraithGlow: 'rgba(68, 221, 204, 0.3)',
  bomber: '#ff8800',
  bomberDark: '#cc5500',
  bomberGlow: 'rgba(255, 136, 0, 0.5)',
  swarm: '#88cc33',
  swarmDark: '#557711',
  necromancer: '#9933cc',
  necroDark: '#661199',
  necroGlow: 'rgba(153, 51, 204, 0.3)',
  stalker: '#222222',
  stalkerDark: '#111111',
  stalkerEye: '#ff0000',
  flashHunter: '#ffffff',
  flashHunterGlow: 'rgba(255, 255, 255, 0.6)',
  distortion: '#440066',
  distortionGlow: 'rgba(100, 0, 150, 0.4)',
  flickerFiend: '#ff3300',
  flickerGlow: 'rgba(255, 50, 0, 0.3)',
  warper: '#0044aa',
  warperGlow: 'rgba(0, 80, 200, 0.4)',
  accelerator: '#ffaa00',
  accelGlow: 'rgba(255, 170, 0, 0.3)',
  boss: '#ff4444',
  bossDark: '#cc1111',
  bossAccent: '#ffaa00',
  projPlayer: '#66ccff',
  projEnemy: '#ff5555',
  hpFill: '#cc2222',
  hpBg: '#331111',
  xpFill: '#22bb44',
  xpBg: '#113311',
  doorClosed: '#2a2a44',
  doorOpen: '#33aa55',
  common: '#aaaaaa',
  rare: '#4488ff',
  epic: '#bb44ff',
  obstacle: '#1a1a2e',
  obstacleTop: '#222240',
  white: '#ffffff',
  damageText: '#ff4444',
  healText: '#44ff44',
  xpText: '#44ffaa',
};

// Dynamic game dimensions — adapted to screen aspect ratio at runtime
// The dims object is mutable and updated by setActiveDimensions()
export const dims = {
  gw: GAME_WIDTH,
  gh: GAME_HEIGHT,
  rc: ROOM_COLS,
  rr: ROOM_ROWS,
};

export function setActiveDimensions(screenW: number, screenH: number) {
  const sw = screenW || 640;
  const sh = screenH || 400;
  const screenAspect = sw / sh;
  const gameAspect = GAME_WIDTH / GAME_HEIGHT;

  if (screenAspect >= gameAspect) {
    // Wider than base — expand width, keep height
    dims.gh = GAME_HEIGHT;
    dims.gw = Math.ceil((GAME_HEIGHT * screenAspect) / TILE_SIZE) * TILE_SIZE;
  } else {
    // Taller than base (portrait) — expand height, keep width
    dims.gw = GAME_WIDTH;
    dims.gh = Math.ceil((GAME_WIDTH / screenAspect) / TILE_SIZE) * TILE_SIZE;
  }
  dims.rc = dims.gw / TILE_SIZE;
  dims.rr = dims.gh / TILE_SIZE;
}
