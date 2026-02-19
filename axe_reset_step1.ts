/** Battle Axe - RESTART STEP 1: PURE SILHOUETTE */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === CONFIG ===
    const totalLen = length * 1.2; // A bit longer handle for leverage
    const headPos = -totalLen * 0.85;
    const handleW = 5; // Strong handle

    // COLOR: PURE BLACK
    ctx.fillStyle = '#000000';

    // 1. HANDLE 
    ctx.beginPath();
    // Straight shaft, no tapering yet, just a solid stick
    ctx.rect(-totalLen, -handleW / 2, totalLen + 10, handleW);
    ctx.fill();

    // 2. HEAD CONSTRUCTION
    ctx.save();
    ctx.translate(headPos, 0);

    ctx.beginPath();

    // Start at Top Center (Socket Top)
    ctx.moveTo(0, -15);

    // -- REAR SPIKE / HAMMER --
    // Simple rectangular-ish block for counterweight
    ctx.lineTo(-10, -15);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-12, 5);
    ctx.lineTo(-10, 15);
    ctx.lineTo(0, 15);

    // -- FRONT BLADE --
    // Classic Bearded Axe Shape

    // 1. Top Neck (going forward)
    ctx.lineTo(10, 10);

    // 2. Beard (The deep hook under the blade)
    ctx.quadraticCurveTo(15, 20, 10, 40); // Hook down and back

    // 3. Bottom Horn (The sharp bottom tip)
    ctx.lineTo(30, 50);

    // 4. Cutting Edge (The front curve)
    // Curve up to top tip
    ctx.quadraticCurveTo(45, 0, 40, -40); // Top Horn Tip

    // 5. Top Edge (Returning to socket)
    ctx.lineTo(10, -10);

    // Close back to socket
    ctx.lineTo(0, -15);

    ctx.fill();
    ctx.restore();
}
