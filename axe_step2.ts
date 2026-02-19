/** Battle Axe - STEP 2: COLOR BLOCKS (No Texture) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === CONFIG ===
    const totalLen = length * 1.1;
    const headPos = -totalLen * 0.85;
    const handleW = 4;

    // 1. HANDLE 
    // Base Color: Dark Red-Brown (Mahogany)
    ctx.fillStyle = '#3e1608';

    ctx.beginPath();
    // Draw full length handle
    ctx.rect(-totalLen, -handleW / 2, totalLen + 10, handleW);
    ctx.fill();

    // 2. HEAD 
    ctx.save();
    ctx.translate(headPos, 0);

    // -- BASE METAL (Dark Grey/Blue) --
    ctx.fillStyle = '#2c3e50';

    // Combined Socket + Head Shape
    ctx.beginPath();

    // Socket/Hub
    ctx.rect(-8, -10, 16, 20);

    // Rear Spike
    ctx.moveTo(-6, -8);
    ctx.lineTo(0, -25); // Point Up
    ctx.lineTo(6, -8);

    // Front Blade Body
    // Neck Out
    ctx.lineTo(10, 8);
    // Top Curve
    ctx.quadraticCurveTo(25, 15, 35, 30); // Top Horn
    // Cutting Edge (Will be lighter later)
    ctx.lineTo(35, 30);
    // Bottom Curve (Beard)
    ctx.quadraticCurveTo(20, 50, -10, 25);
    // Beard Return
    ctx.quadraticCurveTo(-15, 15, -8, 8);

    ctx.fill();

    // -- CUTTING EDGE (Step 2: Lighter Color Block) --
    // Lighter Grey/Silver
    ctx.fillStyle = '#95a5a6';

    ctx.beginPath();
    // Follow the outer edge roughly
    ctx.moveTo(35, 30); // Top Horn Tip
    // The Sharp Curve
    ctx.bezierCurveTo(20, 50, -20, 50, -30, 25); // Bottom Horn Tip
    // Inner Bevel Line ( Straight-ish)
    ctx.lineTo(-10, 25);
    ctx.lineTo(25, 30);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
