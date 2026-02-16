// Brightness/Gamma system — applied as a post-processing overlay
// Saves to localStorage so settings persist across sessions

const BRIGHTNESS_KEY = 'dungeon_of_shadows_brightness';

let brightness = loadBrightness();

function loadBrightness(): number {
  try {
    const val = localStorage.getItem(BRIGHTNESS_KEY);
    if (val !== null) return parseFloat(val);
  } catch {}
  return 0; // 0 = default, range -0.5 to 0.5
}

export function getBrightness(): number {
  return brightness;
}

export function setBrightness(val: number) {
  brightness = Math.max(-0.5, Math.min(0.5, val));
  try {
    localStorage.setItem(BRIGHTNESS_KEY, brightness.toString());
  } catch {}
}

/**
 * Apply brightness overlay as the final post-processing step.
 * Positive = lighter (white overlay), Negative = darker (black overlay).
 * Applied AFTER all other rendering, before copy to display canvas.
 */
export function applyBrightness(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (Math.abs(brightness) < 0.01) return;
  
  if (brightness > 0) {
    // Lighten — soft white overlay
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // Darken — multiply black overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(brightness) * 0.7})`;
    ctx.fillRect(0, 0, w, h);
  }
}
