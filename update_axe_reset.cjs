
const fs = require('fs');
const path = require('path');

const rendererPath = path.join('src', 'game', 'renderer.ts');
const newAxePath = 'axe_reset_step1.ts';

try {
    let rendererContent = fs.readFileSync(rendererPath, 'utf8');
    let newAxeContent = fs.readFileSync(newAxePath, 'utf8');

    // Remove 'export '
    newAxeContent = newAxeContent.replace('export function', 'function');

    // We need to match the block to replace.
    // The previous block starts with '/** Battle Axe - STEP 3: FINAL DETAILS (Realistic Textures) */'
    const startMarker = '/** Battle Axe - STEP 3: FINAL DETAILS (Realistic Textures) */';
    // Fallback if that marker isn't found (maybe previous step failed?)
    // Try Step 2 marker
    const startMarker2 = '/** Battle Axe - STEP 2 REVISED: BETTER COLOR BLOCKS */';

    let startIndex = rendererContent.indexOf(startMarker);
    if (startIndex === -1) {
        startIndex = rendererContent.indexOf(startMarker2);
    }

    // If still not found, try generic function search
    if (startIndex === -1) {
        // Look for the function definition directly
        const funcDef = 'function drawBattleAxe';
        startIndex = rendererContent.indexOf(funcDef);
        // And check if there's a comment right before it?
        // Let's just assume we replace from the function definition if we can't find the comment block.
        // But we want to include the comment block in the replacement if possible to keep file clean.
        // Let's try to search backwards for '/** Battle Axe'
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
