/** Battle Axe - SUPER REALISTIC (Viking/Dane Style) */
export function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    // === PROPORTIONS (Realistic Physics) ===
    const totalLen = length * 1.1; // Standard reach
    const handleW = 3.5; // Thin, grippable shaft
    const headW = totalLen * 0.25; // REALISTIC head size (much smaller)
    const headH = totalLen * 0.22;
    const headPos = -totalLen * 0.85; // High balance point

    // 1. HANDLE (Ash Wood Shaft)
    // Real wood has subtle variation, not just a gradient
    const woodGrad = ctx.createLinearGradient(-totalLen, 0, 10, 0);
    woodGrad.addColorStop(0, '#2b1d14'); // Dark grain
    woodGrad.addColorStop(0.3, '#4a3728'); // Mid tone
    woodGrad.addColorStop(0.6, '#2b1d14'); // Dark grain
    woodGrad.addColorStop(0.8, '#3d2b1f'); // Highlight
    woodGrad.addColorStop(1, '#1a110d'); // Shadow side
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    // Slight taper: Thicker at grip, thinner near head, thick at eye
    ctx.moveTo(-totalLen, -handleW); // Pommel end
    ctx.lineTo(headPos, -handleW * 0.9); // Neck
    ctx.lineTo(0, -handleW); // Top
    ctx.lineTo(0, handleW);
    ctx.lineTo(headPos, handleW * 0.9);
    ctx.lineTo(-totalLen, handleW);
    ctx.fill();

    // Wood Grain Details (Fine lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-totalLen, -2 + i);
        ctx.lineTo(0, -2 + i + (Math.random() * 2 - 1));
        ctx.stroke();
    }

    // 2. LEATHER WRAPPING (Grip & Overstrike Guard)
    // Grip (Bottom)
    drawLeatherWrap(ctx, -totalLen, -totalLen + (totalLen * 0.3), handleW + 0.5);
    // Overstrike Guard (Near Head) - Protection for the wood
    drawLeatherWrap(ctx, headPos + 10, headPos + 40, handleW + 0.2);

    // 3. AXE HEAD (Forged Iron & High Carbon Steel)
    ctx.translate(headPos, 0);

    // Material: Dark Forged Iron (Blackened) for structure
    const ironGrad = ctx.createLinearGradient(0, -10, 0, 10);
    ironGrad.addColorStop(0, '#1a1a1a');
    ironGrad.addColorStop(0.5, '#2e2e2e');
    ironGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = ironGrad;

    ctx.beginPath();
    // The Eye (Socket) - wraps around wood
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -8);
    ctx.lineTo(10, 8);
    ctx.lineTo(-8, 10);
    ctx.fill();

    // Wedge (Top of axe) - Holds the head on
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaa'; // Metal wedge
    ctx.fillRect(-1, -2, 2, 4);

    // -- THE BLADE --
    // Shape: bearded axe (hooks back)

    // 1. Main Body (Dark Iron)
    ctx.beginPath();
    ctx.moveTo(5, -8); // Top connect
    ctx.lineTo(15, -12); // Neck out
    ctx.lineTo(25, -20); // Top point start
    ctx.lineTo(25, 25); // Bottom point start
    ctx.lineTo(15, 20); // Beard neck
    ctx.lineTo(8, 12);  // Beard return
    ctx.lineTo(5, 8);   // Bottom connect
    ctx.fill();

    // 2. The Bevel (Grind line to edge) - Mid Grey
    // Detailed transition from rough iron to polished steel
    const steelGrad = ctx.createLinearGradient(15, 0, 35, 0);
    steelGrad.addColorStop(0, '#2e2e2e'); // Iron meet steel
    steelGrad.addColorStop(0.5, '#5a6269'); // Steel body
    steelGrad.addColorStop(1, '#8e9aa3'); // Polish
    ctx.fillStyle = steelGrad;

    ctx.beginPath();
    ctx.moveTo(15, -12);
    ctx.lineTo(35, -28); // Top Tip
    // Edge Curve
    ctx.bezierCurveTo(42, -10, 42, 10, 35, 35); // Bottom Tip
    ctx.lineTo(15, 20); // Beard Corner
    ctx.lineTo(8, 12);
    ctx.fill();

    // 3. The Cutting Edge (Sharpest Point) - Bright Silver
    // Thin strip at the very front
    ctx.fillStyle = '#dbeeff';
    ctx.beginPath();
    ctx.moveTo(33, -26);
    ctx.bezierCurveTo(40, -10, 40, 10, 33, 33);
    ctx.lineTo(35, 35); // Tip
    ctx.bezierCurveTo(42, 10, 42, -10, 35, -28); // Outer Edge
    ctx.fill();

    // 4. Wear & Tear (Realism)
    // Scratches on the flat of the blade
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(20, -10); ctx.lineTo(30, -12);
    ctx.moveTo(22, 5); ctx.lineTo(32, 2);
    ctx.stroke();

    // Pitting/Rust on the dark iron
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(10 + Math.random() * 5, -5 + Math.random() * 10, 0.5 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Restore
    ctx.translate(-headPos, 0);
}

function drawLeatherWrap(ctx: CanvasRenderingContext2D, start: number, end: number, width: number) {
    const len = end - start;
    const steps = Math.floor(len / 3);

    ctx.fillStyle = '#1a110d'; // Dark leather
    ctx.fillRect(start, -width, len, width * 2);

    ctx.strokeStyle = '#2b1d14'; // Lighter seam
    ctx.lineWidth = 1;

    for (let i = 0; i < steps; i++) {
        const x = start + i * 3;
        ctx.beginPath();
        // X-pattern binding
        ctx.moveTo(x, -width);
        ctx.lineTo(x + 3, width);
        ctx.stroke();
    }

    // Outline
    ctx.strokeStyle = '#0f0907';
    ctx.strokeRect(start, -width, len, width * 2);
}
