/** Battle Axe - Unique Dark Elegant Design (Inspired by User References) */
function drawBattleAxe(ctx: CanvasRenderingContext2D, length: number, isAttacking: number, time: number) {
    const handleLen = length * 0.92;
    const headStart = -handleLen * 0.18;

    // === HANDLE (Anatomic Dark Wood) ===
    const handleGrad = ctx.createLinearGradient(-handleLen, 0, 0, 0);
    handleGrad.addColorStop(0, '#1a1214');
    handleGrad.addColorStop(0.3, '#2d2428');
    handleGrad.addColorStop(0.5, '#3a2e32');
    handleGrad.addColorStop(0.7, '#2d2428');
    handleGrad.addColorStop(1, '#1a1214');
    ctx.fillStyle = handleGrad;

    // Ergonomic shape
    ctx.beginPath();
    ctx.moveTo(-handleLen, -2);
    ctx.bezierCurveTo(-handleLen * 0.7, -3, -handleLen * 0.4, -3.2, headStart, -2.5);
    ctx.lineTo(headStart, 2.5);
    ctx.bezierCurveTo(-handleLen * 0.4, 3.2, -handleLen * 0.7, 3, -handleLen, 2);
    ctx.closePath();
    ctx.fill();

    // Handle segments
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
        const x = -handleLen + (handleLen * 0.82 / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, -3);
        ctx.lineTo(x, 3);
        ctx.stroke();
    }

    // Grip wrapping
    ctx.strokeStyle = 'rgba(60, 45, 50, 0.6)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 14; i++) {
        const x = -handleLen * 0.65 + i * 2;
        ctx.beginPath();
        ctx.moveTo(x, -2.5);
        ctx.lineTo(x + 1.2, 2.5);
        ctx.stroke();
    }

    // Pommel
    const pommelGrad = ctx.createRadialGradient(-handleLen, 0, 0, -handleLen, 0, 3.5);
    pommelGrad.addColorStop(0, '#3a3a3e');
    pommelGrad.addColorStop(0.6, '#2a2a2e');
    pommelGrad.addColorStop(1, '#1a1a1e');
    ctx.fillStyle = pommelGrad;
    ctx.beginPath();
    ctx.arc(-handleLen, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80, 80, 90, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-handleLen, 0, 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // === HEAD ===
    ctx.save();
    ctx.translate(headStart, 0);

    // Collar
    const collarGrad = ctx.createLinearGradient(-2, -4, 2, 4);
    collarGrad.addColorStop(0, '#2a2a2e');
    collarGrad.addColorStop(0.5, '#3a3a42');
    collarGrad.addColorStop(1, '#2a2a2e');
    ctx.fillStyle = collarGrad;
    ctx.fillRect(-2, -4, 4, 8);

    // BLADE
    const bladeW = 22;
    const steelGrad = ctx.createLinearGradient(0, -bladeW, 28, bladeW);
    steelGrad.addColorStop(0, '#1f1f22');
    steelGrad.addColorStop(0.2, '#2f2f35');
    steelGrad.addColorStop(0.4, '#4a4a52');
    steelGrad.addColorStop(0.6, '#5a5a62');
    steelGrad.addColorStop(0.8, '#3a3a42');
    steelGrad.addColorStop(1, '#2a2a2e');

    ctx.fillStyle = steelGrad;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(8, -14, 18, -bladeW - 3, 24, -bladeW);
    ctx.lineTo(30, -bladeW + 6);
    ctx.bezierCurveTo(32, -6, 33, 6, 30, bladeW - 6);
    ctx.lineTo(24, bladeW);
    ctx.bezierCurveTo(18, bladeW + 3, 8, 14, 0, 4);
    ctx.closePath();
    ctx.fill();

    // Edge
    const edgeGrad = ctx.createLinearGradient(25, -bladeW, 33, 0);
    edgeGrad.addColorStop(0, 'rgba(160, 170, 180, 0)');
    edgeGrad.addColorStop(0.4, 'rgba(200, 210, 220, 0.85)');
    edgeGrad.addColorStop(0.7, 'rgba(220, 230, 240, 0.95)');
    edgeGrad.addColorStop(1, 'rgba(160, 170, 180, 0)');

    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.moveTo(26, -bladeW + 8);
    ctx.bezierCurveTo(30, -6, 31, 6, 26, bladeW - 8);
    ctx.lineTo(32, 0);
    ctx.closePath();
    ctx.fill();

    // Rune
    const runePulse = 0.7 + Math.sin(time * 3) * 0.3;
    ctx.save();
    ctx.translate(14, -4);
    ctx.scale(0.6, 0.6);

    const runeGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 4);
    runeGlow.addColorStop(0, `rgba(100, 180, 220, ${0.4 * runePulse})`);
    runeGlow.addColorStop(1, 'rgba(100, 180, 220, 0)');
    ctx.fillStyle = runeGlow;
    ctx.fillRect(-4, -4, 8, 8);

    ctx.strokeStyle = `rgba(150, 200, 230, ${0.8 * runePulse})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, 3);
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();

    ctx.fillStyle = `rgba(150, 200, 230, ${0.6 * runePulse})`;
    ctx.beginPath();
    ctx.arc(-2, -2, 0.5, 0, Math.PI * 2);
    ctx.arc(2, -2, 0.5, 0, Math.PI * 2);
    ctx.arc(-2, 2, 0.5, 0, Math.PI * 2);
    ctx.arc(2, 2, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Fuller
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.quadraticCurveTo(14, -10, 20, -11);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.quadraticCurveTo(14, 10, 20, 11);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(90, 90, 100, 0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6, -11);
    ctx.quadraticCurveTo(14, -9, 20, -10);
    ctx.stroke();

    // Scratches
    ctx.strokeStyle = 'rgba(70, 70, 80, 0.25)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(10, -14);
    ctx.lineTo(22, -16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(20, 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(18, -4);
    ctx.stroke();

    // Hook
    const hookGrad = ctx.createLinearGradient(-6, 0, 0, 0);
    hookGrad.addColorStop(0, '#1a1a1e');
    hookGrad.addColorStop(0.5, '#2a2a32');
    hookGrad.addColorStop(1, '#2a2a2e');

    ctx.fillStyle = hookGrad;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-8, -3);
    ctx.quadraticCurveTo(-10, 0, -8, 3);
    ctx.lineTo(0, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 0);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 100, 110, 0.4)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-8, -2);
    ctx.quadraticCurveTo(-9, 0, -8, 2);
    ctx.lineTo(0, 4);
    ctx.stroke();

    // Shine
    if (isAttacking > 0) {
        const shinePos = 16 + Math.sin(time * 18) * 8;
        const shineGrad = ctx.createRadialGradient(shinePos, 0, 0, shinePos, 0, 10);
        shineGrad.addColorStop(0, 'rgba(180, 200, 220, 0.35)');
        shineGrad.addColorStop(0.5, 'rgba(140, 170, 200, 0.15)');
        shineGrad.addColorStop(1, 'rgba(100, 130, 160, 0)');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.moveTo(shinePos - 8, -bladeW * 0.6);
        ctx.lineTo(shinePos + 4, 0);
        ctx.lineTo(shinePos - 8, bladeW * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}
