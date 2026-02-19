/** Battle Axe - Exact Replica of Reference (Double-Bladed Royal Axe) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS ===
    const totalLen = length * 1.3;
    const headY = -totalLen * 0.7; // Head position near top
    const handleW = 6;

    // 1. HANDLE (Dark Wood with Angular Banding)
    // Base color: Dark reddish brown
    const handleGrad = ctx.createLinearGradient(-totalLen, 0, 10, 0);
    handleGrad.addColorStop(0, '#3e1608');
    handleGrad.addColorStop(0.5, '#5c2410');
    handleGrad.addColorStop(1, '#3e1608');
    ctx.fillStyle = handleGrad;

    ctx.beginPath();
    ctx.moveTo(-totalLen, -handleW / 2);
    ctx.lineTo(10, -handleW / 2);
    ctx.lineTo(10, handleW / 2);
    ctx.lineTo(-totalLen, handleW / 2);
    ctx.fill();

    // Handle Bandings (Lighter diagonal stripes)
    ctx.fillStyle = 'rgba(120, 70, 40, 0.6)';
    for (let i = 0; i < 6; i++) {
        const y = -totalLen + (i * (totalLen / 8));
        ctx.beginPath();
        ctx.moveTo(y, -handleW / 2);
        ctx.lineTo(y + 8, -handleW / 2);
        ctx.lineTo(y + 4, handleW / 2); // Slanted
        ctx.lineTo(y - 4, handleW / 2);
        ctx.fill();
    }

    // Pommel (Blue Gem + Gold Setting)
    // Gold Setting
    ctx.fillStyle = '#dcb015'; // Gold
    ctx.fillRect(-totalLen, -5, 8, 10);
    ctx.fillRect(-totalLen - 8, -3, 8, 6); // Tip holder

    // Blue Crystal Tip
    ctx.beginPath();
    ctx.moveTo(-totalLen - 8, -3);
    ctx.lineTo(-totalLen - 18, 0); // Point
    ctx.lineTo(-totalLen - 8, 3);
    ctx.fillStyle = '#1ebcde'; // Cyan Blue
    ctx.fill();
    // Crystal shine
    ctx.fillStyle = '#8eeeff';
    ctx.beginPath();
    ctx.moveTo(-totalLen - 10, -1);
    ctx.lineTo(-totalLen - 14, 0);
    ctx.lineTo(-totalLen - 10, 1);
    ctx.fill();


    // 2. AXE HEAD (Double Bladed Royal Design)
    ctx.translate(headY, 0);

    // -- Central Shaft Collar (Gold) --
    const collarGrad = ctx.createLinearGradient(-10, -10, 10, 10);
    collarGrad.addColorStop(0, '#b8860b');
    collarGrad.addColorStop(0.5, '#ffd700');
    collarGrad.addColorStop(1, '#b8860b');
    ctx.fillStyle = collarGrad;

    // Two thick gold rings
    ctx.fillRect(-8, -8, 16, 16); // Base block

    // -- MAIN BODY (Purple/Blue Royal Metal) --
    // The central anchor structure
    const bodyGrad = ctx.createLinearGradient(0, -20, 0, 20);
    bodyGrad.addColorStop(0, '#2e265c'); // Dark Purple/Blue
    bodyGrad.addColorStop(0.5, '#483d8b'); // Lighter Center
    bodyGrad.addColorStop(1, '#2e265c');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    // Hourglass anchor shape
    ctx.moveTo(-10, -10);
    ctx.quadraticCurveTo(0, -5, 10, -10); // Top indent
    ctx.lineTo(15, -25); // Top flare
    ctx.quadraticCurveTo(0, -20, -15, -25);
    ctx.lineTo(-10, -10);
    ctx.fill();

    // Bottom part
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.quadraticCurveTo(0, 5, 10, 10);
    ctx.lineTo(15, 25);
    ctx.quadraticCurveTo(0, 20, -15, 25);
    ctx.lineTo(-10, 10);
    ctx.fill();

    // -- LEFT BLADE (Crescent Moon) --
    drawBlade(ctx, -1, time);

    // -- RIGHT BLADE (Crescent Moon) --
    drawBlade(ctx, 1, time);

    // -- CENTRAL SPIKE (Gold) --
    // Top vertical spike
    const spikeGrad = ctx.createLinearGradient(0, -25, 0, -45);
    spikeGrad.addColorStop(0, '#ffd700');
    spikeGrad.addColorStop(1, '#fffacd'); // Tips to white
    ctx.fillStyle = spikeGrad;

    ctx.beginPath();
    ctx.moveTo(-6, -25);
    ctx.lineTo(0, -45); // Sharp Point
    ctx.lineTo(6, -25);
    ctx.lineTo(0, -20);
    ctx.fill();
    // Gold Outline
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // -- CENTRAL GEM (Round Blue Orb) --
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#b8860b'; // Gold Rim
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    const gemGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 5);
    gemGrad.addColorStop(0, '#aaffff');
    gemGrad.addColorStop(1, '#0088aa');
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Restore
    ctx.translate(-headY, 0);
}

// Helper for symmetrical blades
function drawBlade(ctx: CanvasRenderingContext2D, side: number, time: number) {
    // 'side' is 1 (Right) or -1 (Left)

    // BLADE COLORS
    // Main Body: Light Cyan/Blue
    const bladeColor = '#4db6e6';
    const edgeColor = '#a8e6ff'; // Lighter edge
    const shadowColor = '#1a5c7a'; // Inner shadow

    ctx.save();
    ctx.scale(side, 1); // Flip for Left side

    // 1. Blade Silhouette
    ctx.beginPath();
    // Start near center
    ctx.moveTo(10, -15);
    // Top edge curve OUT
    ctx.bezierCurveTo(25, -25, 40, -35, 55, -45); // Top Tip
    // OUTER EDGE (Cutting Edge) - Convex
    ctx.bezierCurveTo(70, -20, 70, 20, 55, 45);   // Bottom Tip
    // Bottom edge curve IN
    ctx.bezierCurveTo(40, 35, 25, 25, 10, 15);
    // Inner Curve (Concave) - connects back to body
    ctx.bezierCurveTo(25, 0, 25, 0, 10, -15);

    // Fill Main Blue
    ctx.fillStyle = bladeColor;
    ctx.fill();

    // 2. Sharp Edge Zone (Lighter)
    ctx.beginPath();
    ctx.moveTo(55, -45);
    ctx.bezierCurveTo(70, -20, 70, 20, 55, 45); // Outer
    ctx.quadraticCurveTo(55, 0, 55, -45); // Inner bevel line
    ctx.fillStyle = edgeColor;
    ctx.fill();

    // 3. Dark Inner Detail (Inset)
    ctx.beginPath();
    ctx.moveTo(15, -12);
    ctx.quadraticCurveTo(30, -20, 48, -38);
    ctx.lineTo(45, -30); // Jagged cut
    ctx.quadraticCurveTo(35, -10, 35, 10);
    ctx.lineTo(45, 30);
    ctx.lineTo(48, 38);
    ctx.quadraticCurveTo(30, 20, 15, 12);
    ctx.quadraticCurveTo(20, 0, 15, -12);

    ctx.fillStyle = '#222d5a'; // Deep purple/blue dark
    ctx.fill();

    // 4. Gold Decoration (Curved shape)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.quadraticCurveTo(25, -8, 35, -5);
    ctx.lineTo(25, 0); // Point inward
    ctx.lineTo(35, 5);
    ctx.quadraticCurveTo(25, 8, 18, 2);
    ctx.fill();

    ctx.restore();
}
