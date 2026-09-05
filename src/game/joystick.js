// Virtual Touch Joystick Helper for Mobile Screens in Phaser 3

export class VirtualJoystick {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x || 100;
    this.y = options.y || 100;
    this.radius = options.radius || 60;
    this.handleRadius = options.handleRadius || 26;

    this.base = null;
    this.handle = null;

    this.touchPointer = null;
    this.dx = 0; // -1 to 1
    this.dy = 0; // -1 to 1
    this.isDragging = false;

    this.create();
  }

  create() {
    // Outer base circle
    this.base = this.scene.add.circle(this.x, this.y, this.radius, 0xffffff, 0.15);
    this.base.setStrokeStyle(3, 0x38bdf8, 0.5);
    this.base.setScrollFactor(0);
    this.base.setDepth(1000);

    // Inner joystick handle circle
    this.handle = this.scene.add.circle(this.x, this.y, this.handleRadius, 0x38bdf8, 0.8);
    this.handle.setStrokeStyle(2, 0xffffff, 0.9);
    this.handle.setScrollFactor(0);
    this.handle.setDepth(1001);

    // Enable touch input on the base
    this.base.setInteractive({ useHandCursor: true });

    this.scene.input.on("pointerdown", (pointer) => {
      // Check if pointer is on bottom-left region of screen
      const canvasWidth = this.scene.scale.width;
      const canvasHeight = this.scene.scale.height;

      if (pointer.x < canvasWidth * 0.45 && pointer.y > canvasHeight * 0.4) {
        this.touchPointer = pointer;
        this.isDragging = true;
        // Reposition base dynamically to touch location
        this.setPosition(pointer.x, pointer.y);
        this.updateHandle(pointer.x, pointer.y);
      }
    });

    this.scene.input.on("pointermove", (pointer) => {
      if (this.isDragging && this.touchPointer && pointer.id === this.touchPointer.id) {
        this.updateHandle(pointer.x, pointer.y);
      }
    });

    const stopDragging = (pointer) => {
      if (this.touchPointer && pointer.id === this.touchPointer.id) {
        this.isDragging = false;
        this.touchPointer = null;
        this.dx = 0;
        this.dy = 0;
        this.handle.setPosition(this.x, this.y);
      }
    };

    this.scene.input.on("pointerup", stopDragging);
    this.scene.input.on("pointerupoutside", stopDragging);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.base.setPosition(x, y);
    this.handle.setPosition(x, y);
  }

  updateHandle(pointerX, pointerY) {
    const angle = Math.atan2(pointerY - this.y, pointerX - this.x);
    const dist = Math.hypot(pointerX - this.x, pointerY - this.y);
    const maxDist = this.radius;

    const clampedDist = Math.min(dist, maxDist);
    const handleX = this.x + Math.cos(angle) * clampedDist;
    const handleY = this.y + Math.sin(angle) * clampedDist;

    this.handle.setPosition(handleX, handleY);

    // Normalize dx, dy between -1 and 1
    this.dx = (Math.cos(angle) * clampedDist) / maxDist;
    this.dy = (Math.sin(angle) * clampedDist) / maxDist;
  }

  getVector() {
    return { dx: this.dx, dy: this.dy };
  }

  destroy() {
    if (this.base) this.base.destroy();
    if (this.handle) this.handle.destroy();
  }
}
