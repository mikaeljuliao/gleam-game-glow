/** Battle Axe - Reference Match (Teal/White Vector Style) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    const totalLen = length * 1.3;
    const headPos = -totalLen * 0.8;

    // 1. HANDLE
    const handleW = 5;

    // -- Grip (Black & Cross-Hatch) --
    // Draw full length background
    ctx.fillStyle = '#111';
    ctx.fillRect(-totalLen, -handleW / 2, totalLen + 10, handleW);

    // Cross-hatch grip pattern
    // White/Grey lines on black
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const gripStart = -totalLen;
    const gripEnd = headPos + 20; // Goes fairly high up

    for (let y = gripStart; y < gripEnd; y += 8) {
        // X pattern
        ctx.beginPath();
        ctx.moveTo(y, -handleW / 2);
        ctx.lineTo(y + 6, handleW / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(y + 6, -handleW / 2);
        ctx.lineTo(y, handleW / 2);
        ctx.stroke();
    }

    // Handle Rings (Collars) - Distinct black segments
    ctx.fillStyle = '#000';
    // Top collar
    ctx.fillRect(headPos + 20, -handleW / 2 - 2, 6, handleW + 4);
    // Middle collar
    ctx.fillRect(-totalLen * 0.4, -handleW / 2 - 1, 6, handleW + 2);
    // Bottom Pommel
    ctx.beginPath();
    ctx.roundRect(-totalLen - 5, -handleW / 2 - 3, 10, handleW + 6, 2);
    ctx.fill();

    // 2. HEAD - Double Sided
    ctx.translate(headPos, 0);

    // -- Central Spike (Lance tip) --
    ctx.fillStyle = '#e8f8f8'; // Off-white
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(0, -45); // Sharp tall spike
    ctx.lineTo(4, -8);
    ctx.fill();

    // Teal Outline for spike
    ctx.strokeStyle = '#00a8a8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spine (Center line of spike)
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(0, -45);
    ctx.lineWidth = 1;
    ctx.stroke();

    // -- BLADES --
    drawReferenceBlade(ctx, -1); // Left
    drawReferenceBlade(ctx, 1);  // Right

    // -- Central Hub (Connection) --
    // Black cylinder
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, -12, 10, 24);
    // White highlights
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -6, 10, 2);
    ctx.strokeRect(-5, 4, 10, 2);

    ctx.translate(-headPos, 0);
}

function drawReferenceBlade(ctx: CanvasRenderingContext2D, side: number) {
    ctx.save();
    ctx.scale(side, 1); // Flip for Left side

    // COLORS
    const bodyColor = '#f0ffff'; // White/Azure
    const outlineColor = '#00a8a8'; // Teal/Turquoise

    // 1. Blade Shape
    ctx.beginPath();
    // Start at hub
    ctx.moveTo(5, -8);
    // Top Edge (Curved Up)
    ctx.quadraticCurveTo(20, -25, 35, -40); // Top Tip
    // Outer Edge (The Cutting Edge)
    // A clean curve, we'll add notches visually later or via path
    ctx.bezierCurveTo(45, -25, 45, 25, 35, 40); // Bottom Tip
    // Bottom Edge (Curved Down)
    ctx.quadraticCurveTo(20, 25, 5, 8);
    ctx.closePath();

    // Fill & Stroke
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Inner Lattice Region (The "Frame")
    // Similar shape but smaller/inset
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.quadraticCurveTo(20, -18, 28, -28);
    ctx.lineTo(28, 28);
    ctx.quadraticCurveTo(20, 18, 10, 6);
    ctx.closePath();

    // Fill background of lattice (can be transparent or same white)
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Clip for Lattice Lines
    ctx.save();
    ctx.clip();

    // Draw Cross-Hatch Lattice
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    const size = 50;
    for (let i = -size; i < size; i += 5) {
        // Diagonal /
        ctx.beginPath(); ctx.moveTo(i, -size); ctx.lineTo(i + size, size); ctx.stroke();
        // Diagonal \
        ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, -size); ctx.stroke();
    }
    ctx.restore(); // End clip

    // Border for Lattice
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Notches/Chipped Edge Details
    // We draw small white triangles over the outline to "break" it, 
    // then draw the notch outline inside.

    // Top Notch
    ctx.fillStyle = bodyColor; // Cover the main outline
    ctx.beginPath();
    ctx.moveTo(40, -25); ctx.lineTo(36, -22); ctx.lineTo(41, -19);
    ctx.fill();

    // Re-stroke the notch
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, -25); ctx.lineTo(36, -22); ctx.lineTo(41, -19);
    ctx.stroke();

    // Bottom Notch
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(40, 25); ctx.lineTo(36, 22); ctx.lineTo(41, 19);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(40, 25); ctx.lineTo(36, 22); ctx.lineTo(41, 19);
    ctx.stroke();

    ctx.restore();
}
