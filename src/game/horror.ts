// Psychological horror ambient system
// Philosophy: silence is the scariest sound. Sparse, unpredictable audio events.
// No drones, no loops, no constant noise. Just dread.
import { HorrorEvent, Particle, Viewport } from './types';
import * as C from './constants';

// ============ AUDIO CONTEXT ============

let bgCtx: AudioContext | null = null;
let ambienceActive = false;
let ambienceTimers: ReturnType<typeof setTimeout>[] = [];

function getBgCtx(): AudioContext {
  if (!bgCtx) bgCtx = new AudioContext();
  if (bgCtx.state === 'suspended') bgCtx.resume();
  return bgCtx;
}

function rng(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function maybe(chance: number): boolean {
  return Math.random() < chance;
}

function createNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// ── Layer 1: Distant wind (barely audible, filtered) ─────

function playDistantWind() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const duration = rng(4, 10);
  const noise = createNoise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(rng(80, 200), ctx.currentTime);
  const gain = ctx.createGain();
  const vol = rng(0.008, 0.025);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + duration * 0.3);
  gain.gain.linearRampToValueAtTime(vol * 0.5, ctx.currentTime + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
  ambienceTimers.push(setTimeout(playDistantWind, rng(8000, 25000)));
}

// ── Layer 2: Random ambient creak/crack (very rare) ──────

function playAmbientCreak() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const type = Math.floor(rng(0, 3));
  if (type === 0) {
    // Creak
    const dur = rng(0.05, 0.15);
    const noise = createNoise(ctx, dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(rng(800, 2000), ctx.currentTime);
    filter.Q.setValueAtTime(rng(5, 15), ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(rng(0.02, 0.06), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } else if (type === 1) {
    // Drip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rng(1200, 3000), ctx.currentTime);
    gain.gain.setValueAtTime(rng(0.01, 0.03), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } else {
    // Low scrape
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const dur = rng(0.1, 0.3);
    osc.frequency.setValueAtTime(rng(60, 150), ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(rng(30, 80), ctx.currentTime + dur);
    gain.gain.setValueAtTime(rng(0.01, 0.03), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  ambienceTimers.push(setTimeout(playAmbientCreak, rng(12000, 45000)));
}

// ── Layer 3: Near-inaudible whispers (no words, just feeling) ──

function playAmbientWhisper() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const duration = rng(0.8, 2.5);
  const noise = createNoise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(rng(300, 800), ctx.currentTime);
  filter.Q.setValueAtTime(rng(3, 8), ctx.currentTime);
  const gain = ctx.createGain();
  const vol = rng(0.006, 0.018);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  const syllables = Math.floor(rng(2, 5));
  const syllableDur = duration / syllables;
  for (let i = 0; i < syllables; i++) {
    const t = ctx.currentTime + i * syllableDur;
    gain.gain.linearRampToValueAtTime(vol * rng(0.3, 1), t + syllableDur * 0.2);
    gain.gain.linearRampToValueAtTime(vol * 0.05, t + syllableDur * 0.8);
  }
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(rng(-0.8, 0.8), ctx.currentTime);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  noise.start();
  ambienceTimers.push(setTimeout(playAmbientWhisper, rng(20000, 60000)));
}

// ── Layer 4: Breathing (sometimes close, sometimes far) ──

function playBreathing() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const isClose = maybe(0.3);
  const baseVol = isClose ? rng(0.02, 0.04) : rng(0.005, 0.015);
  const breathCount = Math.floor(rng(2, 5));
  const breathDur = rng(0.6, 1.2);
  for (let i = 0; i < breathCount; i++) {
    const delay = i * breathDur * 1.4;
    const startTime = ctx.currentTime + delay;
    const noise = createNoise(ctx, breathDur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isClose ? rng(200, 500) : rng(100, 300), startTime);
    filter.Q.setValueAtTime(rng(1, 4), startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(baseVol, startTime + breathDur * 0.3);
    gain.gain.linearRampToValueAtTime(baseVol * 0.6, startTime + breathDur * 0.5);
    gain.gain.linearRampToValueAtTime(baseVol * 0.8, startTime + breathDur * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + breathDur);
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(isClose ? rng(-0.3, 0.3) : rng(-1, 1), startTime);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    noise.start(startTime);
    noise.stop(startTime + breathDur);
  }
  ambienceTimers.push(setTimeout(playBreathing, rng(25000, 70000)));
}

// ── Layer 5: Deep heartbeat (VERY rare) ──────────────────

function playDeepHeartbeat() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const beats = Math.floor(rng(3, 8));
  const interval = rng(0.7, 1.2);
  const vol = rng(0.03, 0.06);
  for (let i = 0; i < beats; i++) {
    const t = ctx.currentTime + i * interval;
    // Lub
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(rng(35, 50), t);
    gain1.gain.setValueAtTime(vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.15);
    // Dub
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(rng(50, 70), t + 0.12);
    gain2.gain.setValueAtTime(vol * 0.7, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.25);
  }
  ambienceTimers.push(setTimeout(playDeepHeartbeat, rng(40000, 120000)));
}

// ── Combat Tension System ────────────────────────────────
// Dynamic audio layers that intensify during combat

let combatIntensity = 0; // 0 = calm, 1 = max tension
let combatDroneOsc: OscillatorNode | null = null;
let combatDroneGain: GainNode | null = null;
let combatPulseTimer = 0;

export function updateCombatTension(enemyCount: number, closestEnemyDist: number, dt: number) {
  // Calculate target intensity based on enemies and proximity
  let target = 0;
  if (enemyCount > 0) {
    target = Math.min(1, enemyCount * 0.08); // more enemies = more tension
    if (closestEnemyDist < 80) target = Math.min(1, target + 0.4);
    else if (closestEnemyDist < 150) target = Math.min(1, target + 0.15);
  }
  
  // Smooth transition
  const speed = target > combatIntensity ? 2.0 : 0.5; // ramp up fast, fade slow
  combatIntensity += (target - combatIntensity) * speed * dt;
  combatIntensity = Math.max(0, Math.min(1, combatIntensity));
  
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  
  // Manage sub-bass drone that intensifies with combat
  if (combatIntensity > 0.05) {
    if (!combatDroneOsc) {
      combatDroneOsc = ctx.createOscillator();
      combatDroneGain = ctx.createGain();
      combatDroneOsc.type = 'sine';
      combatDroneOsc.frequency.setValueAtTime(35, ctx.currentTime);
      combatDroneGain.gain.setValueAtTime(0, ctx.currentTime);
      combatDroneOsc.connect(combatDroneGain);
      combatDroneGain.connect(ctx.destination);
      combatDroneOsc.start();
    }
    // Modulate volume and frequency based on intensity
    if (combatDroneGain) {
      const vol = combatIntensity * 0.06; // max 0.06 - present but not loud
      combatDroneGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
      combatDroneOsc!.frequency.setTargetAtTime(30 + combatIntensity * 15, ctx.currentTime, 0.1);
    }
  } else if (combatDroneOsc && combatDroneGain) {
    combatDroneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      try { combatDroneOsc?.stop(); } catch {}
      combatDroneOsc = null;
      combatDroneGain = null;
    }, 1000);
  }
  
  // Occasional tension pulses during high combat
  combatPulseTimer -= dt;
  if (combatIntensity > 0.4 && combatPulseTimer <= 0) {
    combatPulseTimer = 2 + Math.random() * 4 * (1 - combatIntensity);
    // Low impact pulse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rng(25, 45), ctx.currentTime);
    const vol = combatIntensity * 0.08;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }
}

export function getCombatIntensity(): number {
  return combatIntensity;
}

// ── Vendor room ambient (mysterious refuge) ─────────────
let vendorAmbienceActive = false;
let vendorNodes: (OscillatorNode | GainNode | AudioBufferSourceNode)[] = [];
let vendorMelodyTimer: ReturnType<typeof setTimeout> | null = null;

export function startVendorAmbience() {
  if (vendorAmbienceActive) return;
  vendorAmbienceActive = true;
  const ctx = getBgCtx();

  // --- Deep pad layer (minor chord with tension) ---
  // Am7 voicing: A2, C3, E3, G3 - warm but uneasy
  const padNotes = [110.0, 130.8, 164.8, 196.0];
  for (const freq of padNotes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    // Slow subtle detuning for organic feel
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15 + Math.random() * 0.1, ctx.currentTime);
    lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    vendorNodes.push(osc, gain);
  }

  // --- Mysterious melody (minor pentatonic, deliberate pacing) ---
  // A minor pentatonic: A3, C4, D4, E4, G4, A4
  const melodyNotes = [220.0, 261.6, 293.7, 329.6, 392.0, 440.0];
  const melodyPattern = [0, 2, 4, 3, 1, 4, 5, 3, 2, 0]; // indices into melodyNotes
  let noteIndex = 0;
  function playMelodyNote() {
    if (!vendorAmbienceActive) return;
    const ctx2 = getBgCtx();
    const idx = melodyPattern[noteIndex % melodyPattern.length];
    const freq = melodyNotes[idx];
    noteIndex++;
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    const filter = ctx2.createBiquadFilter();
    // Alternate between triangle and sine for variety
    osc.type = noteIndex % 3 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx2.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx2.currentTime);
    const vol = 0.045 + Math.random() * 0.02;
    gain.gain.setValueAtTime(0, ctx2.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx2.currentTime + 0.08);
    gain.gain.setValueAtTime(vol * 0.8, ctx2.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 1.8);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx2.destination);
    osc.start();
    osc.stop(ctx2.currentTime + 2.0);
    // Irregular timing for intrigue
    const delay = 800 + Math.random() * 600 + (noteIndex % 3 === 0 ? 400 : 0);
    vendorMelodyTimer = setTimeout(playMelodyNote, delay);
  }
  vendorMelodyTimer = setTimeout(playMelodyNote, 1200);

  // --- Sub-bass pulse (anticipation / heartbeat-like) ---
  function playSubPulse() {
    if (!vendorAmbienceActive) return;
    const ctx2 = getBgCtx();
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, ctx2.currentTime); // A1
    osc.frequency.exponentialRampToValueAtTime(40, ctx2.currentTime + 0.6);
    gain.gain.setValueAtTime(0.05, ctx2.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx2.destination);
    osc.start();
    osc.stop(ctx2.currentTime + 0.7);
    setTimeout(playSubPulse, 3000 + Math.random() * 4000);
  }
  setTimeout(playSubPulse, 2000);

  // --- Ethereal chime (rare, magical shimmer) ---
  function playShimmer() {
    if (!vendorAmbienceActive) return;
    const ctx2 = getBgCtx();
    const shimmerFreqs = [880.0, 1046.5, 1318.5]; // A5, C6, E6
    const f = shimmerFreqs[Math.floor(Math.random() * shimmerFreqs.length)];
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    const reverb = ctx2.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, ctx2.currentTime);
    reverb.type = 'highpass';
    reverb.frequency.setValueAtTime(600, ctx2.currentTime);
    gain.gain.setValueAtTime(0.02, ctx2.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 2.5);
    osc.connect(reverb);
    reverb.connect(gain);
    gain.connect(ctx2.destination);
    osc.start();
    osc.stop(ctx2.currentTime + 2.6);
    setTimeout(playShimmer, 3000 + Math.random() * 5000);
  }
  setTimeout(playShimmer, 2500);
}

export function stopVendorAmbience() {
  vendorAmbienceActive = false;
  const ctx = getBgCtx();
  for (const node of vendorNodes) {
    if (node instanceof GainNode) {
      node.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }
  }
  if (vendorMelodyTimer) clearTimeout(vendorMelodyTimer);
  vendorMelodyTimer = null;
  setTimeout(() => {
    for (const node of vendorNodes) {
      try { if ('stop' in node && typeof (node as any).stop === 'function') (node as OscillatorNode).stop(); } catch {}
    }
    vendorNodes = [];
  }, 2000);
}

export function isVendorAmbienceActive(): boolean {
  return vendorAmbienceActive;
}

// ── Public API (same names so engine.ts doesn't break) ───

export function startBackgroundMusic() {
  if (ambienceActive) return;
  ambienceActive = true;
  combatIntensity = 0;
  // Stagger initial starts — never all at once
  ambienceTimers.push(setTimeout(playDistantWind, rng(3000, 8000)));
  ambienceTimers.push(setTimeout(playAmbientCreak, rng(10000, 20000)));
  ambienceTimers.push(setTimeout(playAmbientWhisper, rng(15000, 35000)));
  ambienceTimers.push(setTimeout(playBreathing, rng(20000, 40000)));
  ambienceTimers.push(setTimeout(playDeepHeartbeat, rng(30000, 60000)));
}

export function stopBackgroundMusic() {
  ambienceActive = false;
  ambienceTimers.forEach(clearTimeout);
  ambienceTimers = [];
  if (combatDroneOsc) {
    try { combatDroneOsc.stop(); } catch {}
    combatDroneOsc = null;
    combatDroneGain = null;
  }
  combatIntensity = 0;
}

// ============ HORROR SOUND EFFECTS ============

export const HorrorSFX = {
  whisper() {
    const ctx = getBgCtx();
    // Breathy noise filtered to sound like whisper
    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / bufferSize * Math.PI);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2000 + Math.random() * 1000, ctx.currentTime);
    bp.Q.setValueAtTime(5, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start();
  },

  heartbeat() {
    const ctx = getBgCtx();
    // Two thumps
    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }, i * 250);
    }
  },

  distantScream() {
    const ctx = getBgCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  },

  metalCreak() {
    const ctx = getBgCtx();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120 + Math.random() * 60, ctx.currentTime + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },

  chestOpen() {
    const ctx = getBgCtx();
    const notes = [400, 500, 600, 800];
    notes.forEach((f, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }, i * 70);
    });
  },

  trapSpring() {
    const ctx = getBgCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    // Noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.1, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    src.connect(g2);
    g2.connect(ctx.destination);
    src.start();
  },

  phantomScream() {
    const ctx = getBgCtx();
    // Horrifying rising screech
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
    osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.15, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(1200, ctx.currentTime);
    f1.Q.setValueAtTime(4, ctx.currentTime);
    osc1.connect(f1);
    f1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.8);
    // Noise burst for extra horror
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(i / data.length * Math.PI);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(3000, ctx.currentTime);
    nf.Q.setValueAtTime(2, ctx.currentTime);
    src.connect(nf);
    nf.connect(ng);
    ng.connect(ctx.destination);
    src.start();
  },

  poisonHiss() {
    const ctx = getBgCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(4000, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start();
  },

  bearTrapSnap() {
    const ctx = getBgCtx();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    // Metal clang
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2000, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.08, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.2);
  },

  shrineActivate() {
    const ctx = getBgCtx();
    const notes = [261, 329, 392, 523, 659];
    notes.forEach((f, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }, i * 100);
    });
  },
};

// ============ HORROR EVENTS ============

export function createHorrorEvent(): HorrorEvent | null {
  const roll = Math.random();
  if (roll < 0.25) return { type: 'whisper', timer: 2 };
  if (roll < 0.4) return { type: 'flicker', timer: 0.5 };
  if (roll < 0.55) return { type: 'shadow', timer: 3, x: Math.random() * C.dims.gw, y: Math.random() * C.dims.gh };
  if (roll < 0.7) return { type: 'heartbeat', timer: 1.5 };
  if (roll < 0.85) return { type: 'eyes', timer: 2.5, x: Math.random() * C.dims.gw, y: Math.random() * C.dims.gh };
  return { type: 'scream', timer: 1 };
}

export function spawnFog(particles: Particle[], x: number, y: number) {
  particles.push({
    x: x + (Math.random() - 0.5) * 60,
    y: y + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 2,
    life: 3 + Math.random() * 3,
    maxLife: 6,
    size: 8 + Math.random() * 12,
    color: 'rgba(40, 30, 50, 0.08)',
    type: 'fog',
  });
}

export function renderHorrorEvents(ctx: CanvasRenderingContext2D, events: HorrorEvent[], time: number, vp: Viewport) {
  for (const evt of events) {
    const alpha = Math.min(1, evt.timer);
    switch (evt.type) {
      case 'flicker': {
        // Screen momentarily goes darker
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
        ctx.fillRect(-vp.gox, -vp.goy, vp.rw, vp.rh);
        break;
      }
      case 'shadow': {
        // Dark figure appears briefly at edge of vision
        if (evt.x !== undefined && evt.y !== undefined) {
          ctx.fillStyle = `rgba(10, 5, 15, ${0.6 * alpha})`;
          ctx.beginPath();
          ctx.ellipse(evt.x, evt.y, 8, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          // Shadow eyes
          ctx.fillStyle = `rgba(255, 0, 0, ${0.4 * alpha})`;
          ctx.fillRect(evt.x - 3, evt.y - 8, 2, 2);
          ctx.fillRect(evt.x + 2, evt.y - 8, 2, 2);
        }
        break;
      }
      case 'eyes': {
        // Glowing eyes in the darkness
        if (evt.x !== undefined && evt.y !== undefined) {
          const blink = Math.sin(time * 8) > 0 ? 1 : 0;
          if (blink) {
            ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * alpha})`;
            ctx.fillRect(evt.x - 4, evt.y, 2, 2);
            ctx.fillRect(evt.x + 3, evt.y, 2, 2);
            // Small glow
            const g = ctx.createRadialGradient(evt.x, evt.y, 0, evt.x, evt.y, 12);
            g.addColorStop(0, `rgba(255, 0, 0, ${0.08 * alpha})`);
            g.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(evt.x - 12, evt.y - 12, 24, 24);
          }
        }
        break;
      }
    }
  }
}

// Render special room visuals
export function renderSpecialRoom(ctx: CanvasRenderingContext2D, roomType: string, time: number, collected: boolean, trapType?: string, playerX?: number, playerY?: number) {
  const cx = C.dims.gw / 2;
  const cy = C.dims.gh / 2;
  const pulse = Math.sin(time * 3) * 0.3 + 0.7;

  if (roomType === 'vendor') {
    // Large warm ambient glow
    const warmGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160);
    warmGlow.addColorStop(0, `rgba(255, 230, 170, ${0.12 * pulse})`);
    warmGlow.addColorStop(0.3, `rgba(255, 210, 120, ${0.07 * pulse})`);
    warmGlow.addColorStop(0.6, `rgba(200, 170, 80, ${0.03 * pulse})`);
    warmGlow.addColorStop(1, 'rgba(200, 170, 80, 0)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(cx - 160, cy - 160, 320, 320);

    // Floating particles around vendor
    for (let i = 0; i < 6; i++) {
      const angle = time * 0.5 + (i / 6) * Math.PI * 2;
      const dist = 25 + Math.sin(time * 1.5 + i) * 8;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist - 10;
      const particleAlpha = 0.3 + Math.sin(time * 3 + i * 2) * 0.2;
      ctx.fillStyle = `rgba(255, 220, 100, ${particleAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const nFloat = Math.sin(time * 1.5) * 1.5;
    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe body — layered dark robes with gold trim
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(cx - 8, cy - 2 + nFloat, 16, 18);
    // Robe detail — bottom tattered edges
    ctx.fillStyle = '#221810';
    for (let i = -8; i < 8; i += 3) {
      const yOff = Math.sin(i * 0.7 + time * 2) * 1.5;
      ctx.fillRect(cx + i, cy + 14 + nFloat + yOff, 3, 3);
    }
    // Gold trim lines
    ctx.fillStyle = 'rgba(200, 170, 60, 0.5)';
    ctx.fillRect(cx - 8, cy - 2 + nFloat, 1, 18);
    ctx.fillRect(cx + 7, cy - 2 + nFloat, 1, 18);
    ctx.fillRect(cx - 5, cy + 6 + nFloat, 10, 1);

    // Shoulders
    ctx.fillStyle = '#352818';
    ctx.fillRect(cx - 10, cy - 3 + nFloat, 4, 6);
    ctx.fillRect(cx + 6, cy - 3 + nFloat, 4, 6);

    // Hood — larger, more dramatic
    ctx.fillStyle = '#3d2c1a';
    ctx.beginPath();
    ctx.arc(cx, cy - 6 + nFloat, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1e14';
    ctx.beginPath();
    ctx.arc(cx, cy - 5 + nFloat, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    // Deep shadow inside hood
    ctx.fillStyle = '#0d0906';
    ctx.beginPath();
    ctx.arc(cx, cy - 6 + nFloat, 5, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Eyes — eerie glowing cyan-gold, pulsing
    const eyePulse = Math.sin(time * 3) * 0.3 + 0.7;
    const eyeColor = `rgba(180, 255, 200, ${eyePulse})`;
    ctx.fillStyle = eyeColor;
    ctx.fillRect(cx - 3, cy - 8 + nFloat, 2, 2);
    ctx.fillRect(cx + 2, cy - 8 + nFloat, 2, 2);
    // Eye glow
    const eg = ctx.createRadialGradient(cx, cy - 7 + nFloat, 0, cx, cy - 7 + nFloat, 8);
    eg.addColorStop(0, `rgba(180, 255, 200, ${0.12 * eyePulse})`);
    eg.addColorStop(1, 'rgba(180, 255, 200, 0)');
    ctx.fillStyle = eg;
    ctx.fillRect(cx - 8, cy - 15 + nFloat, 16, 16);

    // Staff with orb instead of lantern
    ctx.fillStyle = '#442211';
    ctx.fillRect(cx + 11, cy - 16 + nFloat, 2, 22);
    // Staff top ornament
    ctx.fillStyle = '#553311';
    ctx.fillRect(cx + 10, cy - 18 + nFloat, 4, 3);
    // Glowing orb
    const orbPulse = Math.sin(time * 4) * 0.2 + 0.8;
    const orbGlow = ctx.createRadialGradient(cx + 12, cy - 20 + nFloat, 0, cx + 12, cy - 20 + nFloat, 10);
    orbGlow.addColorStop(0, `rgba(100, 255, 180, ${0.6 * orbPulse})`);
    orbGlow.addColorStop(0.4, `rgba(80, 200, 150, ${0.3 * orbPulse})`);
    orbGlow.addColorStop(1, 'rgba(80, 200, 150, 0)');
    ctx.fillStyle = orbGlow;
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 20 + nFloat, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(150, 255, 200, ${0.9 * orbPulse})`;
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 20 + nFloat, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = `rgba(230, 210, 150, ${pulse})`;
    ctx.font = `bold 9px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MERCADOR', cx, cy + 30);
    ctx.textAlign = 'left';

    // === SANCTUARY (left side of vendor room) ===
    const shrineX = Math.floor(C.dims.gw * 0.18);
    const shrineY = Math.floor(C.dims.gh * 0.5);
    const sFloat = Math.sin(time * 2) * 1;
    
    // Shrine glow
    const shrineGlow = ctx.createRadialGradient(shrineX, shrineY, 0, shrineX, shrineY, 35);
    shrineGlow.addColorStop(0, `rgba(60, 130, 255, ${0.15 * pulse})`);
    shrineGlow.addColorStop(0.5, `rgba(40, 100, 220, ${0.07 * pulse})`);
    shrineGlow.addColorStop(1, 'rgba(40, 100, 220, 0)');
    ctx.fillStyle = shrineGlow;
    ctx.beginPath();
    ctx.arc(shrineX, shrineY, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Shrine pillar
    ctx.fillStyle = '#1a2040';
    ctx.fillRect(shrineX - 5, shrineY - 8 + sFloat, 10, 18);
    ctx.fillStyle = '#222850';
    ctx.fillRect(shrineX - 7, shrineY - 10 + sFloat, 14, 4);
    ctx.fillRect(shrineX - 6, shrineY + 8 + sFloat, 12, 3);
    
    // Crystal on top
    const cPulse = Math.sin(time * 3.5) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(80, 160, 255, ${0.9 * cPulse})`;
    ctx.beginPath();
    ctx.moveTo(shrineX, shrineY - 16 + sFloat);
    ctx.lineTo(shrineX + 4, shrineY - 10 + sFloat);
    ctx.lineTo(shrineX, shrineY - 7 + sFloat);
    ctx.lineTo(shrineX - 4, shrineY - 10 + sFloat);
    ctx.closePath();
    ctx.fill();
    // Inner glow
    ctx.fillStyle = `rgba(160, 210, 255, ${cPulse})`;
    ctx.beginPath();
    ctx.moveTo(shrineX, shrineY - 14 + sFloat);
    ctx.lineTo(shrineX + 2, shrineY - 10 + sFloat);
    ctx.lineTo(shrineX, shrineY - 8 + sFloat);
    ctx.lineTo(shrineX - 2, shrineY - 10 + sFloat);
    ctx.closePath();
    ctx.fill();
    
    // Floating particles
    for (let i = 0; i < 4; i++) {
      const a = time * 1.2 + (i / 4) * Math.PI * 2;
      const d = 10 + Math.sin(time * 2 + i) * 4;
      const fpx = shrineX + Math.cos(a) * d;
      const fpy = shrineY - 10 + Math.sin(a) * d * 0.5 + sFloat;
      ctx.fillStyle = `rgba(100, 180, 255, ${0.4 * cPulse})`;
      ctx.beginPath();
      ctx.arc(fpx, fpy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Label
    ctx.fillStyle = `rgba(100, 170, 255, ${pulse * 0.8})`;
    ctx.font = `bold 8px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SANTUÁRIO', shrineX, shrineY + 22);
    ctx.fillStyle = `rgba(100, 170, 255, ${pulse * 0.5})`;
    ctx.font = `7px ${C.HUD_FONT}`;
    ctx.fillText('Cura por Almas', shrineX, shrineY + 30);

    // [T] interaction prompt when player is near
    if (playerX !== undefined && playerY !== undefined) {
      const shrineDist = Math.sqrt((playerX - shrineX) ** 2 + (playerY - shrineY) ** 2);
      if (shrineDist < 35) {
        const promptPulse = Math.sin(time * 4) * 0.3 + 0.7;
        // Prompt background
        ctx.fillStyle = `rgba(10, 20, 40, ${0.85 * promptPulse})`;
        const promptW = 90;
        const promptH = 16;
        ctx.beginPath();
        ctx.rect(shrineX - promptW / 2, shrineY - 32 + sFloat, promptW, promptH);
        ctx.fill();
        ctx.strokeStyle = `rgba(80, 160, 255, ${0.6 * promptPulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(shrineX - promptW / 2, shrineY - 32 + sFloat, promptW, promptH);
        // Key hint
        ctx.fillStyle = `rgba(140, 200, 255, ${promptPulse})`;
        ctx.font = `bold 8px ${C.HUD_FONT}`;
        ctx.fillText('[T] Usar Santuário', shrineX, shrineY - 22 + sFloat);
      }
    }

    ctx.textAlign = 'left';

    return;
  }

  if (roomType === 'treasure' && !collected) {
    // ... keep existing code
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    glow.addColorStop(0, `rgba(255, 200, 50, ${0.15 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 40, cy - 40, 80, 80);
    ctx.fillStyle = '#664422';
    ctx.fillRect(cx - 12, cy - 6, 24, 16);
    ctx.fillStyle = '#553311';
    ctx.fillRect(cx - 12, cy - 8, 24, 4);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillStyle = '#888844';
    ctx.fillRect(cx - 12, cy + 2, 24, 2);
    ctx.fillRect(cx - 12, cy + 7, 24, 2);
    ctx.fillStyle = `rgba(255, 200, 50, ${pulse})`;
    ctx.font = `bold 9px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ANDE ATÉ O BAÚ', cx, cy + 26);
    ctx.textAlign = 'left';
  }

  if (roomType === 'shrine' && !collected) {
    // ... keep existing code
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45);
    glow.addColorStop(0, `rgba(100, 50, 255, ${0.12 * pulse})`);
    glow.addColorStop(1, 'rgba(100, 50, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 45, cy - 45, 90, 90);
    ctx.fillStyle = '#222233';
    ctx.fillRect(cx - 14, cy, 28, 10);
    ctx.fillStyle = '#333344';
    ctx.fillRect(cx - 10, cy - 8, 20, 10);
    ctx.fillStyle = `rgba(150, 100, 255, ${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx - 5, cy - 6);
    ctx.lineTo(cx + 5, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(150, 100, 255, ${0.4 * pulse})`;
    ctx.fillRect(cx - 16, cy + 4, 3, 3);
    ctx.fillRect(cx + 14, cy + 4, 3, 3);
    ctx.fillStyle = `rgba(180, 130, 255, ${pulse})`;
    ctx.font = `bold 9px ${C.HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SANTUÁRIO SOMBRIO', cx, cy + 26);
    ctx.textAlign = 'left';
  }

  if (roomType === 'trap') {
    if (!collected) {
      ctx.fillStyle = `rgba(255, 80, 80, ${pulse})`;
      ctx.font = `bold 9px ${C.HUD_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠ CUIDADO COM O CHÃO ⚠', cx, 34);
      ctx.textAlign = 'left';
    }
  }
}

// ============ HP-REACTIVE HORROR SYSTEM ============
// All effects scale with player HP ratio — lower HP = more intense horror

interface HPHorrorState {
  heartbeatTimer: number;
  ghostFootstepTimer: number;
  scratchTimer: number;
  growlTimer: number;
  darkPulseTimer: number;
  bloodDrops: { x: number; y: number; size: number; alpha: number; speed: number }[];
  chromaticTimer: number;
}

const hpHorror: HPHorrorState = {
  heartbeatTimer: 0,
  ghostFootstepTimer: 0,
  scratchTimer: 0,
  growlTimer: 0,
  darkPulseTimer: 0,
  bloodDrops: [],
  chromaticTimer: 0,
};

// === HP-REACTIVE AUDIO ===

function playHPHeartbeat(hpRatio: number) {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  // Faster and louder as HP drops
  const bpm = 60 + (1 - hpRatio) * 120; // 60-180 bpm
  const interval = 60 / bpm;
  const vol = 0.04 + (1 - hpRatio) * 0.12;
  
  for (let i = 0; i < 2; i++) {
    const t = ctx.currentTime + i * interval * 0.3;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(i === 0 ? 45 : 60, t);
    osc.frequency.exponentialRampToValueAtTime(i === 0 ? 20 : 30, t + 0.15);
    gain.gain.setValueAtTime(i === 0 ? vol : vol * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

function playGhostFootstep() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(rng(-0.9, 0.9), ctx.currentTime);
  
  // Soft footstep behind the player
  const noise = createNoise(ctx, 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(rng(300, 800), ctx.currentTime);
  filter.Q.setValueAtTime(3, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(rng(0.02, 0.04), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  noise.start();
}

function playWallScratch() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const dur = rng(0.3, 0.8);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(rng(1500, 3000), ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(rng(800, 1500), ctx.currentTime + dur);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.Q.setValueAtTime(6, ctx.currentTime);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(rng(0.015, 0.03), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(rng(-1, 1), ctx.currentTime);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function playDeepGrowl() {
  if (!ambienceActive) return;
  const ctx = getBgCtx();
  const dur = rng(0.6, 1.2);
  
  // Deep resonant growl
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(rng(30, 50), ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(rng(20, 35), ctx.currentTime + dur);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(100, ctx.currentTime);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(rng(0.06, 0.1), ctx.currentTime + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  
  // Sub-rumble
  const noise = createNoise(ctx, dur);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(60, ctx.currentTime);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.03, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start();
}

// === HP-REACTIVE UPDATE (called every frame) ===

export function updateHPHorror(hpRatio: number, dt: number, floor: number) {
  // Heartbeat — continuous at HP < 40%
  if (hpRatio < 0.4) {
    hpHorror.heartbeatTimer -= dt;
    if (hpHorror.heartbeatTimer <= 0) {
      const bpm = 60 + (1 - hpRatio) * 120;
      hpHorror.heartbeatTimer = 60 / bpm;
      playHPHeartbeat(hpRatio);
    }
  } else {
    hpHorror.heartbeatTimer = 0;
  }

  // Ghost footsteps — HP < 40%
  if (hpRatio < 0.4) {
    hpHorror.ghostFootstepTimer -= dt;
    if (hpHorror.ghostFootstepTimer <= 0) {
      hpHorror.ghostFootstepTimer = rng(2, 5) * hpRatio * 2.5;
      playGhostFootstep();
    }
  }

  // Wall scratching — HP < 25%
  if (hpRatio < 0.25) {
    hpHorror.scratchTimer -= dt;
    if (hpHorror.scratchTimer <= 0) {
      hpHorror.scratchTimer = rng(4, 10);
      playWallScratch();
    }
  }

  // Deep growl — HP < 20%, very rare
  if (hpRatio < 0.2) {
    hpHorror.growlTimer -= dt;
    if (hpHorror.growlTimer <= 0) {
      hpHorror.growlTimer = rng(15, 40);
      if (maybe(0.5)) playDeepGrowl();
    }
  }

  // Random darkness pulses
  hpHorror.darkPulseTimer -= dt;
  if (hpHorror.darkPulseTimer <= 0) {
    hpHorror.darkPulseTimer = rng(3, 8);
  }

  // Blood drops when critical
  if (hpRatio < 0.3) {
    if (maybe(dt * (1 - hpRatio) * 3)) {
      hpHorror.bloodDrops.push({
        x: Math.random(),
        y: 0,
        size: rng(2, 6),
        alpha: rng(0.3, 0.7),
        speed: rng(0.02, 0.06),
      });
    }
  }
  // Update blood drops
  hpHorror.bloodDrops = hpHorror.bloodDrops.filter(d => {
    d.y += d.speed * dt * 60;
    d.alpha -= dt * 0.1;
    return d.alpha > 0 && d.y < 1.2;
  });

  // Chromatic aberration timer
  if (hpRatio < 0.3) {
    hpHorror.chromaticTimer = Math.min(1, hpHorror.chromaticTimer + dt * 2);
  } else {
    hpHorror.chromaticTimer = Math.max(0, hpHorror.chromaticTimer - dt * 3);
  }
}

// === HP-REACTIVE VISUAL RENDERING ===

export function renderHPHorror(ctx: CanvasRenderingContext2D, hpRatio: number, time: number, vp: Viewport) {
  const fx = -vp.gox;
  const fy = -vp.goy;
  const fw = vp.rw;
  const fh = vp.rh;

  // 1. HP-reactive vignette — subtle darkening at edges, starts at 40%
  if (hpRatio < 0.4) {
    const intensity = (0.4 - hpRatio) / 0.4; // 0 at 40%, 1 at 0%
    const redShift = Math.min(1, intensity * 1.2);
    const r = Math.floor(40 + redShift * 50);
    const g = 0;
    const b = 0;
    const baseAlpha = intensity * 0.2; // much lighter max alpha
    
    const vignette = ctx.createRadialGradient(
      fw / 2 + fx, fh / 2 + fy, fw * 0.25,
      fw / 2 + fx, fh / 2 + fy, fw * 0.6
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.15})`);
    vignette.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // 2. Blood overlay — very subtle edge stains when HP < 35%
  if (hpRatio < 0.35) {
    const bloodIntensity = (0.35 - hpRatio) / 0.35;
    
    // Corner blood stains — much smaller and more transparent
    const corners = [
      { x: fx, y: fy },
      { x: fx + fw, y: fy },
      { x: fx, y: fy + fh },
      { x: fx + fw, y: fy + fh },
    ];
    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      const radius = 30 + bloodIntensity * 40;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
      const alpha = bloodIntensity * 0.1 + Math.sin(time * 2 + i) * 0.02;
      grad.addColorStop(0, `rgba(80, 0, 0, ${alpha})`);
      grad.addColorStop(0.6, `rgba(50, 0, 0, ${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(30, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(c.x - radius, c.y - radius, radius * 2, radius * 2);
    }

    // Blood drips from top when critical
    for (const drop of hpHorror.bloodDrops) {
      const dx = fx + drop.x * fw;
      const dy = fy + drop.y * fh;
      ctx.fillStyle = `rgba(120, 10, 0, ${drop.alpha})`;
      ctx.beginPath();
      ctx.ellipse(dx, dy, drop.size * 0.4, drop.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Heartbeat pulse flash — subtle red flash at HP < 25%
  if (hpRatio < 0.25) {
    const bpm = 60 + (1 - hpRatio) * 120;
    const beatPhase = (time * bpm / 60) % 1;
    const beatFlash = beatPhase < 0.1 ? Math.sin(beatPhase / 0.1 * Math.PI) : 0;
    if (beatFlash > 0) {
      ctx.fillStyle = `rgba(100, 0, 0, ${beatFlash * 0.06 * (1 - hpRatio) * 2})`;
      ctx.fillRect(fx, fy, fw, fh);
    }
  }

  // 4. Ambient darkness pulses — random brief darkening
  if (hpHorror.darkPulseTimer < 0.3) {
    const pulseAlpha = (0.3 - hpHorror.darkPulseTimer) / 0.3 * 0.15;
    ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha * Math.sin(hpHorror.darkPulseTimer * 20)})`;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // 5. Chromatic aberration at low HP
  if (hpHorror.chromaticTimer > 0.01) {
    const offset = hpHorror.chromaticTimer * 3 * Math.sin(time * 15);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 0, 0, ${0.02 * hpHorror.chromaticTimer})`;
    ctx.fillRect(fx + offset, fy, fw, fh);
    ctx.fillStyle = `rgba(0, 0, 255, ${0.02 * hpHorror.chromaticTimer})`;
    ctx.fillRect(fx - offset, fy, fw, fh);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 6. Enhanced shadow figures at low HP — taller, with aura
  if (hpRatio < 0.4) {
    const shadowChance = (0.4 - hpRatio) * 0.003;
    if (maybe(shadowChance)) {
      const sx = Math.random() * C.dims.gw;
      const sy = Math.random() * C.dims.gh;
      // Tall shadow figure
      ctx.fillStyle = `rgba(5, 0, 10, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 10, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dark aura
      const aura = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
      aura.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(sx - 30, sy - 30, 60, 60);
      // Bright red eyes
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(sx - 4, sy - 14, 2.5, 2.5);
      ctx.fillRect(sx + 2, sy - 14, 2.5, 2.5);
      // Eye glow
      const eg = ctx.createRadialGradient(sx, sy - 14, 0, sx, sy - 14, 10);
      eg.addColorStop(0, 'rgba(255, 0, 0, 0.1)');
      eg.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = eg;
      ctx.fillRect(sx - 10, sy - 24, 20, 20);
    }
  }

  // 7. Multiple eyes in darkness when HP very low
  if (hpRatio < 0.25) {
    const eyeCount = Math.floor((0.25 - hpRatio) * 20);
    for (let i = 0; i < eyeCount; i++) {
      // Use deterministic positions based on time so they don't flicker every frame
      const seed = Math.sin(i * 127.1 + Math.floor(time * 0.5) * 311.7);
      const seed2 = Math.cos(i * 269.5 + Math.floor(time * 0.5) * 183.3);
      const ex = (seed * 0.5 + 0.5) * C.dims.gw;
      const ey = (seed2 * 0.5 + 0.5) * C.dims.gh;
      const blink = Math.sin(time * 3 + i * 1.7) > -0.3;
      if (blink) {
        const eyeAlpha = 0.2 + Math.sin(time * 2 + i) * 0.1;
        ctx.fillStyle = `rgba(255, 30, 0, ${eyeAlpha})`;
        ctx.fillRect(ex - 3, ey, 2, 1.5);
        ctx.fillRect(ex + 2, ey, 2, 1.5);
      }
    }
  }
}

// === BREATHING LIGHT RADIUS ===
// Returns a multiplier for the light radius based on HP
export function getHPLightPulse(hpRatio: number, time: number): number {
  if (hpRatio > 0.5) return 1;
  // Light "breathes" — pulses subtly, more intensely at low HP
  const intensity = (0.5 - hpRatio) / 0.5; // 0 to 1
  const breathRate = 1.5 + intensity * 2; // faster breathing at lower HP
  const breathAmp = 0.05 + intensity * 0.15; // wider pulse at lower HP
  return 1 - breathAmp + Math.sin(time * breathRate) * breathAmp;
}

// ============ BOSS INTRO SYSTEM ============

import { BOSS_DATA } from './bosses';

interface BossIntroState {
  active: boolean;
  floor: number;
  timer: number;
  duration: number;
}

let bossIntro: BossIntroState = { active: false, floor: 1, timer: 0, duration: 3.5 };

export function triggerBossIntro(floor: number) {
  bossIntro = { active: true, floor, timer: 3.5, duration: 3.5 };
}

export function isBossIntroActive(): boolean {
  return bossIntro.active;
}

export function updateBossIntro(dt: number) {
  if (!bossIntro.active) return;
  bossIntro.timer -= dt;
  if (bossIntro.timer <= 0) {
    bossIntro.active = false;
  }
}

export function renderBossIntro(ctx: CanvasRenderingContext2D, time: number, vp: Viewport) {
  if (!bossIntro.active) return;
  
  const floor = bossIntro.floor;
  const progress = 1 - (bossIntro.timer / bossIntro.duration);
  const fadeIn = Math.min(1, progress * 3);
  const fadeOut = Math.max(0, 1 - (progress - 0.7) * 3.33);
  const alpha = Math.min(fadeIn, fadeOut);
  
  const data = BOSS_DATA[floor] || BOSS_DATA[1];
  
  const fx = -vp.gox;
  const fy = -vp.goy;
  const fw = vp.rw;
  const fh = vp.rh;
  
  // Dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${0.9 * alpha})`;
  ctx.fillRect(fx, fy, fw, fh);
  
  const cx = C.dims.gw / 2;
  const cy = C.dims.gh / 2;
  const silScale = 0.8 + progress * 0.2;
  const silSize = (20 + floor * 4) * silScale;
  const silY = cy - 15;
  
  // Floor-specific vignette color
  const vignetteColors: Record<number, string> = {
    1: `rgba(80, 0, 0, ${0.5 * alpha})`,
    2: `rgba(100, 50, 0, ${0.5 * alpha})`,
    3: `rgba(60, 0, 80, ${0.5 * alpha})`,
    4: `rgba(0, 60, 60, ${0.5 * alpha})`,
    5: `rgba(80, 40, 0, ${0.6 * alpha})`,
    6: `rgba(60, 0, 0, ${0.7 * alpha})`,
  };
  const vignette = ctx.createRadialGradient(cx, cy, 20, cx, cy, C.dims.gw * 0.5);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, vignetteColors[floor] || vignetteColors[1]);
  ctx.fillStyle = vignette;
  ctx.fillRect(fx, fy, fw, fh);
  
  // Floor-specific glow color
  const glowPulse = Math.sin(time * 4) * 0.15 + 0.35;
  const glowColors: Record<number, string> = {
    1: `rgba(200, 0, 0, ${glowPulse * alpha})`,
    2: `rgba(255, 120, 0, ${glowPulse * alpha})`,
    3: `rgba(150, 0, 220, ${glowPulse * alpha})`,
    4: `rgba(0, 200, 180, ${glowPulse * alpha})`,
    5: `rgba(200, 100, 0, ${glowPulse * alpha})`,
    6: `rgba(200, 0, 50, ${(glowPulse + 0.1) * alpha})`,
  };
  const glow = ctx.createRadialGradient(cx, silY, silSize * 0.3, cx, silY, silSize * 2);
  glow.addColorStop(0, glowColors[floor] || glowColors[1]);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - silSize * 2, silY - silSize * 2, silSize * 4, silSize * 4);
  
  // Floor-specific silhouettes
  ctx.fillStyle = `rgba(10, 0, 0, ${0.95 * alpha})`;
  
  switch (floor) {
    case 1: // Sombra Faminta — demonic winged shape
      ctx.beginPath();
      ctx.moveTo(cx, silY - silSize);
      ctx.lineTo(cx + silSize * 0.8, silY + silSize * 0.6);
      ctx.lineTo(cx + silSize * 0.3, silY + silSize * 0.4);
      ctx.lineTo(cx + silSize * 0.5, silY + silSize);
      ctx.lineTo(cx, silY + silSize * 0.7);
      ctx.lineTo(cx - silSize * 0.5, silY + silSize);
      ctx.lineTo(cx - silSize * 0.3, silY + silSize * 0.4);
      ctx.lineTo(cx - silSize * 0.8, silY + silSize * 0.6);
      ctx.closePath();
      ctx.fill();
      // Horns
      ctx.beginPath();
      ctx.moveTo(cx - silSize * 0.3, silY - silSize * 0.6);
      ctx.lineTo(cx - silSize * 0.7, silY - silSize * 1.3);
      ctx.lineTo(cx - silSize * 0.15, silY - silSize * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + silSize * 0.3, silY - silSize * 0.6);
      ctx.lineTo(cx + silSize * 0.7, silY - silSize * 1.3);
      ctx.lineTo(cx + silSize * 0.15, silY - silSize * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 2: // O Caçador — sleek predator with speed lines
      ctx.beginPath();
      ctx.moveTo(cx, silY - silSize * 1.1);
      ctx.lineTo(cx + silSize * 0.6, silY - silSize * 0.2);
      ctx.lineTo(cx + silSize * 1.2, silY + silSize * 0.3);
      ctx.lineTo(cx + silSize * 0.4, silY + silSize * 0.8);
      ctx.lineTo(cx, silY + silSize * 0.6);
      ctx.lineTo(cx - silSize * 0.4, silY + silSize * 0.8);
      ctx.lineTo(cx - silSize * 1.2, silY + silSize * 0.3);
      ctx.lineTo(cx - silSize * 0.6, silY - silSize * 0.2);
      ctx.closePath();
      ctx.fill();
      // Speed lines
      ctx.strokeStyle = `rgba(255, 120, 0, ${0.3 * alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const ly = silY - silSize + i * silSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + silSize * 1.3, ly);
        ctx.lineTo(cx + silSize * 2.5, ly - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - silSize * 1.3, ly);
        ctx.lineTo(cx - silSize * 2.5, ly - 3);
        ctx.stroke();
      }
      break;
      
    case 3: // O Invocador — hooded figure with floating orbs
      ctx.beginPath();
      ctx.arc(cx, silY - silSize * 0.4, silSize * 0.5, Math.PI, Math.PI * 2);
      ctx.lineTo(cx + silSize * 0.7, silY + silSize);
      ctx.lineTo(cx - silSize * 0.7, silY + silSize);
      ctx.closePath();
      ctx.fill();
      // Staff
      ctx.fillRect(cx + silSize * 0.5, silY - silSize * 1.2, 3, silSize * 2.4);
      ctx.fillStyle = `rgba(150, 0, 220, ${0.6 * alpha})`;
      ctx.beginPath();
      ctx.arc(cx + silSize * 0.5 + 1, silY - silSize * 1.2, 5, 0, Math.PI * 2);
      ctx.fill();
      // Floating orbs
      for (let i = 0; i < 4; i++) {
        const oa = time * 2 + i * Math.PI / 2;
        const ox = cx + Math.cos(oa) * silSize * 1.2;
        const oy = silY + Math.sin(oa) * silSize * 0.6;
        ctx.fillStyle = `rgba(200, 100, 255, ${(0.4 + Math.sin(time * 3 + i) * 0.2) * alpha})`;
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 4: // O Fantasma — ethereal transparent form
      ctx.fillStyle = `rgba(0, 180, 160, ${0.4 * alpha})`;
      ctx.beginPath();
      ctx.arc(cx, silY, silSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Wispy tendrils
      for (let i = 0; i < 5; i++) {
        const tx = cx + Math.sin(time * 3 + i * 1.3) * silSize * 0.5;
        const ty = silY + silSize * 0.5 + i * 5;
        ctx.fillStyle = `rgba(0, 200, 180, ${(0.3 - i * 0.05) * alpha})`;
        ctx.fillRect(tx - 3, ty, 6, 4);
      }
      // Phase effect
      ctx.fillStyle = `rgba(0, 255, 220, ${0.15 * alpha * Math.abs(Math.sin(time * 5))})`;
      ctx.beginPath();
      ctx.arc(cx, silY, silSize * 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 5: // O Destruidor — massive hulking form
      ctx.fillStyle = `rgba(10, 0, 0, ${0.95 * alpha})`;
      // Huge body
      ctx.fillRect(cx - silSize * 0.8, silY - silSize * 0.5, silSize * 1.6, silSize * 1.5);
      // Shoulders
      ctx.fillRect(cx - silSize * 1.2, silY - silSize * 0.3, silSize * 0.5, silSize * 0.8);
      ctx.fillRect(cx + silSize * 0.7, silY - silSize * 0.3, silSize * 0.5, silSize * 0.8);
      // Head
      ctx.beginPath();
      ctx.arc(cx, silY - silSize * 0.7, silSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Impact cracks on ground
      ctx.strokeStyle = `rgba(200, 100, 0, ${0.4 * alpha * glowPulse})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const ca = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, silY + silSize);
        ctx.lineTo(cx + Math.cos(ca) * silSize * 1.5, silY + silSize + Math.sin(ca) * silSize * 0.5 + 10);
        ctx.stroke();
      }
      break;
      
    case 6: // O Pesadelo — amorphous shifting horror
      // Multiple overlapping forms
      for (let i = 0; i < 4; i++) {
        const ox = Math.sin(time * 2 + i * 1.5) * 5;
        const oy = Math.cos(time * 1.8 + i * 1.2) * 3;
        ctx.fillStyle = `rgba(${10 + i * 15}, 0, ${i * 10}, ${(0.6 - i * 0.1) * alpha})`;
        ctx.beginPath();
        ctx.arc(cx + ox, silY + oy, silSize * (0.9 - i * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      // Tendrils reaching out
      for (let i = 0; i < 8; i++) {
        const ta = (i / 8) * Math.PI * 2 + time * 0.5;
        const tLen = silSize * (1.2 + Math.sin(time * 3 + i) * 0.4);
        ctx.strokeStyle = `rgba(150, 0, 30, ${0.4 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, silY);
        ctx.lineTo(cx + Math.cos(ta) * tLen, silY + Math.sin(ta) * tLen);
        ctx.stroke();
      }
      // Multiple eyes
      for (let i = 0; i < 6; i++) {
        const ea = time * 1.5 + i * Math.PI / 3;
        const er = silSize * 0.4;
        const ex = cx + Math.cos(ea) * er;
        const ey = silY + Math.sin(ea) * er * 0.6;
        ctx.fillStyle = `rgba(255, 0, 30, ${(0.6 + Math.sin(time * 8 + i) * 0.3) * alpha})`;
        ctx.fillRect(ex - 2, ey - 1, 4, 2);
      }
      break;
  }
  
  // Eyes for floors 1, 2, 5
  if (floor <= 2 || floor === 5) {
    const eyeGlow = Math.sin(time * 6) * 0.2 + 0.8;
    const eyeColor = floor === 2 ? `rgba(255, 150, 0, ${eyeGlow * alpha})` : `rgba(255, 0, 0, ${eyeGlow * alpha})`;
    ctx.fillStyle = eyeColor;
    ctx.fillRect(cx - silSize * 0.25, silY - silSize * 0.2, 4, 3);
    ctx.fillRect(cx + silSize * 0.15, silY - silSize * 0.2, 4, 3);
  }
  
  // Floor label
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(150, 80, 80, ${0.7 * alpha})`;
  ctx.font = `bold 9px ${C.HUD_FONT}`;
  ctx.fillText(`— ANDAR ${floor} —`, cx, cy - 55);
  
  // Boss name
  const nameShake = progress < 0.3 ? Math.sin(time * 40) * 2 * (1 - progress * 3) : 0;
  ctx.fillStyle = data.accentColor.replace(')', `, ${alpha})`).replace('#', '');
  // Convert hex to rgba for alpha
  const hexToRgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  ctx.fillStyle = hexToRgba(data.accentColor, alpha);
  ctx.font = `bold 16px ${C.HUD_FONT}`;
  ctx.fillText(data.name, cx + nameShake, cy + 35);
  
  // Title
  ctx.fillStyle = `rgba(200, 150, 150, ${0.8 * alpha})`;
  ctx.font = `10px ${C.HUD_FONT}`;
  ctx.fillText(data.title, cx, cy + 50);
  
  // Scan lines
  for (let y = -vp.goy; y < vp.rh - vp.goy; y += 3) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.06 * alpha})`;
    ctx.fillRect(-vp.gox, y, vp.rw, 1);
  }
  
  ctx.textAlign = 'left';
}
