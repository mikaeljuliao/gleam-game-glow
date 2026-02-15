import { PlayerState, EnemyState, ProjectileState, Particle, DungeonMap, GameStats, GameCallbacks, ScreenEffect, Upgrade, DungeonRoom, HorrorEvent, ShopItem } from './types';
import { InputManager } from './input';
import { createPlayer, updatePlayer, tryDash, tryMelee, canRangedAttack, doRangedAttack, addXP, damagePlayer } from './player';
import { createEnemy, updateEnemy, damageEnemy, scaleEnemyForFloor, getXPForEnemy, createBossForFloor, consumeBossAction, setBossFloor } from './enemies';
import { createPlayerProjectile, updateProjectile } from './projectiles';
import { generateDungeon, getCurrentRoom, moveToRoom } from './dungeon';
import { createParticles, updateParticles, spawnBlood, spawnDamageText, spawnXPParticle, spawnExplosion, spawnSpark, spawnDust, spawnTrail, spawnEmbers, spawnGhostParticle, spawnBomberExplosion } from './particles';
import { getRandomUpgrades, checkSynergies, getOwnedTags, SYNERGIES } from './upgrades';
import { renderFloor, renderDoors, renderObstacles, renderPlayer, renderEnemy, renderProjectile, renderParticles, renderLighting, renderHUD, applyScreenEffects, getShakeOffset, renderHiddenTraps, renderTrapEffectOverlay, renderViewportMargins } from './renderer';
import { SFX, initAudio } from './audio';
import { startBackgroundMusic, stopBackgroundMusic, HorrorSFX, createHorrorEvent, spawnFog, renderHorrorEvents, renderSpecialRoom, updateCombatTension, triggerBossIntro, isBossIntroActive, updateBossIntro, renderBossIntro, startVendorAmbience, stopVendorAmbience, isVendorAmbienceActive } from './horror';
import { saveGame, loadGame, clearSave, restorePlayerState, restoreDungeon } from './save';
import { checkTrapCollision, activateTrap, updateTrapEffects, resetTrapEffects, getLightsOutTimer, getPanicTimer, getDoorsLockedTimer, hasEffect } from './traps';
import { AmuletInventory, createAmuletInventory, getRandomBossAmuletDrop, isAmuletEquipped, WarRhythmState, createWarRhythmState, getSoulCollectorBonus, AMULET_DEFS, addAmulet } from './amulets';
import * as C from './constants';

export class GameEngine {
  player: PlayerState;
  enemies: EnemyState[] = [];
  projectiles: ProjectileState[] = [];
  particles: Particle[] = [];
  dungeon: DungeonMap;
  stats: GameStats;
  effects: ScreenEffect[] = [];
  horrorEvents: HorrorEvent[] = [];
  
  input: InputManager;
  gameCanvas: HTMLCanvasElement;
  gameCtx: CanvasRenderingContext2D;
  displayCanvas: HTMLCanvasElement;
  displayCtx: CanvasRenderingContext2D;
  
  callbacks: GameCallbacks;
  running = false;
  paused = false;
  animFrameId = 0;
  lastTime = 0;
  gameTime = 0;
  regenTimer = 0;
  dustTimer = 0;
  ambientTimer = 0;
  trailTimer = 0;
  tutorialTimer = 0;
  horrorTimer = 0;
  fogTimer = 0;
  saveTimer = 0;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  renderWidth = C.GAME_WIDTH;
  renderHeight = C.GAME_HEIGHT;
  dpr = 1;
  gameOffsetX = 0;
  gameOffsetY = 0;
  soulParticleTimer = 0;
  fireAuraTimer = 0;
  shieldRechargeTimer = 0;
  shadowCloneAttackTimer = 0;
  inVendorRoom = false;
  shopOpen = false;
  shopItems: ShopItem[] = [];
  vendorInteractCooldown = 0;
  vendorFirstMeet = true;
  vendorDialogueActive = false;
  vendorDialogueLines: string[] = [];
  vendorDialogueIndex = 0;
  vendorDialogueCharIndex = 0;
  vendorDialogueTimer = 0;
  // Amulet system
  amuletInventory: AmuletInventory = createAmuletInventory();
  warRhythm: WarRhythmState = createWarRhythmState();
  lastAttackWasMelee = false;
  cruelRepTimer = 0;
  cruelRepIsMelee = false;
  cruelRepTarget = { x: 0, y: 0 };

  constructor(displayCanvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.displayCanvas = displayCanvas;
    this.displayCtx = displayCanvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    
    // Set active game dimensions based on screen aspect ratio BEFORE creating game content
    C.setActiveDimensions(displayCanvas.clientWidth, displayCanvas.clientHeight);
    
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.width = C.dims.gw * this.dpr;
    this.gameCanvas.height = C.dims.gh * this.dpr;
    this.gameCtx = this.gameCanvas.getContext('2d')!;
    this.gameCtx.scale(this.dpr, this.dpr);
    this.gameCtx.imageSmoothingEnabled = false;
    this.displayCtx.imageSmoothingEnabled = false;

    this.input = new InputManager();
    this.input.attachCanvas(displayCanvas);
    this.callbacks = callbacks;
    this.player = createPlayer();
    this.player.trail = [];
    this.dungeon = generateDungeon(1);
    this.particles = createParticles();
    this.stats = { enemiesDefeated: 0, roomsExplored: 1, floor: 1, level: 1, timePlayed: 0, damageDealt: 0, damageTaken: 0, upgradesCollected: 0, synergiesActivated: 0 };
    this.spawnRoomEnemies();
    initAudio();
    startBackgroundMusic();
  }

  loadFromSave(): boolean {
    const saved = loadGame();
    if (!saved) return false;
    try {
      restorePlayerState(this.player, saved.player);
      this.dungeon = restoreDungeon(saved.dungeon);
      this.stats = { ...saved.stats };
      this.player.x = C.dims.gw / 2;
      this.player.y = C.dims.gh / 2;
      this.player.trail = [];
      this.enemies = [];
      this.spawnRoomEnemies();
      return true;
    } catch {
      return false;
    }
  }

  startAtFloor(floor: number) {
    // Generate dungeon at target floor
    this.dungeon = generateDungeon(floor);
    this.player.x = C.dims.gw / 2;
    this.player.y = C.dims.gh / 2;
    this.player.trail = [];
    this.projectiles = [];
    this.enemies = [];
    this.particles = createParticles();
    this.bossIntroPlayed = false;
    this.pendingNextFloor = false;
    this.bossWasSpawned = false;

    // Power up the player based on floor
    this.player.level = 1 + (floor - 1) * 5;
    this.player.maxHp = C.PLAYER_MAX_HP + (floor - 1) * 30;
    this.player.hp = this.player.maxHp;
    this.player.baseDamage = C.MELEE_DAMAGE + (floor - 1) * 8;
    this.player.projectileDamage = C.RANGED_DAMAGE + (floor - 1) * 5;
    this.player.attackSpeedMult = 1 + (floor - 1) * 0.15;
    this._baseAttackSpeedMult = this.player.attackSpeedMult;
    this.player.moveSpeedMult = 1 + (floor - 1) * 0.1;
    this.player.damageMultiplier = 1 + (floor - 1) * 0.3;
    this.player.projectileCount = Math.min(1 + Math.floor((floor - 1) / 2), 4);
    if (floor >= 3) this.player.piercing = true;
    if (floor >= 4) this.player.explosive = true;
    if (floor >= 2) this.player.lifesteal = 0.05 * (floor - 1);

    this.stats = { enemiesDefeated: 0, roomsExplored: 1, floor, level: this.player.level, timePlayed: 0, damageDealt: 0, damageTaken: 0, upgradesCollected: 0, synergiesActivated: 0 };
    this.spawnRoomEnemies();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.input.destroy();
    stopBackgroundMusic();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.lastTime = performance.now(); }

  applyUpgrade(upgrade: Upgrade) {
    upgrade.apply(this.player);
    this.player.upgrades.push(upgrade.id);
    this.stats.upgradesCollected++;
    // Track base attack speed for War Rhythm
    this._baseAttackSpeedMult = this.player.attackSpeedMult;
    
    const tags = getOwnedTags([], this.player.upgrades);
    const newSynergies = checkSynergies(tags);
    for (const s of newSynergies) {
      s.apply(this.player);
      s.applied = true;
      this.stats.synergiesActivated++;
      this.callbacks.onSynergyActivated(s);
      SFX.synergyActivated();
    }
    // Update base attack speed after synergies too
    this._baseAttackSpeedMult = this.player.attackSpeedMult;
    this.resume();
  }

  // Shop methods
  openShop() {
    if (this.shopOpen) return;
    this.shopOpen = true;
    this.pause();
    // Use persisted shop items from room, or generate if first visit
    const room = getCurrentRoom(this.dungeon);
    if (room.shopItems && room.shopItems.length > 0) {
      this.shopItems = room.shopItems;
    } else {
      const items = getRandomUpgrades(4, this.player.upgrades);
      this.shopItems = items.map(u => ({
        upgrade: u,
        cost: C.SHOP_PRICES[u.rarity] || 30,
        sold: false,
      }));
      // Add one random unowned amulet to shop (expensive)
      const amuletId = getRandomBossAmuletDrop(this.amuletInventory);
      if (amuletId) {
        const def = AMULET_DEFS.find(a => a.id === amuletId);
        if (def) {
          this.shopItems.push({
            upgrade: {
              id: `amulet_${def.id}`,
              name: `${def.icon} ${def.name}`,
              description: def.description,
              rarity: 'legendary',
              icon: def.icon,
              synergyTags: [],
              apply: () => {},
            },
            cost: 600 + Math.floor(Math.random() * 200),
            sold: false,
            amuletId: def.id,
          });
        }
      }
      // Persist to room
      room.shopItems = this.shopItems;
    }
    this.callbacks.onShopOpen(this.shopItems, this.player.souls);
  }

  closeShop() {
    this.shopOpen = false;
    this.vendorInteractCooldown = 1.5;
    this.resume();
  }

  // Vendor dialogue system
  private startVendorDialogue() {
    this.vendorDialogueActive = true;
    this.vendorDialogueIndex = 0;
    this.vendorDialogueCharIndex = 0;
    this.vendorDialogueTimer = 0;
    this.pause();

    if (this.vendorFirstMeet) {
      this.vendorFirstMeet = false;
      this.vendorDialogueLines = [
        'Então é você…',
        'O viajante que está fazendo o andar tremer.',
        'Poucos chegam até mim ainda vivos.',
        'A maioria vira lembrança… ou alimento para as criaturas daqui.',
        'Este lugar corrói coragem, esperança… e ossos.',
        'Eu sou conhecido como O Mercador.',
        'Negocio oportunidades para aqueles teimosos o bastante para continuar subindo.',
        'E se pretende ir mais longe…',
        'vai precisar do que eu tenho.',
      ];
    } else {
      const shortLines = [
        ['Ainda vivo. Impressionante.', 'Selecionei algumas coisas que você possa gostar.', 'Veja o que eu tenho.'],
        ['Você voltou.', 'Gosto de clientes que sobrevivem.', 'Dê uma olhada.'],
        ['Você continua me surpreendendo.', 'Poucos passam tantas vezes por esta porta.', 'Vamos negociar.'],
      ];
      this.vendorDialogueLines = shortLines[Math.floor(Math.random() * shortLines.length)];
    }
  }

  private updateVendorDialogue(dt: number) {
    if (!this.vendorDialogueActive) return;
    this.vendorDialogueTimer += dt;

    const line = this.vendorDialogueLines[this.vendorDialogueIndex];
    if (this.vendorDialogueCharIndex < line.length) {
      // Type out characters
      if (this.vendorDialogueTimer >= 0.03) {
        this.vendorDialogueTimer = 0;
        this.vendorDialogueCharIndex++;
      }
    }
  }

  advanceVendorDialogue() {
    if (!this.vendorDialogueActive) return;
    const line = this.vendorDialogueLines[this.vendorDialogueIndex];
    if (this.vendorDialogueCharIndex < line.length) {
      // Skip to end of current line
      this.vendorDialogueCharIndex = line.length;
      return;
    }
    this.vendorDialogueIndex++;
    this.vendorDialogueCharIndex = 0;
    this.vendorDialogueTimer = 0;
    if (this.vendorDialogueIndex >= this.vendorDialogueLines.length) {
      // Dialogue done → open shop
      this.vendorDialogueActive = false;
      this.resume();
      this.openShop();
    }
  }

  buyShopItem(index: number): boolean {
    const item = this.shopItems[index];
    if (!item || item.sold || this.player.souls < item.cost) return false;
    this.player.souls -= item.cost;
    item.sold = true;

    // Amulet purchase
    if (item.amuletId) {
      addAmulet(this.amuletInventory, item.amuletId);
      this.callbacks.onAmuletDrop(item.amuletId);
      SFX.shopBuy();
      return true;
    }

    item.upgrade.apply(this.player);
    this.player.upgrades.push(item.upgrade.id);
    this.stats.upgradesCollected++;
    this._baseAttackSpeedMult = this.player.attackSpeedMult;
    SFX.shopBuy();
    
    // Check synergies
    const tags = getOwnedTags([], this.player.upgrades);
    const newSynergies = checkSynergies(tags);
    for (const s of newSynergies) {
      s.apply(this.player);
      s.applied = true;
      this.stats.synergiesActivated++;
      this.callbacks.onSynergyActivated(s);
    }
    return true;
  }

  private getSoulsForEnemy(type: string): number {
    const range = C.SOUL_DROPS[type] || [1, 3];
    return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.paused || this.vendorDialogueActive) {
      // Apply slow-mo
      let effectiveDt = dt;
      if (this.slowMoTimer > 0) {
        this.slowMoTimer -= dt;
        effectiveDt = dt * this.slowMoFactor;
        if (this.slowMoTimer <= 0) {
          this.slowMoTimer = 0;
          this.slowMoFactor = 1;
        }
      }
      if (this.vendorDialogueActive) {
        this.updateVendorDialogue(dt);
        // Click/key to advance dialogue
        if (this.input.isMouseJustPressed(0) || this.input.isMouseJustPressed(2) || this.input.wantsDash()) {
          this.advanceVendorDialogue();
        }
      } else {
        this.update(effectiveDt);
      }
    }
    this.render();
    this.input.clearFrame();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private pendingNextFloor = false;
  private bossWasSpawned = false;
  private bossIntroPlayed = false;
  private bossKillTimer = 0;
  private bossKillFloor = 1;
  private slowMoTimer = 0;
  private slowMoFactor = 1;
  
  // Victory countdown state
  private victoryCountdown = 0;
  private victoryCountdownMax = 5;
  private victoryActive = false;

  private spawnRoomEnemies() {
    const room = getCurrentRoom(this.dungeon);
    this.enemies = [];
    this.bossWasSpawned = false;
    resetTrapEffects();
    
    // Handle vendor room ambient
    const wasInVendor = this.inVendorRoom;
    this.inVendorRoom = room.type === 'vendor';
    if (this.inVendorRoom && !wasInVendor) {
      stopBackgroundMusic();
      startVendorAmbience();
    } else if (!this.inVendorRoom && wasInVendor) {
      stopVendorAmbience();
      startBackgroundMusic();
    }
    
    if (!room.cleared) {
      for (const spawn of room.enemies) {
        if (spawn.type === 'boss') {
          const boss = createBossForFloor(this.dungeon.floor, spawn.x, spawn.y);
          this.enemies.push(boss);
          this.bossWasSpawned = true;
          console.log(`[BOSS] Spawned boss for floor ${this.dungeon.floor}, HP: ${boss.hp}`);
        } else {
          const enemy = createEnemy(spawn.type, spawn.x, spawn.y);
          scaleEnemyForFloor(enemy, this.dungeon.floor);
          this.enemies.push(enemy);
        }
      }
      if (room.isBossRoom && !this.bossIntroPlayed) {
        setBossFloor(this.dungeon.floor);
        (window as any).__bossFloor = this.dungeon.floor;
        this.bossKillFloor = this.dungeon.floor;
        this.bossIntroPlayed = true;
        console.log(`[BOSS] Boss room entered on floor ${this.dungeon.floor}, total enemies: ${this.enemies.length}`);
        triggerBossIntro(this.dungeon.floor);
        setTimeout(() => SFX.bossRoarForFloor(this.dungeon.floor), 300);
      }
    }
  }

  private update(dt: number) {
    this.stats.timePlayed += dt;
    this.gameTime += dt;

    // Boss intro — pause gameplay during intro
    if (isBossIntroActive()) {
      updateBossIntro(dt);
      return;
    }

    // Periodic auto-save every 30 seconds
    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      saveGame(this.player, this.dungeon, this.stats);
    }

    // Victory countdown — player can move but no combat
    this.updateVictoryCountdown(dt);
    if (this.victoryActive) {
      // Still allow movement during countdown
      const moveDir = this.input.getMoveDir();
      updatePlayer(this.player, moveDir, dt);
      this.particles = updateParticles(this.particles, dt);
      this.effects = this.effects.filter(fx => { fx.timer -= dt; return fx.timer > 0; });
      return;
    }

    // Tutorial timer
    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt;
      // Dismiss tutorial on any key press or mouse click
      if (this.input.getMoveDir().x !== 0 || this.input.getMoveDir().y !== 0 || 
          this.input.isMouseJustPressed(0) || this.input.isMouseJustPressed(2) ||
          this.input.wantsDash()) {
        this.tutorialTimer = 0;
      }
    }
    // Player movement
    const moveDir = this.input.getMoveDir();
    updatePlayer(this.player, moveDir, dt);

    // Idle time tracking
    const isPlayerMoving = moveDir.x !== 0 || moveDir.y !== 0;
    if (isPlayerMoving) {
      this.player.idleTime = 0;
    } else {
      this.player.idleTime += dt;
    }

    // XP glow timer countdown
    if (this.player.xpGlowTimer > 0) {
      this.player.xpGlowTimer -= dt;
    }

    // Soul trail particles when walking (brighter during XP glow)
    if (isPlayerMoving && !this.player.isDashing) {
      this.soulParticleTimer -= dt;
      if (this.soulParticleTimer <= 0) {
        const xpBurst = this.player.xpGlowTimer > 0;
        this.soulParticleTimer = xpBurst ? 0.05 : 0.12;
        const baseAlpha = xpBurst ? 0.6 : 0.3;
        const extraSize = xpBurst ? 0.5 : 0;
        const color = xpBurst
          ? `rgba(120, 255, 200, ${baseAlpha + Math.random() * 0.3})`
          : `rgba(100, 180, 255, ${baseAlpha + Math.random() * 0.3})`;
        this.particles.push({
          x: this.player.x + (Math.random() - 0.5) * 8,
          y: this.player.y + 4 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 6,
          vy: -8 - Math.random() * 12,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 1 + Math.random() * 1.5 + extraSize,
          color,
          type: 'ghost',
        });
      }
    } else if (this.player.xpGlowTimer > 0) {
      // Even when standing still, emit XP glow particles
      this.soulParticleTimer -= dt;
      if (this.soulParticleTimer <= 0) {
        this.soulParticleTimer = 0.08;
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: this.player.x + Math.cos(angle) * 6,
          y: this.player.y + Math.sin(angle) * 6,
          vx: Math.cos(angle) * 10,
          vy: -12 - Math.random() * 8,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          size: 1 + Math.random() * 1,
          color: `rgba(120, 255, 200, ${0.5 + Math.random() * 0.3})`,
          type: 'ghost',
        });
      }
    }

    // Player trail
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.03;
      this.player.trail.push({ x: this.player.x, y: this.player.y });
      if (this.player.trail.length > 8) this.player.trail.shift();
    }

    // Dash
    if (this.input.wantsDash() && (moveDir.x !== 0 || moveDir.y !== 0)) {
      if (tryDash(this.player)) {
        spawnSpark(this.particles, this.player.x, this.player.y, C.COLORS.playerLight, 8);
        SFX.dash();
      }
    }

    // Dash trail particles
    if (this.player.isDashing) {
      spawnTrail(this.particles, this.player.x, this.player.y, C.COLORS.playerTrail);
    }

    // Combat - melee
    if (this.input.isMouseJustPressed(0)) {
      const mouse = this.input.getMousePos();
      if (tryMelee(this.player, mouse.x, mouse.y)) {
        this.lastAttackWasMelee = true;
        this.doMeleeHit();
        SFX.meleeSwing();
        // Cruel Repetition — 30% chance to auto-repeat
        if (isAmuletEquipped(this.amuletInventory, 'cruel_repetition') && Math.random() < 0.3) {
          this.cruelRepTimer = 0.15;
          this.cruelRepIsMelee = true;
          this.cruelRepTarget = { ...mouse };
        }
      }
    }

    // Combat - ranged
    if (this.input.isMouseJustPressed(2) || this.input.isDown('e')) {
      if (canRangedAttack(this.player)) {
        this.lastAttackWasMelee = false;
        doRangedAttack(this.player);
        const mouse = this.input.getMousePos();
        const projs = createPlayerProjectile(this.player, mouse.x, mouse.y);
        this.projectiles.push(...projs);
        SFX.rangedShoot();
        // Cruel Repetition — 30% chance to auto-repeat
        if (isAmuletEquipped(this.amuletInventory, 'cruel_repetition') && Math.random() < 0.3) {
          this.cruelRepTimer = 0.15;
          this.cruelRepIsMelee = false;
          this.cruelRepTarget = { ...mouse };
        }
      }
    }

    // Cruel Repetition auto-repeat
    if (this.cruelRepTimer > 0) {
      this.cruelRepTimer -= dt;
      if (this.cruelRepTimer <= 0) {
        if (this.cruelRepIsMelee) {
          this.player.meleeCooldown = 0; // force allow
          if (tryMelee(this.player, this.cruelRepTarget.x, this.cruelRepTarget.y)) {
            this.doMeleeHit();
            SFX.meleeSwing();
            spawnDamageText(this.particles, this.player.x, this.player.y - 16, '🔁', '#aa88ff');
          }
        } else {
          this.player.rangedCooldown = 0;
          doRangedAttack(this.player);
          const projs = createPlayerProjectile(this.player, this.cruelRepTarget.x, this.cruelRepTarget.y);
          this.projectiles.push(...projs);
          SFX.rangedShoot();
          spawnDamageText(this.particles, this.player.x, this.player.y - 16, '🔁', '#aa88ff');
        }
      }
    }

    // Obstacle collision
    const room = getCurrentRoom(this.dungeon);
    this.collideWithObstacles(this.player, room.obstacles);

    // Update enemies — collect dead enemies, remove after loop to avoid splice corruption
    const deadEnemySet = new Set<EnemyState>();
    
    for (const enemy of this.enemies) {
      if (deadEnemySet.has(enemy)) continue;
      const result = updateEnemy(enemy, this.player, dt, this.enemies);
      
      // Add trails for projectiles from enemies
      for (const proj of result.projectiles) {
        proj.trail = [];
      }
      this.projectiles.push(...result.projectiles);
      
      this.collideWithObstacles(enemy, room.obstacles);

      // Bomber explosion
      if (result.exploded) {
        this.handleBomberExplosion(enemy, deadEnemySet);
        deadEnemySet.add(enemy);
        continue;
      }

      // Wraith ghost particles
      if (enemy.type === 'wraith' && enemy.aiState === 'teleport') {
        spawnGhostParticle(this.particles, enemy.x, enemy.y);
      }
      if (enemy.type === 'wraith' && enemy.aiState === 'phasing') {
        spawnGhostParticle(this.particles, enemy.x, enemy.y);
        SFX.wraithTeleport();
      }

      // Necromancer summoning
      if (enemy.type === 'necromancer' && enemy.summonTimer <= 0) {
        enemy.summonTimer = C.NECRO_SUMMON_COOLDOWN;
        SFX.necroSummon();
        spawnGhostParticle(this.particles, enemy.x, enemy.y);
        spawnExplosion(this.particles, enemy.x, enemy.y, 8);
        // Summon 2-3 swarm minions around the necromancer
        const summonCount = 2 + Math.floor(Math.random() * 2);
        for (let s = 0; s < summonCount; s++) {
          const angle = (s / summonCount) * Math.PI * 2 + Math.random();
          const dist = 20 + Math.random() * 15;
          const ne = createEnemy('swarm', enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist);
          scaleEnemyForFloor(ne, this.dungeon.floor);
          this.enemies.push(ne);
        }
        this.addEffect('flash', 0.5, 0.15, 'rgb(150, 50, 255)');
      }

      // Stalker lunge screech
      if (enemy.type === 'stalker' && enemy.lunging && enemy.stateTimer > 0.25) {
        SFX.stalkerLunge();
        this.addEffect('shake', 3, 0.15);
      }

      // Flash Hunter appear effect
      if (enemy.type === 'flash_hunter' && enemy.aiState === 'chase' && enemy.stateTimer > 0.12) {
        SFX.flashHunterAppear();
        this.addEffect('flash', 0.8, 0.06, 'rgb(255, 255, 255)');
      }

      // Distortion entry effect
      if (enemy.type === 'distortion' && enemy.stealthAlpha > 0.5 && enemy.stateTimer > 3.8) {
        SFX.distortionEntry();
        this.addEffect('shake', 6, 0.3);
        this.addEffect('flash', 0.6, 0.2, 'rgb(80, 0, 120)');
      }

      // Flicker Fiend buzz
      if (enemy.type === 'flicker_fiend' && enemy.stealthAlpha > 0.5 && enemy.attackCooldown <= 0) {
        SFX.flickerFiendBuzz();
        enemy.attackCooldown = 1.5 + Math.random();
      }

      // Warper teleport sound
      if (enemy.type === 'warper' && enemy.flashTime > 0.06) {
        SFX.warperTeleport();
        this.addEffect('flash', 0.4, 0.08, 'rgb(0, 60, 180)');
      }

      // Accelerator in-light charge sound
      if (enemy.type === 'accelerator' && enemy.stealthAlpha > 0.8 && enemy.attackCooldown <= 0) {
        SFX.acceleratorCharge();
        enemy.attackCooldown = 2;
        this.addEffect('shake', 2, 0.1);
      }

      // Contact damage
      if (this.circleCollide(this.player.x, this.player.y, this.player.width / 2, enemy.x, enemy.y, enemy.width / 2)) {
        const rawDmg = enemy.damage;
        const result = this.applyDamageToPlayer(rawDmg);
        if (result.died) { this.gameOver(); return; }
        if (result.damaged) {
          this.addEffect('shake', 4, 0.15);
          this.addEffect('flash', 1, 0.12, 'rgb(255, 0, 0)');
          spawnDamageText(this.particles, this.player.x, this.player.y, `-${result.actualDmg}`, C.COLORS.damageText);
          spawnSpark(this.particles, this.player.x, this.player.y, '#ff4444', 4);
          SFX.playerHit();
          // Thorns
          if (this.player.thorns > 0) {
            const thornsDmg = Math.floor(rawDmg * this.player.thorns);
            const dead = damageEnemy(enemy, thornsDmg, 0, 0);
            spawnDamageText(this.particles, enemy.x, enemy.y, `${thornsDmg}`, '#ff88ff');
            if (dead) {
              this.onEnemyKilled(enemy);
              deadEnemySet.add(enemy);
            }
          }
        }
      }
    }
    
    // Remove dead enemies after all processing
    if (deadEnemySet.size > 0) {
      this.enemies = this.enemies.filter(e => !deadEnemySet.has(e));
    }

    // Process boss special actions
    const bossAction = consumeBossAction();
    if (bossAction) {
      if (bossAction.screenShake > 0) {
        this.addEffect('shake', bossAction.screenShake, 0.5);
        this.addEffect('flash', 1, 0.3, 'rgb(100, 0, 0)');
        HorrorSFX.phantomScream();
      }
      if (bossAction.lightsOut > 0) {
        // Activate lights out via trap effect
        activateTrap({ x: 0, y: 0, type: 'lights_out', triggered: true, hintSeed: 0 }, this.player, this.dungeon.floor);
      }
      if (bossAction.lockDoors > 0) {
        activateTrap({ x: 0, y: 0, type: 'lock_doors', triggered: true, hintSeed: 0 }, this.player, this.dungeon.floor);
      }
      if (bossAction.panic) {
        activateTrap({ x: 0, y: 0, type: 'panic', triggered: true, hintSeed: 0 }, this.player, this.dungeon.floor);
      }
      if (bossAction.spawnEnemies.length > 0) {
        for (const spawn of bossAction.spawnEnemies) {
          const enemy = createEnemy(spawn.type, spawn.x, spawn.y);
          scaleEnemyForFloor(enemy, this.dungeon.floor);
          this.enemies.push(enemy);
        }
      }
    }

    // Update projectiles — use mark-and-sweep to avoid splice corruption
    const projDeadEnemies = new Set<EnemyState>();
    this.projectiles = this.projectiles.filter(p => {
      // Update trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.shift();

      const alive = updateProjectile(p, dt);
      if (!alive) return false;

      if (p.isPlayerOwned) {
        for (const e of this.enemies) {
          if (projDeadEnemies.has(e)) continue;
          if (e.spawnTimer > 0) continue;
          if (this.circleCollide(p.x, p.y, p.size, e.x, e.y, e.width / 2)) {
            let dmg = Math.floor(p.damage * this.player.damageMultiplier * this.getAmuletDamageMult());
            // Berserker
            if (this.player.berserker && this.player.hp / this.player.maxHp < 0.3) {
              dmg = Math.floor(dmg * 1.8);
            }
            // Crit
            if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
              dmg = Math.floor(dmg * this.player.critMultiplier);
              spawnDamageText(this.particles, e.x, e.y - 8, 'CRIT!', '#ffff00');
            }
            const dx = e.x - p.x, dy = e.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const dead = damageEnemy(e, dmg, (dx / dist) * 3, (dy / dist) * 3);
            this.stats.damageDealt += dmg;
            spawnDamageText(this.particles, e.x, e.y, `${dmg}`);
            spawnBlood(this.particles, e.x, e.y, 4);
            SFX.enemyHit();
            
            
            // Chain lightning
            if (this.player.chainBounces > 0 && dead === false) {
              this.doChainBounce(e, dmg, this.player.chainBounces, projDeadEnemies);
            }

            if (dead) {
              this.onEnemyKilled(e);
              projDeadEnemies.add(e);
            }

            if (p.explosive) {
              spawnExplosion(this.particles, p.x, p.y, 20);
              this.addEffect('shake', 5, 0.2);
              SFX.explosion();
              // AOE damage
              for (const ae of this.enemies) {
                if (projDeadEnemies.has(ae)) continue;
                if (this.circleCollide(p.x, p.y, 30, ae.x, ae.y, ae.width / 2)) {
                  const aeDmg = Math.floor(dmg * 0.5);
                  const adead = damageEnemy(ae, aeDmg, 0, 0);
                  if (adead) {
                    this.onEnemyKilled(ae);
                    projDeadEnemies.add(ae);
                  }
                }
              }
            }
            if (!p.piercing) return false;
          }
        }
      } else {
        if (this.circleCollide(p.x, p.y, p.size, this.player.x, this.player.y, this.player.width / 2)) {
          const result = this.applyDamageToPlayer(p.damage);
          if (result.damaged) {
            this.addEffect('shake', 3, 0.1);
            this.addEffect('flash', 1, 0.1, 'rgb(255, 0, 0)');
            spawnDamageText(this.particles, this.player.x, this.player.y, `-${result.actualDmg}`, C.COLORS.damageText);
            SFX.playerHit();
          }
          if (result.died) { this.gameOver(); return false; }
          return false;
        }
      }
      return true;
    });
    // Remove projectile-killed enemies
    if (projDeadEnemies.size > 0) {
      this.enemies = this.enemies.filter(e => !projDeadEnemies.has(e));
    }

    // Particles
    this.particles = updateParticles(this.particles, dt);

    // Ambient effects
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.2;
      spawnDust(this.particles, this.player.x + Math.random() * 80 - 40, this.player.y + Math.random() * 80 - 40);
    }

    // Ambient embers near enemies
    if (this.enemies.length > 0 && Math.random() < 0.05) {
      const e = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      spawnEmbers(this.particles, e.x, e.y, 2);
    }

    // Ambient drone removed — psychological horror ambient runs independently

    // Combat tension audio system
    let closestDist = 9999;
    for (const e of this.enemies) {
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) closestDist = d;
    }
    updateCombatTension(this.enemies.length, closestDist, dt);

    // Horror events — much sparser for psychological tension
    this.horrorTimer -= dt;
    if (this.horrorTimer <= 0) {
      this.horrorTimer = 10 + Math.random() * 20; // long gaps between events
      const evt = createHorrorEvent();
      if (evt) {
        this.horrorEvents.push(evt);
        // Only occasionally play SFX — silence is scarier
        if (evt.type === 'whisper' && Math.random() < 0.4) HorrorSFX.whisper();
        else if (evt.type === 'heartbeat' && Math.random() < 0.3) HorrorSFX.heartbeat();
        else if (evt.type === 'scream' && Math.random() < 0.15) HorrorSFX.distantScream();
        else if (evt.type === 'flicker' && Math.random() < 0.3) HorrorSFX.metalCreak();
      }
    }
    // Update horror events
    this.horrorEvents = this.horrorEvents.filter(e => {
      e.timer -= dt;
      return e.timer > 0;
    });

    // Fog particles
    this.fogTimer -= dt;
    if (this.fogTimer <= 0) {
      this.fogTimer = 0.4;
      spawnFog(this.particles, this.player.x, this.player.y);
    }

    // Special room interactions (old single-trap system)
    this.handleSpecialRoomInteraction(room);

    // Hidden trap system (new)
    this.handleHiddenTraps(room);

    // Update active trap debuffs
    updateTrapEffects(this.player, dt);

    // Block dash if no_dash effect is active
    if (hasEffect('no_dash')) {
      this.player.dashCooldown = 999;
    }

    // Regen
    if (this.player.upgrades.includes('regen1')) {
      this.regenTimer += dt;
      if (this.regenTimer >= 5) {
        this.regenTimer = 0;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      }
    }


    // Shadow clone AI
    if (this.player.shadowClone) {
      this.updateShadowClone(dt);
    }

    // === AMULET TICK EFFECTS ===
    // War Rhythm: apply attack speed bonus from stacks, decay when not killing
    if (isAmuletEquipped(this.amuletInventory, 'war_rhythm')) {
      // Apply War Rhythm attack speed bonus: reset base then add bonus
      const warBonus = 1 + this.warRhythm.stacks * this.warRhythm.bonusPerStack;
      // We store the war rhythm multiplier separately and apply each frame
      this.player.attackSpeedMult = this.getBaseAttackSpeedMult() * warBonus;

      if (this.warRhythm.stacks > 0) {
        this.warRhythm.decayTimer -= dt;
        if (this.warRhythm.decayTimer <= 0) {
          this.warRhythm.stacks = Math.max(0, this.warRhythm.stacks - 1);
          this.warRhythm.decayTimer = 1;
        }
      }
    }

    // Doom execute - check all enemies below 15% HP
    if (this.player.upgrades.includes('doom1')) {
      const doomDeadSet = new Set<EnemyState>();
      for (const e of this.enemies) {
        if (e.type === 'boss') continue; // don't execute bosses
        if (e.hp > 0 && e.hp / e.maxHp < 0.15) {
          spawnExplosion(this.particles, e.x, e.y, 12);
          spawnDamageText(this.particles, e.x, e.y, '☠️ EXECUTE', '#ff0000');
          this.onEnemyKilled(e);
          doomDeadSet.add(e);
        }
      }
      if (doomDeadSet.size > 0) {
        this.enemies = this.enemies.filter(e => !doomDeadSet.has(e));
      }
    }

    // Room cleared — boss rooms require all enemies dead, never auto-clear
    if (!room.cleared && this.enemies.length === 0) {
      // Safety: boss rooms must have had enemies to clear
      if (room.isBossRoom && !this.bossWasSpawned) {
        // Boss didn't spawn properly — don't clear, just wait
        console.log(`[BOSS] Boss room but no boss spawned yet, skipping clear`);
        return;
      }
      room.cleared = true;
      SFX.doorOpen();
      spawnExplosion(this.particles, C.dims.gw / 2, C.dims.gh / 2, 8);
      if (room.isBossRoom && !this.pendingNextFloor) {
        console.log(`[BOSS] Boss defeated on floor ${this.dungeon.floor}, advancing...`);
        this.pendingNextFloor = true;
        // KILL IMPACT — slow-mo + dramatic death sequence
        this.bossKillSequence();
      }
    }

    // Door transition — blocked if doors are locked by trap
    if (room.cleared && !room.isBossRoom && getDoorsLockedTimer() <= 0) {
      this.checkDoorTransition(room);
    }

    // Screen effects
    this.effects = this.effects.filter(fx => {
      fx.timer -= dt;
      return fx.timer > 0;
    });
  }

  private handleBomberExplosion(bomber: EnemyState, deadSet: Set<EnemyState>) {
    spawnBomberExplosion(this.particles, bomber.x, bomber.y);
    this.addEffect('shake', 8, 0.3);
    this.addEffect('flash', 1, 0.15, 'rgb(255, 150, 50)');
    SFX.explosion();

    // Damage player if in range
    const dx = this.player.x - bomber.x;
    const dy = this.player.y - bomber.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < C.BOMBER_EXPLOSION_RADIUS) {
      const dmg = Math.floor(bomber.damage * (1 - dist / C.BOMBER_EXPLOSION_RADIUS));
      const died = damagePlayer(this.player, dmg);
      if (this.player.invincibleTime === 0.5) {
        this.stats.damageTaken += dmg;
        spawnDamageText(this.particles, this.player.x, this.player.y, `-${dmg}`, '#ff8800');
        SFX.playerHit();
      }
      if (died) this.gameOver();
    }

    // Damage nearby enemies too — mark dead instead of splicing
    for (const e of this.enemies) {
      if (deadSet.has(e)) continue;
      const edx = e.x - bomber.x, edy = e.y - bomber.y;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist < C.BOMBER_EXPLOSION_RADIUS) {
        const eDmg = Math.floor(bomber.damage * 0.5);
        const dead = damageEnemy(e, eDmg, edx / (eDist || 1) * 5, edy / (eDist || 1) * 5);
        if (dead) {
          this.onEnemyKilled(e);
          deadSet.add(e);
        }
      }
    }

    this.stats.enemiesDefeated++;
    const xp = getXPForEnemy('bomber');
    const leveledUp = addXP(this.player, xp);
    if (leveledUp) this.handleLevelUp();
  }

  private doMeleeHit() {
    const range = C.MELEE_RANGE * this.player.areaMultiplier;
    const angle = this.player.meleeAngle;
    this.addEffect('shake', 5, 0.12);
    let hitAny = false;
    const meleeDeadSet = new Set<EnemyState>();
    
    for (const e of this.enemies) {
      if (e.spawnTimer > 0) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range + e.width / 2) continue;

      const enemyAngle = Math.atan2(dy, dx);
      let angleDiff = enemyAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > C.MELEE_ARC / 2) continue;

      let dmg = Math.floor(this.player.baseDamage * this.player.damageMultiplier * this.getAmuletDamageMult());
      // Berserker
      if (this.player.berserker && this.player.hp / this.player.maxHp < 0.3) {
        dmg = Math.floor(dmg * 1.8);
      }
      // Crit
      if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
        dmg = Math.floor(dmg * this.player.critMultiplier);
        spawnDamageText(this.particles, e.x, e.y - 8, 'CRIT!', '#ffff00');
      }
      // Stronger knockback for melee
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      const dead = damageEnemy(e, dmg, nx * 8, ny * 8);
      this.stats.damageDealt += dmg;
      spawnDamageText(this.particles, e.x, e.y, `${dmg}`);
      spawnBlood(this.particles, e.x, e.y, 8);
      spawnSpark(this.particles, e.x, e.y, C.COLORS.playerLight, 8);
      spawnSpark(this.particles, e.x, e.y, '#ffffff', 4);
      hitAny = true;

      if (dead) {
        this.onEnemyKilled(e, true);
        meleeDeadSet.add(e);
      }
    }
    
    if (meleeDeadSet.size > 0) {
      this.enemies = this.enemies.filter(e => !meleeDeadSet.has(e));
    }

    if (hitAny) {
      SFX.meleeHit();
      this.addEffect('shake', 6, 0.15);
      this.addEffect('flash', 0.4, 0.06, 'rgb(200, 220, 255)');
      // Melee hit reduces dash cooldown
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - 0.25);
    }
  }

  private onEnemyKilled(e: EnemyState, byMelee = false) {
    this.stats.enemiesDefeated++;
    const xpAmount = getXPForEnemy(e.type);
    spawnXPParticle(this.particles, e.x, e.y, 4);
    
    // Soul drop
    const soulAmount = this.getSoulsForEnemy(e.type);
    this.player.souls += soulAmount;
    spawnDamageText(this.particles, e.x, e.y + 10, `+${soulAmount} 👻`, '#88ccff');
    SFX.coinPickup();
    
    if (e.type === 'boss') {
      // BOSS KILL IMPACT — massive explosion + slow-mo
      this.slowMoTimer = 1.2;
      this.slowMoFactor = 0.15;
      spawnExplosion(this.particles, e.x, e.y, 50);
      spawnSpark(this.particles, e.x, e.y, '#ffffff', 20);
      spawnSpark(this.particles, e.x, e.y, '#ffaa00', 15);
      spawnEmbers(this.particles, e.x, e.y, 20);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        spawnExplosion(this.particles, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 15);
      }
      this.addEffect('shake', 15, 0.8);
      this.addEffect('flash', 1, 0.5, 'rgb(255, 255, 255)');
      setTimeout(() => this.addEffect('flash', 0.8, 0.3, 'rgb(255, 200, 100)'), 200);
      setTimeout(() => this.addEffect('flash', 0.6, 0.2, 'rgb(255, 100, 50)'), 400);
      SFX.bossKill(this.bossKillFloor);
      // Drop amulet
      const amuletId = getRandomBossAmuletDrop(this.amuletInventory);
      if (amuletId) {
        this.callbacks.onAmuletDrop(amuletId);
        spawnDamageText(this.particles, e.x, e.y - 20, '🔮 AMULETO!', '#cc88ff');
      }
    } else {
      spawnExplosion(this.particles, e.x, e.y, 10);
      SFX.enemyDeath();
    }

    // War Rhythm amulet — gain attack speed on kill
    if (isAmuletEquipped(this.amuletInventory, 'war_rhythm')) {
      this.warRhythm.stacks = Math.min(this.warRhythm.maxStacks, this.warRhythm.stacks + 1);
      this.warRhythm.decayTimer = this.warRhythm.decayDelay;
    }

    // Melee kill reward: small heal + brief speed boost
    if (byMelee) {
      const healAmt = 3;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
      spawnDamageText(this.particles, this.player.x, this.player.y - 14, `+${healAmt}`, C.COLORS.healText);
      // Temporary speed burst for 0.8s
      this.player.moveSpeedMult *= 1.15;
      setTimeout(() => { this.player.moveSpeedMult /= 1.15; }, 800);
      // Brief slow-mo on melee kill for impact feel
      this.slowMoTimer = Math.max(this.slowMoTimer, 0.08);
      this.slowMoFactor = Math.min(this.slowMoFactor, 0.4);
    }

    if (this.player.lifesteal > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.lifesteal);
      spawnDamageText(this.particles, this.player.x, this.player.y - 10, `+${this.player.lifesteal}`, C.COLORS.healText);
    }

    SFX.xpPickup();
    this.player.xpGlowTimer = 1.0;
    const xpGain = Math.floor(xpAmount * this.player.xpMultiplier);
    const leveledUp = addXP(this.player, xpGain);
    if (leveledUp) this.handleLevelUp();
  }

  private handleLevelUp() {
    this.stats.level = this.player.level;

    this.pause();
    const choices = getRandomUpgrades(3, this.player.upgrades);
    if (choices.length > 0) {
      SFX.levelUp();
      this.callbacks.onLevelUp(choices);
    } else {
      this.resume();
    }
  }

  private checkDoorTransition(room: DungeonRoom) {
    if (!room.cleared) return;
    const p = this.player;
    const midX = C.dims.gw / 2;
    const midY = C.dims.gh / 2;
    const dw = C.DOOR_WIDTH / 2;

    let newGridX = room.gridX;
    let newGridY = room.gridY;
    let entered = false;
    let newPX = p.x, newPY = p.y;
    // Player is clamped at margin = TILE_SIZE + width/2, so use margin + 6 for detection
    const doorThreshold = C.TILE_SIZE + p.width / 2 + 6;

    if (room.doors.north && p.y < doorThreshold && Math.abs(p.x - midX) < dw) {
      newGridY--; entered = true; newPY = C.dims.gh - doorThreshold - 2;
    } else if (room.doors.south && p.y > C.dims.gh - doorThreshold && Math.abs(p.x - midX) < dw) {
      newGridY++; entered = true; newPY = doorThreshold + 2;
    } else if (room.doors.west && p.x < doorThreshold && Math.abs(p.y - midY) < dw) {
      newGridX--; entered = true; newPX = C.dims.gw - doorThreshold - 2;
    } else if (room.doors.east && p.x > C.dims.gw - doorThreshold && Math.abs(p.y - midY) < dw) {
      newGridX++; entered = true; newPX = doorThreshold + 2;
    }

    if (entered) {
      const newRoom = moveToRoom(this.dungeon, newGridX, newGridY);
      if (newRoom) {
        this.player.x = newPX;
        this.player.y = newPY;
        this.player.trail = [];
        this.projectiles = [];
        this.stats.roomsExplored++;
        this.spawnRoomEnemies();
        // Auto-save on room transition
        saveGame(this.player, this.dungeon, this.stats);
      }
    }
  }

  private nextFloor() {
    const newFloor = this.dungeon.floor + 1;
    this.dungeon = generateDungeon(newFloor);
    this.player.x = C.dims.gw / 2;
    this.player.y = C.dims.gh / 2;
    this.player.trail = [];
    this.projectiles = [];
    this.enemies = [];
    this.bossIntroPlayed = false;
    this.pendingNextFloor = false;
    this.spawnRoomEnemies();
    this.stats.floor = newFloor;
    this.callbacks.onFloorChange(newFloor);
    SFX.floorChange();
    // Save on floor change
    saveGame(this.player, this.dungeon, this.stats);
  }

  private gameOver() {
    // Immortal revive
    if (this.player.hasRevive && !this.player.reviveUsed) {
      this.player.reviveUsed = true;
      this.player.hp = this.player.maxHp;
      this.player.invincibleTime = 2;
      spawnExplosion(this.particles, this.player.x, this.player.y, 25);
      spawnDamageText(this.particles, this.player.x, this.player.y - 15, '🔮 REVIVIDO!', '#ffaa00');
      this.addEffect('flash', 1, 0.5, 'rgb(255, 200, 50)');
      this.addEffect('shake', 10, 0.4);
      SFX.levelUp();
      return;
    }
    this.running = false;
    SFX.playerDeath();
    clearSave();
    this.callbacks.onGameOver(this.stats);
  }

  private addEffect(type: 'shake' | 'flash' | 'slowmo', intensity: number, duration: number, color?: string) {
    this.effects.push({ type, intensity, duration, timer: duration, color });
  }

  private applyDamageToPlayer(rawDmg: number): { damaged: boolean; died: boolean; actualDmg: number } {
    if (this.player.invincibleTime > 0) return { damaged: false, died: false, actualDmg: 0 };
    // Apply armor reduction
    const actualDmg = Math.max(1, Math.floor(rawDmg * this.player.armor));
    const prevHp = this.player.hp;
    const died = damagePlayer(this.player, actualDmg);
    if (prevHp === this.player.hp) return { damaged: false, died: false, actualDmg: 0 };
    this.stats.damageTaken += actualDmg;
    if (died) {
      // gameOver handles immortal check
      return { damaged: true, died: true, actualDmg };
    }
    return { damaged: true, died: false, actualDmg };
  }

  private doChainBounce(hitEnemy: EnemyState, baseDmg: number, bounces: number, deadSet: Set<EnemyState>) {
    let lastX = hitEnemy.x, lastY = hitEnemy.y;
    const hit = new Set<EnemyState>([hitEnemy]);
    for (let i = 0; i < bounces; i++) {
      let closest: EnemyState | null = null;
      let closestDist = 80; // max chain range
      for (const e of this.enemies) {
        if (hit.has(e) || deadSet.has(e)) continue;
        const dx = e.x - lastX, dy = e.y - lastY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) { closestDist = d; closest = e; }
      }
      if (!closest) break;
      hit.add(closest);
      const chainDmg = Math.floor(baseDmg * 0.6);
      const dead = damageEnemy(closest, chainDmg, 0, 0);
      spawnDamageText(this.particles, closest.x, closest.y, `⚡${chainDmg}`, '#44aaff');
      spawnSpark(this.particles, closest.x, closest.y, '#44aaff', 4);
      if (dead) { this.onEnemyKilled(closest); deadSet.add(closest); }
      lastX = closest.x; lastY = closest.y;
    }
  }

  private updateShadowClone(dt: number) {
    const p = this.player;
    // Clone orbits around player
    p.shadowCloneAngle += dt * 2;
    const orbitDist = 35;
    p.shadowCloneX = p.x + Math.cos(p.shadowCloneAngle) * orbitDist;
    p.shadowCloneY = p.y + Math.sin(p.shadowCloneAngle) * orbitDist;
    // Clone attacks nearby enemies
    this.shadowCloneAttackTimer -= dt;
    if (this.shadowCloneAttackTimer <= 0) {
      this.shadowCloneAttackTimer = 0.8;
      let closestEnemy: EnemyState | null = null;
      let closestDist = 60;
      for (const e of this.enemies) {
        if (e.spawnTimer > 0) continue;
        const dx = e.x - p.shadowCloneX, dy = e.y - p.shadowCloneY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) { closestDist = d; closestEnemy = e; }
      }
      if (closestEnemy) {
        const dmg = Math.floor(p.baseDamage * p.damageMultiplier * 0.6);
        const dead = damageEnemy(closestEnemy, dmg, 0, 0);
        spawnDamageText(this.particles, closestEnemy.x, closestEnemy.y, `${dmg}`, '#8888ff');
        spawnSpark(this.particles, p.shadowCloneX, p.shadowCloneY, '#8888ff', 3);
        if (dead) {
          this.onEnemyKilled(closestEnemy);
          this.enemies = this.enemies.filter(e => e !== closestEnemy);
        }
      }
    }
    // Ghost particles for clone
    if (Math.random() < 0.3) {
      this.particles.push({
        x: p.shadowCloneX + (Math.random() - 0.5) * 6,
        y: p.shadowCloneY + Math.random() * 4,
        vx: (Math.random() - 0.5) * 4,
        vy: -6 - Math.random() * 6,
        life: 0.4,
        maxLife: 0.4,
        size: 1 + Math.random(),
        color: 'rgba(100, 100, 255, 0.5)',
        type: 'ghost',
      });
    }
  }

  private bossKillSequence() {
    // Start victory countdown — 5 seconds of calm before next floor
    this.victoryActive = true;
    this.victoryCountdown = this.victoryCountdownMax;
    
    // Kill impact effects
    this.slowMoTimer = 0.8;
    this.slowMoFactor = 0.2;
    this.addEffect('flash', 1, 0.5, 'rgb(255, 255, 200)');
    this.addEffect('shake', 12, 0.6);
    spawnExplosion(this.particles, C.dims.gw / 2, C.dims.gh / 2, 30);
    
    // Play calm victory tone after initial impact
    setTimeout(() => {
      SFX.bossKill(this.bossKillFloor);
    }, 300);
  }
  
  private updateVictoryCountdown(dt: number) {
    if (!this.victoryActive) return;
    this.victoryCountdown -= dt;
    if (this.victoryCountdown <= 0) {
      this.victoryActive = false;
      this.pendingNextFloor = false;
      this.nextFloor();
    }
  }

  private handleHiddenTraps(room: DungeonRoom) {
    if (!room.hiddenTraps || room.hiddenTraps.length === 0) return;
    
    const trap = checkTrapCollision(this.player, room.hiddenTraps);
    if (!trap) return;

    // Massive impact feedback
    HorrorSFX.trapSpring();
    this.addEffect('shake', 10, 0.5);
    this.addEffect('flash', 1, 0.3, 'rgb(255, 0, 0)');
    spawnExplosion(this.particles, trap.x, trap.y, 15);
    spawnSpark(this.particles, trap.x, trap.y, '#ff0000', 12);

    const result = activateTrap(trap, this.player, this.dungeon.floor);

    // Spawn enemies from trap
    if (result.spawnEnemies.length > 0) {
      HorrorSFX.phantomScream();
      for (const spawn of result.spawnEnemies) {
        const enemy = createEnemy(spawn.type as any, spawn.x, spawn.y);
        scaleEnemyForFloor(enemy, this.dungeon.floor);
        this.enemies.push(enemy);
      }
    }

    // Buff all enemies
    if (result.buffEnemies) {
      for (const e of this.enemies) {
        e.maxHp *= 2;
        e.hp = e.maxHp;
        e.damage = Math.floor(e.damage * 1.5);
        e.flashTime = 0.3;
      }
    }

    // Speed boost all enemies
    if (result.speedBoostEnemies) {
      for (const e of this.enemies) {
        e.speed *= 2.5;
        e.flashTime = 0.3;
      }
    }
  }

  private handleSpecialRoomInteraction(room: DungeonRoom) {
    const p = this.player;
    const cx = C.dims.gw / 2;
    const cy = C.dims.gh / 2;
    const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);

    if (room.type === 'treasure' && !room.treasureCollected && room.cleared && dist < 25) {
      room.treasureCollected = true;
      HorrorSFX.chestOpen();
      const heal = Math.floor(p.maxHp * 0.3);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      spawnDamageText(this.particles, p.x, p.y - 10, `+${heal} HP`, C.COLORS.healText);
      const xp = 15 + this.dungeon.floor * 5;
      const leveledUp = addXP(p, xp);
      spawnDamageText(this.particles, p.x, p.y - 20, `+${xp} XP`, C.COLORS.xpText);
      spawnExplosion(this.particles, cx, cy, 15);
      this.addEffect('flash', 1, 0.2, 'rgb(255, 200, 50)');
      if (leveledUp) this.handleLevelUp();
    }

    if (room.type === 'shrine' && !room.shrineUsed && dist < 25) {
      room.shrineUsed = true;
      HorrorSFX.shrineActivate();
      const sacrifice = Math.floor(p.maxHp * 0.15);
      p.hp = Math.max(1, p.hp - sacrifice);
      p.damageMultiplier += 0.2;
      p.moveSpeedMult += 0.1;
      spawnDamageText(this.particles, p.x, p.y - 10, `-${sacrifice} HP`, C.COLORS.damageText);
      spawnDamageText(this.particles, p.x, p.y - 25, 'PODER +20%', '#bb88ff');
      spawnExplosion(this.particles, cx, cy, 20);
      this.addEffect('flash', 1, 0.3, 'rgb(100, 50, 200)');
      this.addEffect('shake', 4, 0.3);
      const count = 4 + this.dungeon.floor * 2;
      room.cleared = false;
      room.enemies = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const d = 60 + Math.random() * 40;
        room.enemies.push({
          type: Math.random() < 0.3 ? 'wraith' : 'swarm',
          x: cx + Math.cos(angle) * d,
          y: cy + Math.sin(angle) * d,
        });
      }
      this.spawnRoomEnemies();
    }

    // Old single-trap center trigger removed — hidden trap system handles all trap room mechanics now
    if (room.type === 'trap' && !room.trapTriggered) {
      room.trapTriggered = true;
    }

    // Vendor room interaction — dialogue first, then shop
    if (room.type === 'vendor' && !this.shopOpen && !this.vendorDialogueActive) {
      if (this.vendorInteractCooldown > 0) {
        this.vendorInteractCooldown -= 0.016;
      } else if (dist < 30) {
        this.startVendorDialogue();
      }
    }
  }

  private circleCollide(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
  }

  private collideWithObstacles(entity: { x: number; y: number; width: number; height: number }, obstacles: { x: number; y: number; w: number; h: number }[]) {
    const r = entity.width / 2;
    for (const o of obstacles) {
      const closestX = Math.max(o.x, Math.min(entity.x, o.x + o.w));
      const closestY = Math.max(o.y, Math.min(entity.y, o.y + o.h));
      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r) {
        if (dist > 0) {
          entity.x += (dx / dist) * (r - dist);
          entity.y += (dy / dist) * (r - dist);
        } else {
          entity.x += r;
        }
      }
    }
  }

  private renderVictoryOverlay(ctx: CanvasRenderingContext2D) {
    // Soft green/gold tint for calm atmosphere
    const alpha = Math.min(0.15, (this.victoryCountdownMax - this.victoryCountdown) * 0.05);
    ctx.fillStyle = `rgba(50, 100, 30, ${alpha})`;
    ctx.fillRect(-this.gameOffsetX, -this.gameOffsetY, this.renderWidth, this.renderHeight);

    ctx.textAlign = 'center';
    
    // "Boss defeated" message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(C.dims.gw / 2 - 160, C.dims.gh / 2 - 35, 320, 70);
    ctx.strokeStyle = 'rgba(200, 180, 80, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(C.dims.gw / 2 - 160, C.dims.gh / 2 - 35, 320, 70);
    
    ctx.fillStyle = '#ffcc44';
    ctx.font = `500 16px ${C.HUD_FONT}`;
    ctx.fillText('Parabéns, você derrotou o boss!', C.dims.gw / 2, C.dims.gh / 2 - 10);
    
    // Countdown
    const secs = Math.ceil(Math.max(0, this.victoryCountdown));
    ctx.fillStyle = '#aaccaa';
    ctx.font = `12px ${C.HUD_FONT}`;
    ctx.fillText(`Indo para o próximo andar em ${secs}...`, C.dims.gw / 2, C.dims.gh / 2 + 15);
    
    ctx.textAlign = 'left';
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private renderVendorDialogue(ctx: CanvasRenderingContext2D) {
    const cx = C.dims.gw / 2;
    const cy = C.dims.gh / 2;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, C.dims.gw, C.dims.gh);

    // Measure wrapped text to determine box height
    const boxW = 280;
    const padding = 12;
    const textMaxW = boxW - padding * 2;
    const lineHeight = 14;

    const line = this.vendorDialogueLines[this.vendorDialogueIndex] || '';
    const displayed = line.slice(0, this.vendorDialogueCharIndex);

    ctx.font = `11px ${C.HUD_FONT}`;
    const wrappedFull = this.wrapText(ctx, `"${displayed}"`, textMaxW);
    const headerH = 20;
    const promptH = 18;
    const textH = Math.max(1, wrappedFull.length) * lineHeight;
    const boxH = headerH + textH + promptH + padding;

    const boxX = cx - boxW / 2;
    const boxY = cy + 30;

    // Box background
    ctx.fillStyle = 'rgba(25, 20, 15, 0.95)';
    ctx.strokeStyle = 'rgba(180, 150, 80, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Speaker name
    ctx.fillStyle = '#e8d5a0';
    ctx.font = `500 10px ${C.HUD_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('🧙 O Mercador', boxX + padding, boxY + 14);

    // Wrapped dialogue text
    ctx.fillStyle = '#c8b888';
    ctx.font = `11px ${C.HUD_FONT}`;
    for (let i = 0; i < wrappedFull.length; i++) {
      ctx.fillText(wrappedFull[i], boxX + padding, boxY + headerH + 8 + i * lineHeight);
    }

    // Cursor blink on last line
    if (this.vendorDialogueCharIndex < line.length) {
      const blink = Math.sin(Date.now() / 200) > 0;
      if (blink && wrappedFull.length > 0) {
        const lastLine = wrappedFull[wrappedFull.length - 1];
        const lastLineY = boxY + headerH + 8 + (wrappedFull.length - 1) * lineHeight;
        ctx.fillStyle = '#c8b888';
        ctx.fillText('▌', boxX + padding + ctx.measureText(lastLine).width + 2, lastLineY);
      }
    }

    // Prompt
    ctx.fillStyle = 'rgba(200, 180, 120, 0.5)';
    ctx.font = `9px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('clique para continuar', cx, boxY + boxH - 6);
    ctx.textAlign = 'left';
  }

  private render() {
    const ctx = this.gameCtx;
    const dCtx = this.displayCtx;

    this.updateDisplaySize();
    
    const rw = this.renderWidth;
    const rh = this.renderHeight;
    const gox = this.gameOffsetX;
    const goy = this.gameOffsetY;
    const vp = { gox, goy, rw, rh };

    // Clear full expanded canvas with bg color
    ctx.fillStyle = C.COLORS.bg;
    ctx.fillRect(0, 0, rw, rh);

    // Translate to game area origin
    ctx.save();
    ctx.translate(gox, goy);

    const shake = getShakeOffset(this.effects);
    ctx.save();
    ctx.translate(shake.x, shake.y);

    const room = getCurrentRoom(this.dungeon);
    // Render dungeon atmosphere in viewport margins (fills black bars with stone textures)
    renderViewportMargins(ctx, this.gameTime, vp);
    renderFloor(ctx, this.gameTime);
    if (room.hiddenTraps) {
      renderHiddenTraps(ctx, room.hiddenTraps, this.gameTime);
    }
    renderDoors(ctx, room, this.gameTime, getDoorsLockedTimer() > 0, this.dungeon);
    renderObstacles(ctx, room.obstacles);
    const isCollected = room.treasureCollected || room.shrineUsed || room.trapTriggered || false;
    renderSpecialRoom(ctx, room.type, this.gameTime, isCollected, room.trapType);

    for (const p of this.projectiles) renderProjectile(ctx, p, this.gameTime);
    for (const e of this.enemies) renderEnemy(ctx, e, this.gameTime);
    renderPlayer(ctx, this.player, this.gameTime);
    // Shadow clone render
    if (this.player.shadowClone) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const cx = this.player.shadowCloneX;
      const cy = this.player.shadowCloneY;
      const s = this.player.width / 2;
      ctx.fillStyle = '#5566cc';
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3344aa';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#aabbff';
      ctx.fillRect(cx - 2, cy - 2, 2, 2);
      ctx.fillRect(cx + 1, cy - 2, 2, 2);
      ctx.restore();
    }
    renderParticles(ctx, this.particles);

    // Lighting
    let lightRadius = C.LIGHT_RADIUS;
    if (this.inVendorRoom) lightRadius = C.VENDOR_LIGHT_RADIUS;
    if (hasEffect('blindness')) lightRadius = 40;
    if (getLightsOutTimer() > 0) lightRadius = 15;
    renderLighting(ctx, this.player.x, this.player.y, lightRadius, vp, this.inVendorRoom);

    // Horror events overlay
    renderHorrorEvents(ctx, this.horrorEvents, this.gameTime, vp);

    ctx.restore(); // shake

    applyScreenEffects(ctx, this.effects, vp);
    renderTrapEffectOverlay(ctx, this.gameTime, getPanicTimer(), getLightsOutTimer(), getDoorsLockedTimer(), vp);
    renderHUD(ctx, this.player, this.dungeon, this.stats.timePlayed, this.enemies.length, this.tutorialTimer, this.input.isMobile, vp);

    // Victory countdown overlay
    if (this.victoryActive) {
      this.renderVictoryOverlay(ctx);
    }

    // Boss intro overlay
    renderBossIntro(ctx, this.gameTime, vp);

    // Vendor dialogue overlay
    if (this.vendorDialogueActive) {
      this.renderVendorDialogue(ctx);
    }

    ctx.restore(); // game offset translate

    // Vignette (full canvas, no translate)
    const vignette = ctx.createRadialGradient(rw / 2, rh / 2, rw * 0.3, rw / 2, rh / 2, rw * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, rw, rh);

    // Copy to display - scaled to fit with offset
    const scaledW = Math.round(rw * this.scale);
    const scaledH = Math.round(rh * this.scale);
    dCtx.fillStyle = '#000';
    dCtx.fillRect(0, 0, this.displayCanvas.width / this.dpr, this.displayCanvas.height / this.dpr);
    dCtx.drawImage(this.gameCanvas, this.offsetX, this.offsetY, scaledW, scaledH);
  }

  private updateDisplaySize() {
    const dw = this.displayCanvas.clientWidth;
    const dh = this.displayCanvas.clientHeight;
    const physW = Math.round(dw * this.dpr);
    const physH = Math.round(dh * this.dpr);
    if (this.displayCanvas.width !== physW || this.displayCanvas.height !== physH) {
      this.displayCanvas.width = physW;
      this.displayCanvas.height = physH;
      this.displayCtx.scale(this.dpr, this.dpr);
      this.displayCtx.imageSmoothingEnabled = false;
    }

    // Render dimensions = active game dimensions (no margins, room fills screen)
    this.renderWidth = C.dims.gw;
    this.renderHeight = C.dims.gh;
    this.gameOffsetX = 0;
    this.gameOffsetY = 0;
    
    // Resize game canvas if needed
    const physGW = Math.round(this.renderWidth * this.dpr);
    const physGH = Math.round(this.renderHeight * this.dpr);
    if (this.gameCanvas.width !== physGW || this.gameCanvas.height !== physGH) {
      this.gameCanvas.width = physGW;
      this.gameCanvas.height = physGH;
      this.gameCtx.scale(this.dpr, this.dpr);
      this.gameCtx.imageSmoothingEnabled = false;
    }
    
    // Scale to fit display (contain-fit, perfect on initial aspect)
    this.scale = Math.min(dw / this.renderWidth, dh / this.renderHeight);
    this.offsetX = Math.floor((dw - this.renderWidth * this.scale) / 2);
    this.offsetY = Math.floor((dh - this.renderHeight * this.scale) / 2);
    this.input.setTransform(this.scale, this.offsetX, this.offsetY);
  }

  getAmuletDamageMult(): number {
    if (isAmuletEquipped(this.amuletInventory, 'soul_collector')) {
      return 1 + getSoulCollectorBonus(this.player.souls);
    }
    return 1;
  }

  // Base attack speed (without War Rhythm bonus)
  private _baseAttackSpeedMult = 1;
  getBaseAttackSpeedMult(): number {
    return this._baseAttackSpeedMult;
  }
  setBaseAttackSpeedMult(val: number) {
    this._baseAttackSpeedMult = val;
    this.player.attackSpeedMult = val;
  }
}
