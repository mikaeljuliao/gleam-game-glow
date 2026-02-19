/** Battle Axe - Corrected Scale & Orientation (Teal/White Reference) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS (Significantly Reduced) ===
    const totalLen = length * 1.0; // Standard length, not oversized
    const headW = totalLen * 0.35; // Head width (distance from center to edge)
    const headH = totalLen * 0.4;  // Head height (top to bottom point)
    const headPos = -totalLen * 0.85; // Position of the head along the handle

    // 1. HANDLE 
    const handleW = 4;

    // Main Shaft (Dark/Black)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(0, -handleW / 2);
    ctx.lineTo(0, handleW / 2);
    ctx.lineTo(-totalLen, handleW / 2); // Draw backwards from hand
    ctx.lineTo(-totalLen, -handleW / 2);
    ctx.fill();

    // Grip Texture (Cross-hatch pattern on handle)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    // Only texture the bottom 60%
    const gripLen = totalLen * 0.6;
    for (let i = 0; i < gripLen; i += 5) {
        const x = -totalLen + i;
        ctx.beginPath();
        // X marks
        ctx.moveTo(x, -handleW / 2); ctx.lineTo(x + 3, handleW / 2); ctx.stroke();
        ctx.moveTo(x + 3, -handleW / 2); ctx.lineTo(x, handleW / 2); ctx.stroke();
    }

    // Handle Collars (Rings)
    ctx.fillStyle = '#222';
    // Bottom Pommel
    ctx.fillRect(-totalLen, -handleW, 6, handleW * 2);
    // Neck Collar (under head)
    ctx.fillRect(headPos + 10, -handleW, 6, handleW * 2);

    // 2. HEAD - Orientation Fix
    // The head needs to be perpendicular to the handle.
    ctx.translate(headPos, 0);

    // -- Central Spike (Lance tip) --
    // Points "Forward" relative to the thrust, or "Up" relative to the axe? 
    // Ref image has a spike in the middle top.
    ctx.fillStyle = '#e8f8f8'; // Off-white
    ctx.beginPath();
    ctx.moveTo(-3, -10); // Base width
    ctx.lineTo(0, -50);  // Tall spike tip (pointing "Up" / perpendicular to handle)
    ctx.lineTo(3, -10);
    ctx.fill();

    // Teal Outline for spike
    ctx.strokeStyle = '#00a8a8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // -- BLADES --
    // Draw Left and Right blades
    drawReferenceBladev2(ctx, -1, headW, headH); // Left
    drawReferenceBladev2(ctx, 1, headW, headH);  // Right

    // -- Central Hub (Connection) --
    // The black cylinder connecting everything
    ctx.fillStyle = '#111';
    ctx.fillRect(-4, -15, 8, 30);

    // White highlights on hub
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.lineTo(4, -8);
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
    ctx.moveTo(-4, 8); ctx.lineTo(4, 8);
    ctx.stroke();

    ctx.translate(-headPos, 0);
}

function drawReferenceBladev2(ctx: CanvasRenderingContext2D, side: number, width: number, height: number) {
    ctx.save();
    ctx.scale(side, 1); // Flip for Left side

    // COLORS
    const bodyColor = '#f0ffff'; // White/Azure
    const outlineColor = '#00a8a8'; // Teal/Turquoise

    // Scale down geometry based on width/height params
    const w = width * 0.8; // slightly smaller than full width container
    const hHalf = height * 0.5;

    // 1. Blade Shape
    ctx.beginPath();
    ctx.moveTo(5, -10); // Start at hub top

    // Top Curve
    ctx.quadraticCurveTo(w * 0.5, -hHalf * 0.8, w, -hHalf); // Top Tip

    // Outer Edge (Cutting Edge) - Convex
    ctx.bezierCurveTo(w * 1.2, -hHalf * 0.3, w * 1.2, hHalf * 0.3, w, hHalf); // Bottom Tip

    // Bottom Curve
    ctx.quadraticCurveTo(w * 0.5, hHalf * 0.8, 5, 10); // Back to hub bottom
    ctx.closePath();

    // Fill & Stroke
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Inner Lattice Region (Inset)
    ctx.beginPath();
    // Inner path roughly parallel to outer
    ctx.moveTo(10, -6);
    ctx.quadraticCurveTo(w * 0.5, -hHalf * 0.6, w * 0.7, -hHalf * 0.7);
    ctx.lineTo(w * 0.7, hHalf * 0.7);
    ctx.quadraticCurveTo(w * 0.5, hHalf * 0.6, 10, 6);
    ctx.closePath();

    // Fill background
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Simple Lattice Lines
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;

    // Draw grid
    const startX = 10;
    const endX = w * 0.7;
    const startY = -hHalf;
    const endY = hHalf;

    // Diagonals
    for (let i = 0; i < 8; i++) {
        const x = startX + (i * (endX - startX) / 6);
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x + 10, endY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 10, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    ctx.restore();

    // Lattice Border
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Notches (Visual triangles)
    // Painted ON TOP of the outline to look like cuts
    ctx.fillStyle = bodyColor;

    // Top Notch
    ctx.beginPath();
    ctx.moveTo(w, -hHalf * 0.5);
    ctx.lineTo(w - 5, -hHalf * 0.45);
    ctx.lineTo(w - 1, -hHalf * 0.4);
    ctx.fill();
    ctx.stroke(); // Outline the notch

    // Bottom Notch
    ctx.beginPath();
    ctx.moveTo(w, hHalf * 0.5);
    ctx.lineTo(w - 5, hHalf * 0.45);
    ctx.lineTo(w - 1, hHalf * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}
