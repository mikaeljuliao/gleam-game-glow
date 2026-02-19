/** Battle Axe - Structural Fix (Realism & Silhouette Focus) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS ===
    const handleLen = length * 1.1;
    const headY = -handleLen * 0.25; // Head placement

    // 1. HANDLE (Realistic Wood Texture)
    // Base wood color (Dark Oak)
    const woodGrad = ctx.createLinearGradient(-handleLen, 0, 0, 0);
    woodGrad.addColorStop(0, '#2e1b0e'); // Dark Pommel
    woodGrad.addColorStop(0.5, '#5c3a1e'); // Mid Wood
    woodGrad.addColorStop(1, '#2e1b0e'); // Socket Shadow
    ctx.fillStyle = woodGrad;

    // Main Shaft
    ctx.beginPath();
    // Tapered: Thicker at top (socket) and bottom (grip), thinner in middle
    ctx.moveTo(-handleLen, -3);
    ctx.lineTo(headY + 10, -4); // Socket base (wider)
    ctx.lineTo(headY + 10, 4);
    ctx.lineTo(-handleLen, 3);
    ctx.fill();

    // Wood Grain Texture (Subtle lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-handleLen, -2 + i * 2);
        ctx.lineTo(headY, -2 + i * 2 + (Math.random() - 0.5));
        ctx.stroke();
    }

    // Leather Grip (Bottom 30%)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-handleLen + 5, -3.5, length * 0.3, 7);
    // Cross straps
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const x = -handleLen + 5 + i * 6;
        ctx.beginPath();
        ctx.moveTo(x, -3.5); ctx.lineTo(x + 4, 3.5);
        ctx.stroke();
    }

    // 2. THE AXE HEAD (Separated Component)
    ctx.translate(headY, 0);

    // -- Central Socket (The block that holds the handle) --
    // Defined structured block
    const socketGrad = ctx.createLinearGradient(-4, -6, 4, 6);
    socketGrad.addColorStop(0, '#222');
    socketGrad.addColorStop(0.5, '#444');
    socketGrad.addColorStop(1, '#222');
    ctx.fillStyle = socketGrad;

    ctx.beginPath();
    ctx.rect(-6, -6, 12, 12);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(-6, -6, 12, 12);

    // -- MAIN BLADE (Front) --
    // distinct "Axe" shape: Narrow neck flaring into wide blade
    const metalGrad = ctx.createLinearGradient(0, 0, 30, 0);
    metalGrad.addColorStop(0, '#2a2a2a'); // Neck (Dark)
    metalGrad.addColorStop(0.4, '#4a4a4a'); // Body (Steel)
    metalGrad.addColorStop(0.9, '#8a9a9a'); // Edge bevel start
    metalGrad.addColorStop(1, '#ffffff');    // Edge sharpest
    ctx.fillStyle = metalGrad;

    ctx.beginPath();
    // Start at socket front
    ctx.moveTo(6, -4);

    // Top Neck (Curves UP and OUT)
    ctx.quadraticCurveTo(10, -10, 15, -20); // Neck curve

    // Top Spike/Horn (Sharp corner)
    ctx.lineTo(25, -28);

    // CUTTING EDGE (The main curve)
    // A clean, continuous convex curve
    ctx.bezierCurveTo(35, -15, 35, 15, 25, 28);

    // Bottom Neck (Curves IN and UP)
    // Sharp "Beard" hook
    ctx.lineTo(15, 20); // Bottom beard tip
    ctx.quadraticCurveTo(10, 10, 6, 4); // Return to socket

    ctx.closePath();
    ctx.fill();

    // Highlight/Bevel Line (Separates flat blade from sharp edge)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, -28);
    ctx.bezierCurveTo(32, -15, 32, 15, 25, 28);
    ctx.stroke();

    // Structure Line (Ridge along the middle)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();

    // -- REAR COUNTERWEIGHT (Spike/Hammer) --
    const rearGrad = ctx.createLinearGradient(-6, 0, -18, 0);
    rearGrad.addColorStop(0, '#222');
    rearGrad.addColorStop(1, '#111');
    ctx.fillStyle = rearGrad;

    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-14, -2); // Shaft
    ctx.lineTo(-18, 0);  // Point
    ctx.lineTo(-14, 2);
    ctx.lineTo(-6, 3);
    ctx.fill();

    // -- EDGE GLOW (Subtle Magic) --
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
    ctx.shadowBlur = 5 * pulse;
    ctx.fillStyle = `rgba(200, 240, 255, ${0.8 * pulse})`;

    // Just draw a thin line along the very edge
    ctx.beginPath();
    ctx.moveTo(25, -28);
    ctx.bezierCurveTo(35, -15, 35, 15, 25, 28);
    ctx.lineTo(24, 28);
    ctx.bezierCurveTo(33, 15, 33, -15, 24, -28);
    ctx.fill();

    ctx.shadowBlur = 0; // Reset

    // Restore
    ctx.translate(-headY, 0);
}
