/** Battle Axe - SILHOUETTE V2: DOUBLE BLADED (Reference Shape) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === CONFIG ===
    const totalLen = length * 1.1;
    const headPos = -totalLen * 0.8;
    const handleW = 4;

    // COLOR: PURE BLACK SILHOUETTE
    ctx.fillStyle = '#000000';

    // 1. HANDLE 
    ctx.beginPath();
    // Main Shaft
    ctx.rect(-totalLen, -handleW / 2, totalLen + 15, handleW);
    ctx.fill();

    // 2. HEAD (Double Crescent)
    ctx.save();
    ctx.translate(headPos, 0);

    ctx.beginPath();

    // -- CENTRAL SPIKE --
    ctx.moveTo(-4, -10);
    ctx.lineTo(0, -45); // Tall sharp spike
    ctx.lineTo(4, -10);

    // -- LEFT BLADE (Crescent) --
    // Top Curve Out
    ctx.quadraticCurveTo(20, -25, 35, -35); // Top Tip
    // Outer Edge (Curved In)
    ctx.bezierCurveTo(50, -15, 50, 15, 35, 35); // Bottom Tip
    // Bottom Curve In
    ctx.quadraticCurveTo(20, 25, 5, 10);

    // -- RIGHT BLADE (Reflected) --
    // Bottom Curve Out
    ctx.quadraticCurveTo(20, 25, 35, 35); // Bottom Tip
    // Outer Edge (Curved In) - Note: drawing right side logic manually or using symmetry?
    // Let's do manual drawing to keep path continuous or just use symmetry transform.
    // Actually, let's just draw the right side by mirroring coordinates.

    // To keep it simple in one path:
    // We just finished Left Side Bottom Connection (5, 10).
    // Now Right Side Bottom Connection is (5, 10)? No, symmetry is across Y axis? 
    // Wait, axe head is usually symmetric Left/Right relative to the handle if looking form front?
    // In side view (game view), "Left/Right" usually means "Back/Front".
    // Double bladed means front and back.

    // So:
    // Go to Back (Right in code space if Handle is left? No, Handle is -X)
    // Let's assume Handle is along negative X axis. Head is at headPos.
    // "Up" is -Y, "Down" is +Y.
    // "Front" is +X? "Back" is -X?
    // Actually, usually an axe has a blade 'down' and 'up' in terms of swing?
    // No, an axe blade faces the target. Standard orientation: Handle horizontal.
    // Blade points UP/DOWN? Or Left/Right?
    // The user reference was vertical.
    // In game, 'length' is along the weapon axis.

    // Let's draw ONE combined shape.
    // Center is (0,0) relative to headPos.
    // Top Spike: (0, -45).

    // Left Blade (Front?): 
    // Starts (0, -10). Curves to (-30, -30). Edge to (-30, 30). Returns to (0, 10).
    // Right Blade (Back?):
    // Starts (0, 10). Curves to (30, 30). Edge to (30, -30). Returns to (0, -10).

    // Let's retry path construction for clarity.
    // Center Hub: (-5, -10) to (5, 10).

    // Left Wing (Top-Left):
    ctx.moveTo(-5, -10);
    ctx.quadraticCurveTo(-20, -20, -40, -35); // Top Tip Left
    ctx.bezierCurveTo(-55, -15, -55, 15, -40, 35); // Bottom Tip Left
    ctx.quadraticCurveTo(-20, 20, -5, 10);

    // Right Wing (Top-Right):
    ctx.moveTo(5, -10);
    ctx.quadraticCurveTo(20, -20, 40, -35); // Top Tip Right
    ctx.bezierCurveTo(55, -15, 55, 15, 40, 35); // Bottom Tip Right
    ctx.quadraticCurveTo(20, 20, 5, 10);

    ctx.fill();
    ctx.restore();
}
