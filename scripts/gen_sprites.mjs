/**
 * gen_sprites.mjs
 * Generates directional player sprites from the idle (down) base sprite.
 * Run with: node scripts/gen_sprites.mjs
 *
 * Requires: npm install canvas  (or: npm install @napi-rs/canvas)
 * Output: public/player_right.png, public/player_up.png,
 *         public/player_dn_right.png, public/player_up_right.png
 */

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const SRC = resolve(PUBLIC, 'player_idle.png');

if (!existsSync(SRC)) {
    console.error('❌  player_idle.png not found in /public. Aborting.');
    process.exit(1);
}

const SIZE = 256; // work at 256×256 internally for quality

/**
 * Draws a transformed version of the source image onto a new canvas.
 * @param {import('canvas').Image} img  - source image
 * @param {function(ctx, size)} drawFn  - transformation function
 * @returns {Buffer} PNG buffer
 */
function makeSprite(img, drawFn) {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawFn(ctx, img, SIZE);
    return canvas.toBuffer('image/png');
}

async function main() {
    console.log('📂  Loading', SRC);
    const img = await loadImage(SRC);

    const sprites = {
        // ─── Right: rotate 90° clockwise ─────────────────────────
        'player_right.png': (ctx, img, S) => {
            ctx.translate(S / 2, S / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -S / 2, -S / 2, S, S);
        },

        // ─── Up / Back: rotate 180° ───────────────────────────────
        'player_up.png': (ctx, img, S) => {
            ctx.translate(S / 2, S / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, -S / 2, -S / 2, S, S);
        },

        // ─── Down-Right diagonal: rotate 45° clockwise ───────────
        'player_dn_right.png': (ctx, img, S) => {
            ctx.translate(S / 2, S / 2);
            ctx.rotate(Math.PI / 4);
            ctx.drawImage(img, -S / 2, -S / 2, S, S);
        },

        // ─── Up-Right diagonal: rotate -45° (counter-clockwise) ──
        'player_up_right.png': (ctx, img, S) => {
            ctx.translate(S / 2, S / 2);
            ctx.rotate(-Math.PI / 4);
            ctx.drawImage(img, -S / 2, -S / 2, S, S);
        },
    };

    let ok = 0;
    for (const [filename, drawFn] of Object.entries(sprites)) {
        const outPath = resolve(PUBLIC, filename);
        const buf = makeSprite(img, drawFn);
        writeFileSync(outPath, buf);
        console.log('✅  Written:', outPath);
        ok++;
    }

    console.log(`\n🎉  Done — ${ok} sprites generated in /public`);
}

main().catch(err => {
    console.error('❌  Error:', err.message);
    process.exit(1);
});
