// Brightness system — source of truth for the ambient darkness level
// Controls how dark the room shadows are relative to the player's light
// Saves to localStorage so settings persist across sessions

const BRIGHTNESS_KEY = 'dungeon_of_shadows_brightness';

let brightnessValue = loadBrightness();

function loadBrightness(): number {
  try {
    const val = localStorage.getItem(BRIGHTNESS_KEY);
    if (val !== null) return parseFloat(val);
  } catch (e) {
    console.warn('Failed to load brightness from localStorage', e);
  }
  return 0; // 0 = default, range -0.5 to 0.5
}

export function getBrightness(): number {
  return brightnessValue;
}

export function setBrightness(val: number) {
  brightnessValue = Math.max(-0.5, Math.min(0.5, val));
  try {
    localStorage.setItem(BRIGHTNESS_KEY, brightnessValue.toString());
  } catch (e) {
    console.warn('Failed to save brightness to localStorage', e);
  }
}

/** 
 * Legacy global overlay logic removed.
 * Brightness is now applied directly in the rendering pipeline (renderer.ts)
 * by scaling the ambient darkness gradient stops.
 */
export function applyBrightness(ctx: CanvasRenderingContext2D) {
  // Global overlay disabled to prioritize ambient darkness control
}

/** Legacy preview overlay disabled */
export function applyBrightnessToCanvas(previewCtx: CanvasRenderingContext2D) {
  // Global overlay disabled to prioritize ambient darkness control
}
