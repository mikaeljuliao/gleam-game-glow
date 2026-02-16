// Brightness/Gamma system — real gamma correction via pixel data LUT
// Raises or lowers shadow detail without washing colors or creating overlays
// Saves to localStorage so settings persist across sessions

const BRIGHTNESS_KEY = 'dungeon_of_shadows_brightness';

let brightnessValue = loadBrightness();
let gammaLUT: Uint8Array = new Uint8Array(256);
buildLUT();

function loadBrightness(): number {
  try {
    const val = localStorage.getItem(BRIGHTNESS_KEY);
    if (val !== null) return parseFloat(val);
  } catch {}
  return 0; // 0 = default, range -0.5 to 0.5
}

function buildLUT() {
  // Map slider [-0.5, 0.5] to gamma exponent
  // 0 = gamma 1.0 (no change)
  // +0.5 = gamma ~0.45 (much brighter shadows, reveals detail)
  // -0.5 = gamma ~1.8 (darker, more contrast)
  const gamma = Math.pow(2, -brightnessValue * 2.2);
  const invG = 1 / Math.max(0.2, Math.min(3.0, gamma));
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(i / 255, invG))));
  }
}

export function getBrightness(): number {
  return brightnessValue;
}

export function setBrightness(val: number) {
  brightnessValue = Math.max(-0.5, Math.min(0.5, val));
  buildLUT();
  try {
    localStorage.setItem(BRIGHTNESS_KEY, brightnessValue.toString());
  } catch {}
}

/**
 * Apply real gamma correction to the rendered frame via pixel data.
 * This lifts shadows and reveals dark details (positive brightness)
 * or deepens contrast (negative brightness) — without overlays or color wash.
 * 
 * Call this AFTER game world rendering but BEFORE HUD rendering
 * so UI text remains crisp and unaffected.
 */
export function applyBrightness(ctx: CanvasRenderingContext2D) {
  if (Math.abs(brightnessValue) < 0.01) return;
  
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  
  const imageData = ctx.getImageData(0, 0, cw, ch);
  const buf = new Uint32Array(imageData.data.buffer);
  const len = buf.length;
  const lut = gammaLUT;
  
  for (let i = 0; i < len; i++) {
    const px = buf[i];
    const r = lut[px & 0xFF];
    const g = lut[(px >> 8) & 0xFF];
    const b = lut[(px >> 16) & 0xFF];
    const a = px & 0xFF000000;
    buf[i] = a | (b << 16) | (g << 8) | r;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/** Apply gamma LUT to a standalone canvas (for preview rendering) */
export function applyBrightnessToCanvas(previewCtx: CanvasRenderingContext2D) {
  if (Math.abs(brightnessValue) < 0.01) return;
  
  const cw = previewCtx.canvas.width;
  const ch = previewCtx.canvas.height;
  
  const imageData = previewCtx.getImageData(0, 0, cw, ch);
  const buf = new Uint32Array(imageData.data.buffer);
  const len = buf.length;
  const lut = gammaLUT;
  
  for (let i = 0; i < len; i++) {
    const px = buf[i];
    const r = lut[px & 0xFF];
    const g = lut[(px >> 8) & 0xFF];
    const b = lut[(px >> 16) & 0xFF];
    const a = px & 0xFF000000;
    buf[i] = a | (b << 16) | (g << 8) | r;
  }
  
  previewCtx.putImageData(imageData, 0, 0);
}
