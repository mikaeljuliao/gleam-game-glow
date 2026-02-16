// Procedural audio system using Web Audio API
// All sounds generated programmatically - no external assets needed

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = 0.5; // Default 50% volume
    masterGainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setMasterVolume(value: number) {
  const ctx = getCtx();
  if (masterGainNode) {
    // exponential volume for better perception; clamp low end
    const vol = Math.max(0.0001, value);
    masterGainNode.gain.cancelScheduledValues(ctx.currentTime);
    masterGainNode.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.1);
  }
}

export function getMasterVolume(): number {
  if (!masterGainNode) return 0.5;
  return masterGainNode.gain.value;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, decay = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(masterGainNode!); // Connect to master gain
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1, filterFreq = 3000) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode!); // Connect to master gain
  source.start();
}

function playFreqSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sawtooth', volume = 0.1) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGainNode!); // Connect to master gain
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export const SFX = {
  coinPickup() {
    playTone(1200, 0.06, 'sine', 0.06);
    setTimeout(() => playTone(1600, 0.06, 'sine', 0.05), 50);
  },

  shopBuy() {
    const notes = [600, 800, 1000, 1200];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.12, 'sine', 0.07), i * 50);
    });
  },

  meleeSwing() {
    // Sharp high-freq whoosh (the cut)
    playFreqSweep(1500, 600, 0.14, 'sawtooth', 0.12);
    // Medium-freq air displacement
    playFreqSweep(600, 200, 0.12, 'sine', 0.1);
    // Low-end "weight" thump
    playFreqSweep(180, 50, 0.1, 'sine', 0.15);
    // Metallic resonant ring (subtle)
    playTone(800, 0.05, 'sine', 0.04);
    playNoise(0.08, 0.15, 4500);
  },

  meleeHit() {
    // Heavy "Sledgehammer" impact body
    playFreqSweep(120, 40, 0.2, 'square', 0.3);
    playTone(60, 0.25, 'sine', 0.25);
    // Bone-crunching/Metal-clashing mid layer
    playFreqSweep(2000, 400, 0.1, 'sawtooth', 0.18);
    // High-end impact "snap"
    playNoise(0.05, 0.3, 8000);
    // Shrapnel/Debris rumble
    playNoise(0.15, 0.25, 2000);
    // Deep sub-bass impact
    playFreqSweep(70, 10, 0.22, 'sine', 0.15);
  },

  rangedShoot() {
    playFreqSweep(800, 1200, 0.1, 'sine', 0.08);
    playTone(600, 0.05, 'square', 0.04);
  },

  enemyHit() {
    playTone(200 + Math.random() * 100, 0.08, 'square', 0.07);
    playNoise(0.04, 0.05, 3000);
  },

  enemyDeath() {
    playFreqSweep(400, 80, 0.25, 'sawtooth', 0.1);
    playNoise(0.15, 0.08, 2000);
    playTone(60, 0.3, 'sine', 0.06);
  },

  playerHit() {
    playTone(100, 0.2, 'square', 0.15);
    playFreqSweep(300, 60, 0.2, 'sawtooth', 0.1);
    playNoise(0.1, 0.08, 1500);
  },

  playerDeath() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playTone(200 - i * 30, 0.3, 'square', 0.1), i * 80);
    }
    playFreqSweep(300, 30, 0.8, 'sawtooth', 0.12);
    playNoise(0.5, 0.06, 800);
  },

  dash() {
    playFreqSweep(200, 600, 0.1, 'sine', 0.06);
    playNoise(0.05, 0.04, 5000);
  },

  levelUp() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.1, true), i * 80);
    });
  },

  doorOpen() {
    playFreqSweep(100, 300, 0.3, 'sine', 0.08);
    setTimeout(() => playTone(400, 0.15, 'sine', 0.06), 150);
  },

  portalOpen() {
    playFreqSweep(100, 600, 0.5, 'sine', 0.1);
    playNoise(0.4, 0.08, 1200);
  },

  explosion() {
    playNoise(0.3, 0.15, 800);
    playTone(60, 0.4, 'sine', 0.12);
    playFreqSweep(200, 30, 0.3, 'sawtooth', 0.08);
  },

  bossRoar() {
    playFreqSweep(150, 40, 0.6, 'sawtooth', 0.15);
    playNoise(0.4, 0.1, 600);
    setTimeout(() => {
      playFreqSweep(100, 30, 0.5, 'square', 0.1);
      playNoise(0.3, 0.08, 400);
    }, 200);
  },

  // Floor-specific boss entrance sounds
  bossRoarForFloor(floor: number) {
    switch (floor) {
      case 1: // Sombra Faminta — deep demonic growl
        playFreqSweep(150, 40, 0.6, 'sawtooth', 0.15);
        playNoise(0.4, 0.1, 600);
        setTimeout(() => { playFreqSweep(100, 30, 0.5, 'square', 0.1); playNoise(0.3, 0.08, 400); }, 200);
        break;
      case 2: // O Caçador — aggressive wind rush + blade
        playFreqSweep(400, 1200, 0.15, 'sawtooth', 0.12);
        playNoise(0.2, 0.1, 5000);
        setTimeout(() => { playFreqSweep(1200, 200, 0.2, 'sawtooth', 0.1); playNoise(0.15, 0.08, 3000); }, 100);
        setTimeout(() => { playFreqSweep(600, 80, 0.3, 'square', 0.08); }, 250);
        break;
      case 3: // O Invocador — dark magic rising hum
        playTone(80, 0.8, 'sine', 0.12);
        playFreqSweep(100, 400, 0.6, 'sine', 0.06);
        setTimeout(() => { playFreqSweep(200, 600, 0.4, 'sine', 0.05); playNoise(0.3, 0.04, 1000); }, 300);
        setTimeout(() => { playTone(500, 0.3, 'sine', 0.08); playTone(250, 0.3, 'sine', 0.06); }, 600);
        break;
      case 4: // O Fantasma — ethereal reverse whoosh + whisper
        playFreqSweep(2000, 100, 0.4, 'sine', 0.08);
        playNoise(0.5, 0.04, 6000);
        setTimeout(() => { playFreqSweep(1500, 50, 0.3, 'sine', 0.06); }, 200);
        setTimeout(() => { playTone(60, 0.5, 'sine', 0.1); playNoise(0.3, 0.03, 800); }, 400);
        break;
      case 5: // O Destruidor — massive impact slam
        playTone(30, 0.8, 'sine', 0.18);
        playNoise(0.3, 0.15, 400);
        setTimeout(() => { playTone(25, 0.6, 'sine', 0.15); playNoise(0.2, 0.12, 300); }, 150);
        setTimeout(() => { playFreqSweep(100, 20, 0.5, 'sawtooth', 0.1); playNoise(0.3, 0.08, 200); }, 300);
        break;
      case 6: // O Pesadelo — cacophony of all previous sounds
        playFreqSweep(150, 40, 0.4, 'sawtooth', 0.12);
        playTone(30, 0.8, 'sine', 0.15);
        playNoise(0.5, 0.1, 600);
        setTimeout(() => { playFreqSweep(400, 1000, 0.15, 'sawtooth', 0.08); playFreqSweep(2000, 100, 0.3, 'sine', 0.06); }, 200);
        setTimeout(() => { playTone(25, 0.5, 'sine', 0.12); playFreqSweep(100, 20, 0.4, 'sawtooth', 0.08); }, 400);
        setTimeout(() => { playNoise(0.3, 0.12, 800); playFreqSweep(80, 400, 0.3, 'sine', 0.06); }, 600);
        break;
      default: SFX.bossRoar(); break;
    }
  },

  // Floor-specific boss death sounds
  bossKill(floor: number) {
    // Base kill impact — powerful for all bosses
    playTone(40, 0.6, 'sine', 0.18);
    playNoise(0.4, 0.15, 800);

    switch (floor) {
      case 1: // Sombra — demonic wail descending
        playFreqSweep(800, 30, 0.8, 'sawtooth', 0.12);
        setTimeout(() => { playFreqSweep(400, 20, 0.6, 'square', 0.08); }, 200);
        setTimeout(() => { playTone(60, 0.4, 'sine', 0.1); }, 500);
        break;
      case 2: // Caçador — blade screech + shatter
        playFreqSweep(2000, 50, 0.3, 'sawtooth', 0.12);
        playNoise(0.2, 0.12, 6000);
        setTimeout(() => { playNoise(0.15, 0.1, 4000); playFreqSweep(1000, 30, 0.3, 'square', 0.08); }, 150);
        break;
      case 3: // Invocador — magic implosion
        playFreqSweep(600, 30, 0.6, 'sine', 0.1);
        setTimeout(() => { playTone(800, 0.1, 'sine', 0.1); playTone(600, 0.1, 'sine', 0.08); playTone(400, 0.1, 'sine', 0.06); }, 200);
        setTimeout(() => { playFreqSweep(200, 20, 0.5, 'sine', 0.08); }, 400);
        break;
      case 4: // Fantasma — ethereal dissipation
        playFreqSweep(100, 3000, 0.4, 'sine', 0.06);
        setTimeout(() => { playFreqSweep(2000, 60, 0.5, 'sine', 0.08); playNoise(0.3, 0.04, 8000); }, 200);
        break;
      case 5: // Destruidor — massive collapse
        playTone(20, 1, 'sine', 0.2);
        playNoise(0.5, 0.15, 300);
        setTimeout(() => { playTone(15, 0.8, 'sine', 0.15); playNoise(0.4, 0.12, 200); }, 200);
        setTimeout(() => { playFreqSweep(80, 10, 0.6, 'sawtooth', 0.1); }, 400);
        break;
      case 6: // Pesadelo — reality shattering
        playFreqSweep(100, 2000, 0.3, 'sawtooth', 0.1);
        playTone(20, 1, 'sine', 0.2);
        setTimeout(() => { playFreqSweep(2000, 30, 0.5, 'sawtooth', 0.12); playNoise(0.3, 0.12, 5000); }, 150);
        setTimeout(() => { playTone(800, 0.2, 'sine', 0.1); playTone(600, 0.2, 'sine', 0.08); }, 300);
        setTimeout(() => {
          // Victory chord
          const notes = [261, 329, 392, 523, 659, 784];
          notes.forEach((f, i) => setTimeout(() => playTone(f, 0.4, 'sine', 0.06), i * 50));
        }, 600);
        break;
    }
  },

  wraithTeleport() {
    playFreqSweep(2000, 200, 0.2, 'sine', 0.06);
    playNoise(0.15, 0.04, 6000);
  },

  bomberWarning() {
    playTone(880, 0.1, 'square', 0.08);
    setTimeout(() => playTone(880, 0.1, 'square', 0.08), 120);
    setTimeout(() => playTone(880, 0.1, 'square', 0.08), 240);
  },

  xpPickup() {
    playTone(800 + Math.random() * 200, 0.08, 'sine', 0.05);
  },

  stalkerLunge() {
    // Sudden scary screech
    playFreqSweep(100, 1500, 0.15, 'sawtooth', 0.12);
    playNoise(0.1, 0.1, 6000);
    playTone(50, 0.2, 'square', 0.08);
  },

  necroSummon() {
    // Dark magic sound
    playFreqSweep(600, 100, 0.4, 'sine', 0.08);
    setTimeout(() => playFreqSweep(200, 400, 0.3, 'sawtooth', 0.05), 200);
    playNoise(0.3, 0.04, 1000);
  },

  // --- New terrifying enemy SFX ---

  flashHunterAppear() {
    // Sharp electric crack - like a camera flash + whip snap
    playTone(2000, 0.04, 'square', 0.15);
    playNoise(0.06, 0.12, 8000);
    setTimeout(() => playFreqSweep(1500, 200, 0.1, 'sawtooth', 0.1), 30);
  },

  distortionEntry() {
    // Deep bass impact + rumble - like reality tearing
    playTone(30, 0.5, 'sine', 0.18);
    playTone(25, 0.6, 'sine', 0.12);
    playFreqSweep(80, 20, 0.4, 'sawtooth', 0.06);
    playNoise(0.15, 0.08, 400);
  },

  flickerFiendBuzz() {
    // Electrical buzzing/crackling
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    // Rapid frequency modulation for buzzing
    for (let i = 0; i < 8; i++) {
      osc.frequency.setValueAtTime(80 + Math.random() * 160, ctx.currentTime + i * 0.03);
    }
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  },

  warperTeleport() {
    // Reversed whoosh + sub bass pop
    playFreqSweep(1200, 60, 0.08, 'sine', 0.1);
    playTone(40, 0.12, 'sine', 0.1);
    playNoise(0.04, 0.06, 2000);
  },

  acceleratorCharge() {
    // Rising engine roar
    playFreqSweep(60, 400, 0.3, 'sawtooth', 0.08);
    playFreqSweep(80, 600, 0.25, 'square', 0.04);
  },

  synergyActivated() {
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'sine', 0.08), i * 60);
    });
    setTimeout(() => playNoise(0.1, 0.03, 8000), 200);
  },

  floorChange() {
    playFreqSweep(200, 800, 0.4, 'sine', 0.1);
    setTimeout(() => {
      playTone(800, 0.3, 'sine', 0.08);
      playTone(1200, 0.3, 'sine', 0.06);
    }, 300);
  },

  mapOpen() {
    // Soft parchment unfold sound
    playNoise(0.15, 0.04, 2000);
    playTone(400, 0.12, 'sine', 0.04);
    setTimeout(() => playTone(600, 0.08, 'sine', 0.03), 80);
  },

  mapClose() {
    // Soft fold-back sound
    playTone(500, 0.08, 'sine', 0.03);
    setTimeout(() => playTone(300, 0.1, 'sine', 0.03), 60);
    playNoise(0.08, 0.03, 1500);
  },

  amuletEquip() {
    // Magical chime — ascending
    playTone(500, 0.15, 'sine', 0.06);
    setTimeout(() => playTone(700, 0.12, 'sine', 0.05), 70);
    setTimeout(() => playTone(900, 0.1, 'sine', 0.04), 140);
  },

  amuletUnequip() {
    // Descending de-power
    playTone(700, 0.1, 'sine', 0.05);
    setTimeout(() => playTone(500, 0.1, 'sine', 0.04), 60);
    setTimeout(() => playTone(350, 0.12, 'sine', 0.03), 120);
  },

  // === NEW: Comprehensive interaction sounds ===

  // Footsteps — soft, airy, agile character feel
  footstep() {
    const pitch = 180 + Math.random() * 80;
    const vol = 0.014 + Math.random() * 0.006;
    playNoise(0.018, vol * 0.6, 1200 + Math.random() * 800);
    playTone(pitch, 0.015, 'sine', vol * 0.5);
  },

  // Critical hit — sharp metallic impact + high pitch accent
  criticalHit() {
    playTone(1400, 0.06, 'square', 0.1);
    playNoise(0.06, 0.1, 6000);
    playTone(2000, 0.04, 'sine', 0.08);
    setTimeout(() => playTone(1800, 0.08, 'sine', 0.05), 40);
  },

  // Melee miss / swing whiff — lighter than meleeSwing
  meleeWhiff() {
    playFreqSweep(300, 100, 0.08, 'sine', 0.04);
    playNoise(0.05, 0.03, 3000);
  },

  // Room enter — subtle atmospheric shift
  roomEnter() {
    playTone(150, 0.2, 'sine', 0.04);
    playNoise(0.1, 0.02, 800);
    setTimeout(() => playTone(200, 0.15, 'sine', 0.03), 100);
  },

  // UI open — generic interface open
  uiOpen() {
    playTone(600, 0.08, 'sine', 0.05);
    setTimeout(() => playTone(800, 0.06, 'sine', 0.04), 50);
  },

  // UI close — generic interface close
  uiClose() {
    playTone(700, 0.06, 'sine', 0.04);
    setTimeout(() => playTone(500, 0.08, 'sine', 0.03), 40);
  },

  // Upgrade select — satisfying confirmation
  upgradeSelect() {
    playTone(500, 0.1, 'sine', 0.07);
    setTimeout(() => playTone(700, 0.08, 'sine', 0.06), 60);
    setTimeout(() => playTone(1000, 0.12, 'sine', 0.05), 120);
  },

  // Can't afford / action blocked — dull reject
  actionBlocked() {
    playTone(120, 0.12, 'square', 0.06);
    setTimeout(() => playTone(100, 0.12, 'square', 0.05), 80);
  },

  // Soul collect — with pitch variation for life
  soulCollect() {
    const pitch = 900 + Math.random() * 300;
    playTone(pitch, 0.06, 'sine', 0.04);
    setTimeout(() => playTone(pitch + 200, 0.05, 'sine', 0.03), 40);
  },

  // Chest/treasure open
  chestOpen() {
    playFreqSweep(200, 600, 0.2, 'sine', 0.06);
    playNoise(0.1, 0.04, 2000);
    setTimeout(() => {
      playTone(800, 0.12, 'sine', 0.06);
      playTone(1000, 0.1, 'sine', 0.05);
    }, 120);
  },

  // Trap spring — alarming
  trapActivate() {
    playTone(200, 0.15, 'square', 0.1);
    playFreqSweep(600, 100, 0.15, 'sawtooth', 0.08);
    playNoise(0.1, 0.08, 4000);
  },

  // Sanctuary heal — spiritual warmth
  sanctuaryHeal() {
    const notes = [400, 500, 600, 800];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.25, 'sine', 0.08, true), i * 70);
    });
    playNoise(0.4, 0.03, 1200);
  },

  sanctuarySoulDrain() {
    // Soft wispy reverse-whoosh for souls leaving
    playFreqSweep(1200, 400, 0.4, 'sine', 0.03);
    playNoise(0.3, 0.02, 3000);
  },

  sanctuaryRitualFlow() {
    // Soft undulating mystical hum
    playTone(220, 0.1, 'sine', 0.04, true);
    playFreqSweep(440, 660, 0.08, 'sine', 0.02);
  },

  sanctuaryRitualEnd() {
    // Impactful but soft divine chime
    playTone(523, 0.6, 'sine', 0.12);
    playTone(659, 0.6, 'sine', 0.08);
    playTone(784, 0.6, 'sine', 0.06);
    playNoise(0.4, 0.05, 3000);
    playFreqSweep(100, 300, 0.4, 'sine', 0.08);
  },

  // Projectile impact (enemy bullet hitting player already uses playerHit, this is for visual feedback)
  projectileImpact() {
    playTone(300 + Math.random() * 100, 0.05, 'square', 0.05);
    playNoise(0.03, 0.04, 4000);
  },

  // Shop hover / item select
  shopSelect() {
    playTone(700, 0.04, 'sine', 0.03);
  },

  // Revive
  revive() {
    const notes = [300, 400, 500, 700, 900];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.08), i * 80);
    });
    playNoise(0.2, 0.04, 3000);
  },
};

// Initialize audio on first user interaction
export function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}
