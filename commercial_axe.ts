/** Battle Axe - AAA Commercial Quality (Dark Fantasy) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    const totalLen = length * 1.25; // Good reach
    const handleLen = totalLen * 0.7; // 70% handle
    const headY = -handleLen * 0.85; // Near top

    // === 1. THE HAFT (Handle) ===
    // Material: Ancient Dark Oak wrapped in Leather
    const w = 4; // Half-width

    // Core Shaft Shadow/Base
    ctx.fillStyle = '#0a0502';
    ctx.fillRect(-handleLen, -w + 1, handleLen + 10, w * 2 - 2);

    // Main Gradient (Cylindrical look)
    const woodGrad = ctx.createLinearGradient(0, -w, 0, w);
    woodGrad.addColorStop(0, '#1a0d08');
    woodGrad.addColorStop(0.4, '#3e2515'); // Highlight center
    woodGrad.addColorStop(1, '#0f0604');
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    ctx.moveTo(-handleLen, -w);
    ctx.lineTo(15, -w); // Top
    ctx.lineTo(15, w);
    ctx.lineTo(-handleLen, w);
    ctx.fill();

    // -- Leather Grip (Bottom Half) --
    // Diagonal wrapping texture
    const gripLen = handleLen * 0.5;
    const gripStart = -handleLen;

    ctx.save();
    ctx.beginPath();
    ctx.rect(gripStart, -3.5, gripLen, 7);
    ctx.clip(); // Clip to handle shape

    // Leather Base
    ctx.fillStyle = '#151515';
    ctx.fill();

    // Checkered / Diamond texture for grip
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        const x = gripStart + i * 6;
        ctx.beginPath();
        ctx.moveTo(x, -4); ctx.lineTo(x + 6, 4);
        ctx.moveTo(x + 4, -4); ctx.lineTo(x - 2, 4);
        ctx.stroke();
    }
    ctx.restore();

    // -- Pommel (Skull Crusher) --
    const pGrad = ctx.createRadialGradient(-handleLen, 0, 0, -handleLen, 0, 6);
    pGrad.addColorStop(0, '#555');
    pGrad.addColorStop(1, '#111');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.moveTo(-handleLen, -4);
    ctx.lineTo(-handleLen - 6, -2);
    ctx.lineTo(-handleLen - 8, 0); // Point
    ctx.lineTo(-handleLen - 6, 2);
    ctx.lineTo(-handleLen, 4);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();

    // === 2. THE HEAD (Complex Multi-Part Mesh) ===
    ctx.translate(headY, 0);

    // -- SOCKET (The connection hub) --
    // Detailed mechanical look with bevels
    const socketGrad = ctx.createLinearGradient(-8, -10, 8, 10);
    socketGrad.addColorStop(0, '#222');
    socketGrad.addColorStop(0.5, '#444'); // Metallic shine
    socketGrad.addColorStop(1, '#111');
    ctx.fillStyle = socketGrad;

    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.lineTo(8, 0);
    ctx.lineTo(6, 8);
    ctx.lineTo(-6, 8);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    // Socket details (Bolts)
    ctx.fillStyle = '#1a1a1a'; // Dark holes
    ctx.beginPath(); ctx.arc(0, -4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 4, 1.5, 0, Math.PI * 2); ctx.fill();

    // Gold Trim on Socket (Elegance)
    ctx.strokeStyle = '#aa8833';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -6, 8, 12);

    // -- BLADE (The Business End) --
    // Shape: Heavy Executioner Curve
    const bladeW = 40; // Forward reach
    const bladeH = 45; // Vertical span

    const metalGrad = ctx.createLinearGradient(0, 0, 30, 10);
    metalGrad.addColorStop(0, '#1a1e22'); // Dark Steel Body
    metalGrad.addColorStop(0.6, '#3a4e5c'); // Blue-ish tint
    metalGrad.addColorStop(0.9, '#8a9bb0'); // Lighter near edge
    metalGrad.addColorStop(1, '#dceeff');    // Razor Edge
    ctx.fillStyle = metalGrad;

    ctx.beginPath();
    // Neck
    ctx.moveTo(6, -6);
    // Top Curve (Aggressive Hook)
    ctx.bezierCurveTo(15, -15, 20, -30, 35, -35); // Top Tip
    // Edge (Large C-Curve)
    ctx.bezierCurveTo(45, -20, 45, 20, 35, 35);   // Bottom Tip
    // Bottom Return (Beard)
    ctx.bezierCurveTo(20, 30, 15, 10, 6, 6);      // Back to socket
    ctx.closePath();
    ctx.fill();

    // -- EDGE HIGHLIGHT (The Monomolecular Wire look) --
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(200, 240, 255, 0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    // Trace just the edge
    ctx.moveTo(35, -35);
    ctx.bezierCurveTo(45, -20, 45, 20, 35, 35);
    ctx.stroke();

    // Remove glow for inner details
    ctx.shadowBlur = 0;

    // -- INNER BLADE SHADING (The Bevel) --
    // Where the metal grinds down to the edge
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(35, -35);
    ctx.quadraticCurveTo(38, 0, 35, 35); // Edge Inner
    ctx.quadraticCurveTo(25, 10, 25, -10); // Center thickness
    ctx.fill();

    // -- RUNIC ENGRAVING (Glowing) --
    const pulse = Math.sin(time * 4) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(15, -5); ctx.lineTo(20, 0); ctx.lineTo(15, 5); // Chevron
    ctx.moveTo(12, 0); ctx.lineTo(22, 0); // Line through
    ctx.stroke();

    // -- BACK SPIKE (Counterweight) --
    // Balances the silhouette
    const spikeGrad = ctx.createLinearGradient(-6, 0, -20, 0);
    spikeGrad.addColorStop(0, '#222');
    spikeGrad.addColorStop(1, '#555');
    ctx.fillStyle = spikeGrad;

    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-18, -2); // Long spike
    ctx.lineTo(-22, 0);  // Tip
    ctx.lineTo(-18, 2);
    ctx.lineTo(-6, 4);
    ctx.fill();

    // Spike highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-22, 0); ctx.lineTo(-6, 0);
    ctx.fill();

    ctx.translate(-headY, 0);
}
