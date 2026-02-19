
const fs = require('fs');
const path = require('path');

const rendererPath = path.join('src', 'game', 'renderer.ts');
const newAxePath = 'axe_silhouette_v2.ts';

try {
    let rendererContent = fs.readFileSync(rendererPath, 'utf8');
    let newAxeContent = fs.readFileSync(newAxePath, 'utf8');

    // Remove 'export '
    newAxeContent = newAxeContent.replace('export function', 'function');

    // We need to overwrite the PREVIOUS step (which was Step 1 Reset). 
    // The previous step might be '/** Battle Axe - RESTART STEP 1: PURE SILHOUETTE */'
    // but the node script might have messed up or updated it.

    // Let's just search for 'function drawBattleAxe'
    // and REPLACE IT ENTIRELY up to '/** Draws realistic Dual Daggers */'

    const startMarkerRegex = /\/\*\* Battle Axe.*?\*\/\s*function drawBattleAxe/s;
    const match = rendererContent.match(startMarkerRegex);

    let startIndex = -1;
    if (match) {
        startIndex = match.index;
    } else {
        startIndex = rendererContent.indexOf('function drawBattleAxe');
        // Backtrack to find comment if possible
        if (startIndex !== -1) {
            const preBlock = rendererContent.substring(Math.max(0, startIndex - 200), startIndex);
            const commentMatch = preBlock.lastIndexOf('/** Battle Axe');
            if (commentMatch !== -1) {
                startIndex = Math.max(0, startIndex - 200) + commentMatch;
            }
        }
    }

    const endMarker = '/** Draws realistic Dual Daggers */';
    const endIndex = rendererContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find start or end markers.');
        process.exit(1);
    }

    // Replace
    const updatedContent = rendererContent.substring(0, startIndex) +
        newAxeContent + '\n\n' +
        rendererContent.substring(endIndex);

    fs.writeFileSync(rendererPath, updatedContent, 'utf8');
    console.log('Successfully updated renderer.ts');

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
