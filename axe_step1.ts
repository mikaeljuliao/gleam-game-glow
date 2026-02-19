/** Battle Axe - STEP 1: SILHOUETTE ONLY */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === CONFIG ===
    const totalLen = length * 1.1; // Total length of weapon
    const headPos = -totalLen * 0.85; // Where the head sits on the shaft

    // === COLOR ===
    // STRICTLY BLACK SILHOUETTE as requested
    ctx.fillStyle = '#000000';

    // 1. HANDLE 
    // Straight solid block
    ctx.beginPath();
    // Main shaft from hand (0) to tip (-totalLen)
    ctx.rect(-totalLen, -4, totalLen + 10, 8);
    ctx.fill();

    // 2. HEAD (The important part)
    ctx.save();
    ctx.translate(headPos, 0);

    ctx.beginPath();

    // -- SOCKET (Center) --
    // Solid block around handle
    ctx.rect(-10, -12, 20, 24);

    // -- REAR COUNTERWEIGHT (Spike) --
    // Smaller, sharp, pointing 'Up' (negative Y)
    ctx.moveTo(-6, -12);
    ctx.lineTo(-2, -30); // Spike tip
    ctx.lineTo(6, -12);

    // -- FRONT BLADE (Main Cutting Part) --
    // Large, curved, pointing 'Down' (positive Y)

    // 1. Neck Out
    ctx.lineTo(8, 12);

    // 2. Top Edge (Curves Out)
    ctx.quadraticCurveTo(25, 20, 40, 35); // Top Horn Tip

    // 3. The Cutting Edge (The most defining curve)
    // Deep C-shape curve
    ctx.bezierCurveTo(20, 55, -20, 55, -30, 35); // Bottom Horn Tip

    // 4. Bottom Beard (Curves In)
    ctx.quadraticCurveTo(-15, 20, -8, 12);

    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
