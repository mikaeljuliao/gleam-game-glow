/** Battle Axe - Structural Reform (Silhouette First) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS (Strict 40/60 rule) ===
    const totalLen = length * 1.2;
    const headSize = totalLen * 0.4;
    const handleLen = totalLen * 0.6;
    const headY = -handleLen * 0.8; // Position head near top

    // 1. HANDLE (Straight, Firm Wood)
    // Simple structure first
    const woodGrad = ctx.createLinearGradient(-handleLen, 0, 0, 0);
    woodGrad.addColorStop(0, '#15100a'); // Dark wood
    woodGrad.addColorStop(0.5, '#3e2b1f');
    woodGrad.addColorStop(1, '#15100a');
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    // Main Shaft (Straight cylinder with slight pommel taper)
    ctx.moveTo(-handleLen, -3);
    ctx.lineTo(10, -3); // To top
    ctx.lineTo(10, 3);
    ctx.lineTo(-handleLen, 3);
    ctx.fill();

    // Grip Banding (Visual separation)
    ctx.fillStyle = '#0f0a08';
    ctx.fillRect(-handleLen + 5, -3.5, handleLen * 0.4, 7);

    // Pommel Cap (Steel)
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(-handleLen, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. AXE HEAD (The "Option A" - Large Front Blade, Rear Counterweight)
    ctx.translate(headY, 0);

    // -- CENTRAL SOCKET IMPLANT --
    // A solid block that clamps the blade to the wood
    const socketGrad = ctx.createLinearGradient(-6, -8, 6, 8);
    socketGrad.addColorStop(0, '#222');
    socketGrad.addColorStop(1, '#111');
    ctx.fillStyle = socketGrad;

    ctx.beginPath();
    ctx.roundRect(-8, -8, 16, 16, 2);
    ctx.fill();

    // Bolts/Rivets
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(0, -4, 2, 0, Math.PI * 2);
    ctx.arc(0, 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // -- MAIN BLADE (Frontal) --
    // Explicit "Blade" shape: Neck -> Flare -> Edge
    // This shape must read as "SHARP METAL" in silhouette

    const metalGrad = ctx.createLinearGradient(0, 0, 40, 0);
    metalGrad.addColorStop(0, '#2a2a2e'); // Thick neck
    metalGrad.addColorStop(0.4, '#4a4a55'); // Mid steel
    metalGrad.addColorStop(0.85, '#8a9aa5'); // Bevel start
    metalGrad.addColorStop(1, '#ccddee');    // Razor edge
    ctx.fillStyle = metalGrad;

    ctx.beginPath();
    // Start at socket front
    ctx.moveTo(8, -6);

    // Top Neck (Concave curve OUT)
    ctx.quadraticCurveTo(15, -10, 20, -25);

    // Top Point (Sharp corner)
    ctx.lineTo(35, -35);

    // CUTTING EDGE (Large Convex Curve)
    // This defines the "Axe" look. Deep curve.
    ctx.bezierCurveTo(45, -15, 45, 15, 35, 35);

    // Bottom Point
    ctx.lineTo(20, 25);

    // Bottom Neck (Concave curve IN)
    ctx.quadraticCurveTo(15, 10, 8, 6);

    ctx.closePath();
    ctx.fill();

    // -- BLADE DEFINITION LINES --
    // Separation of bevel (sharpened part)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, -35);
    ctx.quadraticCurveTo(38, 0, 35, 35); // Follows edge curve inward
    ctx.stroke();

    // Separation from socket
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(8, 6);
    ctx.stroke();

    // -- REAR COUNTERWEIGHT (Spike) --
    // Balances the silhouette
    const rearGrad = ctx.createLinearGradient(-8, 0, -20, 0);
    rearGrad.addColorStop(0, '#222');
    rearGrad.addColorStop(1, '#333');
    ctx.fillStyle = rearGrad;

    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-20, 0); // Sharp point
    ctx.lineTo(-8, 4);
    ctx.lineTo(-8, -4);
    ctx.fill();

    // Restore
    ctx.translate(-headY, 0);
}
