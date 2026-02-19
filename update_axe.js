
const fs = require('fs');
const path = require('path');

const rendererPath = path.join('src', 'game', 'renderer.ts');
const newAxePath = 'realistic_axe.ts';

try {
    let rendererContent = fs.readFileSync(rendererPath, 'utf8');
    const newAxeContent = fs.readFileSync(newAxePath, 'utf8');

    // Remove 'export ' from new Axe content if present, to match local function style
    // The previous write_to_file used 'export function', but renderer.ts usually has 'function' or 'export function' depending.
    // Looking at view_file, drawBattleAxe is NOT exported in renderer.ts (it says 'function drawBattleAxe').
    // But realistic_axe.ts has 'export function'.

    let cleanNewContent = newAxeContent.replace('export function drawBattleAxe', 'function drawBattleAxe');

    // We need to match the block to replace.
    // Start marker: /** Battle Axe - Exact Replica of Reference (Double-Bladed Royal Axe) */
    // End marker: logic is tricky, but we know it ends before 'function drawDualDaggers'

    const startMarker = '/** Battle Axe - Exact Replica of Reference (Double-Bladed Royal Axe) */';
    const endMarker = '/** Draws realistic Dual Daggers */';

    const startIndex = rendererContent.indexOf(startMarker);
    const endIndex = rendererContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find start or end markers.');
        console.log('Start index:', startIndex);
        console.log('End index:', endIndex);
        process.exit(1);
    }

    // Replace the content
    const updatedContent = rendererContent.substring(0, startIndex) +
        cleanNewContent + '\n\n' +
        rendererContent.substring(endIndex);

    fs.writeFileSync(rendererPath, updatedContent, 'utf8');
    console.log('Successfully updated renderer.ts');

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
