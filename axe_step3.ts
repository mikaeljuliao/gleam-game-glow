/** Battle Axe - STEP 3: FINAL DETAILS (Realistic Textures) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === CONFIG ===
    const totalLen = length * 1.1;
    const headPos = -totalLen * 0.85;
    const handleW = 4.5; // Slightly thicker for realism

    // 1. HANDLE (Wood Grain & Leather)
    const woodGrad = ctx.createLinearGradient(0, -handleW, 0, handleW);
    woodGrad.addColorStop(0, '#2e1b0e'); // Darker edges
    woodGrad.addColorStop(0.5, '#5c3a1e'); // Lighter center
    woodGrad.addColorStop(1, '#2e1b0e');
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    // Main Shaft with slight swell at bottom
    ctx.moveTo(0, -handleW * 0.4);
    ctx.lineTo(0, handleW * 0.4);
    ctx.lineTo(-totalLen, handleW * 0.6); // Slightly flair at bottom
    ctx.lineTo(-totalLen, -handleW * 0.6);
    ctx.fill();

    // Wood Texture (Fine lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -2 + i * 2);
        ctx.lineTo(-totalLen, -2 + i * 2 + (Math.random() - 0.5));
        ctx.stroke();
    }

    // Leather Grip (Bottom 40%)
    const gripLen = totalLen * 0.4;
    const gripStart = -totalLen;

    ctx.save();
    ctx.beginPath();
    ctx.rect(gripStart, -5, gripLen, 10);
    ctx.clip(); // Clip pattern to handle area

    ctx.fillStyle = '#222'; // Dark leather base
    ctx.fill();

    // Cross-hatch strappings
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const strapSpacing = 6;
    for (let x = gripStart; x < gripStart + gripLen; x += strapSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, -5); ctx.lineTo(x + 4, 5);
        ctx.stroke();
    }
    ctx.restore();

    // 2. HEAD (Detailed Metalwork)
    ctx.translate(headPos, 0);

    // -- SOCKET (The Anchor) --
    // Dark Iron Gradient
    const socketGrad = ctx.createLinearGradient(0, -15, 0, 15);
    socketGrad.addColorStop(0, '#1c1c1c');
    socketGrad.addColorStop(0.5, '#3a3a3a'); // Highlight
    socketGrad.addColorStop(1, '#1c1c1c');
    ctx.fillStyle = socketGrad;

    ctx.beginPath();
    ctx.rect(-8, -12, 16, 24);
    ctx.fill();

    // Bolts/Rivets on Socket
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, -6, 2, 0, Math.PI * 2);
    ctx.arc(0, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // -- REAR SPIKE (Counterweight) --
    ctx.fillStyle = '#2c3e50'; // Base metal
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-2, -28); // Sharp Point
    ctx.lineTo(6, -8);
    ctx.fill();

    // Spike Edge Highlight
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(-2, -28);
    ctx.stroke();

    // -- FRONT BLADE (Main Cutting Body) --
    // Darker body, brighter edge

    // 1. Blade Body (Dark Steel)
    const bladeGrad = ctx.createLinearGradient(10, 0, 40, 0);
    bladeGrad.addColorStop(0, '#2c3e50'); // Dark at socket
    bladeGrad.addColorStop(1, '#4d5b6b'); // Lighter outward
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    ctx.moveTo(8, 12); // Neck bottom
    ctx.lineTo(12, -10); // Neck top (angled)

    // Top Curve
    ctx.quadraticCurveTo(25, -5, 35, 15); // Top Horn Tip

    // Bevel Line (Where flat meets grind)
    ctx.lineTo(25, 15); // Inset
    ctx.lineTo(-5, 20); // Bottom inset

    // Bottom Beard Return
    ctx.lineTo(-8, 12);
    ctx.fill();

    // 2. The Grind / Edge (Polished Steel)
    const edgeGrad = ctx.createLinearGradient(20, 0, 40, 20);
    edgeGrad.addColorStop(0, '#7f8c8d'); // Mid grey
    edgeGrad.addColorStop(0.5, '#bdc3c7'); // Light grey
    edgeGrad.addColorStop(1, '#ecf0f1'); // White-ish edge
    ctx.fillStyle = edgeGrad;

    ctx.beginPath();
    // Bevel Top
    ctx.moveTo(35, 15);
    // Cutting Curve
    ctx.bezierCurveTo(45, 30, 0, 60, -25, 35); // Sharp Edge C-Shape
    // Bevel Bottom
    ctx.lineTo(-5, 20);
    // Bevel Inner Line
    ctx.lineTo(25, 15);
    ctx.fill();

    // 3. Edge Highlight (The 'Sharp' line)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(35, 15);
    ctx.bezierCurveTo(45, 30, 0, 60, -25, 35);
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset

    // -- BATTLE WEAR (Scratches) --
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(20, 5); ctx.lineTo(28, 8);
    ctx.moveTo(22, 10); ctx.lineTo(30, 12);
    ctx.stroke();

    ctx.translate(-headPos, 0);
}
