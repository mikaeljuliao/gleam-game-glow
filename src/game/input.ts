export class InputManager {
  private keys = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private buttonsDown = new Set<number>();
  private buttonsJustPressed = new Set<number>();
  private keysJustPressed = new Set<string>();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private canvas: HTMLCanvasElement | null = null;

  // Touch controls state (exposed for mobile HUD)
  private touchMoveDir = { x: 0, y: 0 };
  private touchJoystickActive = false;
  private touchJoystickOrigin = { x: 0, y: 0 };
  private touchJoystickPos = { x: 0, y: 0 };
  private touchAttackPressed = false;
  private touchRangedPressed = false;
  private touchDashPressed = false;
  private touchPointerId: number | null = null;
  isMobile = false;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onContext = this.onContext.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Detect mobile
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', this.onContext);
    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  setTransform(scale: number, offsetX: number, offsetY: number) {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keys.add(key);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = (e.clientX - rect.left - this.offsetX) / this.scale;
    this.mousePos.y = (e.clientY - rect.top - this.offsetY) / this.scale;
  }

  private onMouseDown(e: MouseEvent) {
    this.buttonsDown.add(e.button);
    this.buttonsJustPressed.add(e.button);
  }

  private onMouseUp(e: MouseEvent) {
    this.buttonsDown.delete(e.button);
  }

  private onContext(e: MouseEvent) {
    e.preventDefault();
  }

  // ---- Touch handling ----
  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      const halfW = rect.width / 2;

      if (tx < halfW) {
        // Left side — joystick
        this.touchPointerId = touch.identifier;
        this.touchJoystickActive = true;
        this.touchJoystickOrigin = { x: tx, y: ty };
        this.touchJoystickPos = { x: tx, y: ty };
        this.touchMoveDir = { x: 0, y: 0 };
      } else {
        // Right side — attack toward touch position (auto-aim)
        const gameX = (tx - this.offsetX) / this.scale;
        const gameY = (ty - this.offsetY) / this.scale;
        this.mousePos.x = gameX;
        this.mousePos.y = gameY;
        // Tap = melee, hold = ranged
        this.touchAttackPressed = true;
        this.buttonsJustPressed.add(0);
        this.buttonsDown.add(0);
      }
    }
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.touchPointerId && this.touchJoystickActive) {
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        this.touchJoystickPos = { x: tx, y: ty };
        const dx = tx - this.touchJoystickOrigin.x;
        const dy = ty - this.touchJoystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 40;
        if (dist > 5) {
          this.touchMoveDir = {
            x: dx / Math.max(dist, maxDist),
            y: dy / Math.max(dist, maxDist),
          };
        } else {
          this.touchMoveDir = { x: 0, y: 0 };
        }
      } else {
        // Right side touch move — update aim
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        const gameX = (tx - this.offsetX) / this.scale;
        const gameY = (ty - this.offsetY) / this.scale;
        this.mousePos.x = gameX;
        this.mousePos.y = gameY;
      }
    }
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchPointerId) {
        this.touchJoystickActive = false;
        this.touchMoveDir = { x: 0, y: 0 };
        this.touchPointerId = null;
      } else {
        this.touchAttackPressed = false;
        this.buttonsDown.delete(0);
      }
    }
  }

  // Public API for mobile HUD buttons
  triggerMelee(aimX: number, aimY: number) {
    this.mousePos.x = aimX;
    this.mousePos.y = aimY;
    this.buttonsJustPressed.add(0);
    this.buttonsDown.add(0);
  }

  triggerRanged(aimX: number, aimY: number) {
    this.mousePos.x = aimX;
    this.mousePos.y = aimY;
    this.buttonsJustPressed.add(2);
    this.buttonsDown.add(2);
  }

  triggerKey(key: string) {
    const k = key.toLowerCase();
    if (!this.keys.has(k)) {
      this.keysJustPressed.add(k);
    }
    this.keys.add(k);
    // Auto-release after a short delay for simulated presses
    setTimeout(() => this.keys.delete(k), 80);
  }

  triggerDash() {
    this.touchDashPressed = true;
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  isJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  isMouseDown(btn: number): boolean {
    return this.buttonsDown.has(btn);
  }

  isMouseJustPressed(btn: number): boolean {
    return this.buttonsJustPressed.has(btn);
  }

  getMousePos() {
    return { ...this.mousePos };
  }

  getMoveDir() {
    // Combine keyboard + touch
    let x = this.touchMoveDir.x, y = this.touchMoveDir.y;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y };
  }

  wantsDash(): boolean {
    if (this.touchDashPressed) return true;
    return this.isDown('f');
  }

  getJoystickState() {
    return {
      active: this.touchJoystickActive,
      originX: this.touchJoystickOrigin.x,
      originY: this.touchJoystickOrigin.y,
      posX: this.touchJoystickPos.x,
      posY: this.touchJoystickPos.y,
    };
  }

  clearFrame() {
    this.buttonsJustPressed.clear();
    this.keysJustPressed.clear();
    this.touchDashPressed = false;
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
      this.canvas.removeEventListener('contextmenu', this.onContext);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }
  }
}
