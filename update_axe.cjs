
const fs = require('fs');
const path = require('path');

const rendererPath = path.join('src', 'game', 'renderer.ts');
const newAxePath = 'axe_step3.ts';

try {
    let rendererContent = fs.readFileSync(rendererPath, 'utf8');
    let newAxeContent = fs.readFileSync(newAxePath, 'utf8');

    // Remove 'export '
    newAxeContent = newAxeContent.replace('export function', 'function');

    // Check marker from Step 2
    const startMarker = '/** Battle Axe - STEP 2: COLOR BLOCKS (No Texture) */';
    const endMarker = '/** Draws realistic Dual Daggers */';

    const startIndex = rendererContent.indexOf(startMarker);
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
