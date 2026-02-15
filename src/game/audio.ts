// Procedural audio system using Web Audio API
// All sounds generated programmatically - no external assets needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
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
  gain.connect(ctx.destination);
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
  gain.connect(ctx.destination);
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
  gain.connect(ctx.destination);
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
    playFreqSweep(400, 80, 0.14, 'sawtooth', 0.12);
    playNoise(0.1, 0.09, 2500);
    playTone(60, 0.08, 'sine', 0.06);
  },

  meleeHit() {
    playTone(100, 0.15, 'square', 0.18);
    playNoise(0.1, 0.15, 5000);
    playTone(50, 0.2, 'sine', 0.12);
    playFreqSweep(200, 40, 0.12, 'sawtooth', 0.08);
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

  // ambientDrone removed — replaced by psychological horror system in horror.ts
};

// Initialize audio on first user interaction
export function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}
