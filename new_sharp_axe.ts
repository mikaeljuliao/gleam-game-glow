/** Battle Axe - Redesigned Sharp & Aggressive */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS ===
    const handleLen = length * 1.0; // Slightly longer handle for leverage
    const headPos = -handleLen * 0.2; // Head sits 20% down from top

    // 1. HANDLE (Reinforced Dark Steel & Ebony)
    const hGrad = ctx.createLinearGradient(-handleLen, 0, 0, 0);
    hGrad.addColorStop(0, '#0a0a0a');
    hGrad.addColorStop(0.4, '#201815'); // Dark wood hint
    hGrad.addColorStop(0.6, '#151010');
    hGrad.addColorStop(1, '#050505');
    ctx.fillStyle = hGrad;

    ctx.beginPath();
    // Pommel base
    ctx.moveTo(-handleLen, -2.5);
    // Shaft with slight swelling
    ctx.bezierCurveTo(-handleLen * 0.5, -3, headPos, -2.5, 5, -2);
    ctx.lineTo(5, 2);
    ctx.bezierCurveTo(headPos, 2.5, -handleLen * 0.5, 3, -handleLen, 2.5);
    ctx.fill();

    // Handle Detail (Steel rings / reinforcement)
    ctx.fillStyle = '#333344';
    for (let i = 1; i <= 4; i++) {
        const rx = -handleLen * (0.2 * i);
        ctx.fillRect(rx - 2, -3, 4, 6);
    }

    // Pommel Spike
    ctx.beginPath();
    ctx.moveTo(-handleLen, -4);
    ctx.lineTo(-handleLen - 6, 0);
    ctx.lineTo(-handleLen, 4);
    ctx.fill();

    // 2. AXE HEAD (The "Reference" Style - Sharp Double-Bearded Crescent)
    ctx.translate(headPos, 0);

    // -- BLADE SHAPE --
    // We want a sharp, aggressive crescent shape.
    // It shouldn't look like a solid block, but a curved blade.

    const bladeTopY = -28;
    const bladeBottomY = 32; // Long beard
    const bladeInnerX = 8;   // Where it connects to shaft
    const bladeEdgeX = 35;   // How far out the edge goes

    // Metallic Gradient
    const bladeGrad = ctx.createLinearGradient(0, -20, 30, 20);
    bladeGrad.addColorStop(0, '#1a1a20');
    bladeGrad.addColorStop(0.3, '#303040');
    bladeGrad.addColorStop(0.5, '#505060'); // Steel mid
    bladeGrad.addColorStop(0.8, '#2a2a30');
    bladeGrad.addColorStop(1, '#101015');
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    // 1. Top Socket Connection
    ctx.moveTo(0, -8);

    // 2. Top Spike / Horn -> Sharp curve UP and OUT
    ctx.bezierCurveTo(2, -15, 6, -25, 12, bladeTopY);

    // 3. CUTTING EDGE (The convex sharp part)
    // Large curve from Top Tip to Bottom Tip
    // Control points pull it OUT to make it sharp and wide
    ctx.bezierCurveTo(bladeEdgeX, -15, bladeEdgeX, 15, 12, bladeBottomY);

    // 4. Bottom Beard Return -> Sharp curve back IN and UP
    // This creates the "Beard" (hook)
    ctx.bezierCurveTo(8, 20, 5, 10, 0, 8);

    // 5. Back connection to shaft
    ctx.lineTo(0, -8);

    ctx.closePath();
    ctx.fill();

    // -- SHARP EDGE GLOW (The actual blade edge) --
    // We re-stroke the cutting edge with a lighter color
    const pulse = Math.sin(time * 5) * 0.2 + 0.8;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(12, bladeTopY);
    ctx.bezierCurveTo(bladeEdgeX, -15, bladeEdgeX, 15, 12, bladeBottomY);

    // Line 1: Steel Edge
    ctx.strokeStyle = '#aaccff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Line 2: Energy Glow
    ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = `rgba(100, 220, 255, ${0.6 * pulse})`;
    ctx.lineWidth = 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.stroke();
    ctx.restore();

    // -- SURFACE DETAILS (Runes/Etchings) --
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    // Inner concave line to separate blade from socket
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.quadraticCurveTo(12, 0, 6, 12);
    ctx.stroke();

    // Glowing Rune
    ctx.fillStyle = `rgba(0, 255, 255, ${0.5 * pulse})`;
    ctx.beginPath();
    ctx.arc(10, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(10, -5); ctx.lineTo(10, 5);
    ctx.moveTo(8, 0); ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // -- BACK SPIKE (Optional) --
    // Small counter-weight spike on the back
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-10, -1);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-10, 1);
    ctx.lineTo(-4, 4);
    ctx.fill();

    // Shine Effect on Swing
    if (isAttacking) {
        ctx.save();
        ctx.rotate(Math.PI / 8); // Tilt shine
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.rect(10, -20, 20, 40); // Broad sweep
        ctx.clip(); // Just a test clip

        // Draw slash shine
        const grad = ctx.createLinearGradient(12, -20, 25, 20);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, -30, 15, 60);
        ctx.restore();
    }

    ctx.translate(-headPos, 0);
}
