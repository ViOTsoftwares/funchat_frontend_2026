import Phaser from "phaser";
import {
  playCoinSound,
  playSuperCoinSound,
  playPowerUpSound,
} from "./soundEffects.js";

const BASE_SPEED = 220; // units / sec
const PLAYER_RADIUS = 20;

export default class CoinRushScene extends Phaser.Scene {
  constructor() {
    super("CoinRushScene");

    this.socket = null;
    this.roomId = null;
    this.localPlayerId = null;
    this.arenaWalls = [];
    this.arenaSize = { width: 1200, height: 800 };

    this.playerSprites = new Map(); // socketId -> { container, circle, nameText, aura, trailParticles, targetX, targetY, vx, vy, isMe }
    this.coinSprites = new Map(); // coinId -> { container, outer, glowRing, baseY, bobOffset }
    this.powerUpSprites = new Map(); // pwId -> { container, ring, glow, x, y }

    this.cursors = null;
    this.wasd = null;
    this.lastInputTime = 0;

    // Local client-side predicted position
    this.predictedPos = { x: 600, y: 400 };

    // Keyboard, D-Pad & Joystick states
    this.keyState = { Up: false, Down: false, Left: false, Right: false };
    this.dpadState = { Up: false, Down: false, Left: false, Right: false };
    this.joystickVector = { dx: 0, dy: 0 };
    this.joystickPointer = null;
    this.joystickContainer = null;
    this.joystickKnob = null;
    this.joystickConfig = { theme: "neon", mode: "fixed", size: "standard" };

    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onWindowBlur = null;
  }

  init(data) {
    this.socket = data.socket;
    this.roomId = data.roomId;
    this.localPlayerId = data.socket?.id;
    this.arenaWalls = data.arenaWalls || [];
    this.arenaSize = data.arenaSize || { width: 1200, height: 800 };
    this.joystickConfig = data.joystickConfig || { theme: "neon", mode: "fixed", size: "standard" };
  }

  create() {
    // 1. Disable Phaser pause on tab blur to keep rendering active in background
    if (this.game && this.game.events) {
      this.game.events.off("hidden");
      this.game.events.off("visible");
      this.game.events.off("blur");
      this.game.events.off("focus");
    }

    // 2. Direct Window Keyboard Event Tracking
    this.keyState = { Up: false, Down: false, Left: false, Right: false };

    this.onKeyDown = (e) => {
      const code = e.code || e.key;
      if (code === "KeyW" || code === "w" || code === "ArrowUp") this.keyState.Up = true;
      if (code === "KeyS" || code === "s" || code === "ArrowDown") this.keyState.Down = true;
      if (code === "KeyA" || code === "a" || code === "ArrowLeft") this.keyState.Left = true;
      if (code === "KeyD" || code === "d" || code === "ArrowRight") this.keyState.Right = true;
    };

    this.onKeyUp = (e) => {
      const code = e.code || e.key;
      if (code === "KeyW" || code === "w" || code === "ArrowUp") this.keyState.Up = false;
      if (code === "KeyS" || code === "s" || code === "ArrowDown") this.keyState.Down = false;
      if (code === "KeyA" || code === "a" || code === "ArrowLeft") this.keyState.Left = false;
      if (code === "KeyD" || code === "d" || code === "ArrowRight") this.keyState.Right = false;
    };

    // Fix: Window blur listener clears key states to stop player when switching tabs
    this.onWindowBlur = () => {
      this.keyState = { Up: false, Down: false, Left: false, Right: false };
      this.dpadState = { Up: false, Down: false, Left: false, Right: false };
      this.sendPlayerInput();
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);

    // 3. Draw Arena Grid & Outer Boundaries
    this.drawArenaGrid();
    this.drawArenaWalls();

    // 4. Create Particle Textures for trails & explosions
    this.createParticleTextures();

    // 5. Create 360-Degree Analog Virtual Touch Joystick
    this.createAnalogJoystick();

    // 6. Setup Keyboard Controls in Phaser
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
    }

    // 7. Register Socket Event Listeners with bound handlers (prevents unregistering page listeners)
    if (this.socket) {
      this.boundHandleGameState = (state) => this.handleGameState(state);
      this.boundHandleCoinCollected = (data) => this.handleCoinCollected(data);
      this.boundHandlePowerUpCollected = (data) => this.handlePowerUpCollected(data);

      this.socket.off("coinRush_gameState", this.boundHandleGameState);
      this.socket.off("coinRush_coinCollected", this.boundHandleCoinCollected);
      this.socket.off("coinRush_powerUpCollected", this.boundHandlePowerUpCollected);

      this.socket.on("coinRush_gameState", this.boundHandleGameState);
      this.socket.on("coinRush_coinCollected", this.boundHandleCoinCollected);
      this.socket.on("coinRush_powerUpCollected", this.boundHandlePowerUpCollected);
    }

    // 8. Register Lifecycle Cleanup Hooks for Phaser Shutdown & Destroy
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanUpScene, this);

    // 9. Camera Settings
    this.cameras.main.setBounds(0, 0, this.arenaSize.width, this.arenaSize.height);
  }

  createParticleTextures() {
    if (!this.textures.exists("glowParticle")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture("glowParticle", 16, 16);
    }
  }

  createAnalogJoystick() {
    if (this.joystickContainer) {
      this.joystickContainer.destroy();
    }

    const { theme = "neon", mode = "fixed", size = "standard" } = this.joystickConfig || {};
    const scale = size === "compact" ? 0.8 : size === "large" ? 1.25 : 1.0;

    const themeColors = {
      neon: { base: 0x1e1b4b, stroke: 0x6366f1, glow: 0x818cf8, knob: 0x38bdf8, inner: 0xffffff },
      cyber: { base: 0x4c0519, stroke: 0xec4899, glow: 0xf472b6, knob: 0xa855f7, inner: 0xffffff },
      gold: { base: 0x451a03, stroke: 0xf59e0b, glow: 0xfde047, knob: 0xf59e0b, inner: 0xffffff },
    }[theme] || { base: 0x1e1b4b, stroke: 0x6366f1, glow: 0x818cf8, knob: 0x38bdf8, inner: 0xffffff };

    const fixedX = Math.round(130 * scale);
    const fixedY = Math.round(this.arenaSize.height - 170 * scale);
    this.joystickCenter = { x: fixedX, y: fixedY };

    const container = this.add.container(fixedX, fixedY);
    container.setScrollFactor(0);
    container.setDepth(1000);
    if (mode === "dynamic") {
      container.setAlpha(0.3);
    }

    // Outer Glow Ring
    const outerGlow = this.add.circle(0, 0, Math.round(62 * scale), themeColors.glow, 0.2);

    // Outer Base Circle
    const baseCircle = this.add.circle(0, 0, Math.round(52 * scale), themeColors.base, 0.75);
    baseCircle.setStrokeStyle(3 * scale, themeColors.stroke, 0.9);

    // Subtle direction accent dots
    const topDot = this.add.circle(0, -Math.round(34 * scale), 3 * scale, themeColors.stroke, 0.7);
    const bottomDot = this.add.circle(0, Math.round(34 * scale), 3 * scale, themeColors.stroke, 0.7);
    const leftDot = this.add.circle(-Math.round(34 * scale), 0, 3 * scale, themeColors.stroke, 0.7);
    const rightDot = this.add.circle(Math.round(34 * scale), 0, 3 * scale, themeColors.stroke, 0.7);

    // Movable Knob Container
    const knobGlow = this.add.circle(0, 0, Math.round(28 * scale), themeColors.knob, 0.35);
    const knobBody = this.add.circle(0, 0, Math.round(22 * scale), themeColors.knob, 0.9);
    knobBody.setStrokeStyle(2.5 * scale, 0xffffff, 0.95);
    const knobCore = this.add.circle(0, 0, Math.round(8 * scale), themeColors.inner, 0.9);

    const knobContainer = this.add.container(0, 0);
    knobContainer.add([knobGlow, knobBody, knobCore]);

    container.add([outerGlow, baseCircle, topDot, bottomDot, leftDot, rightDot, knobContainer]);

    this.joystickContainer = container;
    this.joystickKnob = knobContainer;
    this.joystickScale = scale;
    this.joystickMaxRadius = 50 * scale;

    // Enable multi-touch pointers in Phaser
    if (this.input) {
      this.input.addPointer(2);
      this.input.on("pointerdown", this.handleJoystickPointerDown, this);
      this.input.on("pointermove", this.handleJoystickPointerMove, this);
      this.input.on("pointerup", this.handleJoystickPointerUp, this);
      this.input.on("pointerupoutside", this.handleJoystickPointerUp, this);
    }
  }

  handleJoystickPointerDown(pointer) {
    if (this.joystickPointer) return;

    const { mode = "fixed" } = this.joystickConfig || {};
    const px = pointer.x;
    const py = pointer.y;

    if (mode === "dynamic") {
      if (px < (this.cameras.main?.width || 1200) * 0.55) {
        this.joystickPointer = pointer;
        this.joystickCenter = { x: px, y: py };
        this.joystickContainer.setPosition(px, py);
        this.joystickContainer.setAlpha(1);
        this.joystickKnob.setPosition(0, 0);
      }
    } else {
      const dist = Math.hypot(px - this.joystickCenter.x, py - this.joystickCenter.y);
      if (dist <= 120 * (this.joystickScale || 1.0)) {
        this.joystickPointer = pointer;
        this.joystickContainer.setAlpha(1);
        this.handleJoystickPointerMove(pointer);
      }
    }
  }

  handleJoystickPointerMove(pointer) {
    if (!this.joystickPointer || pointer.id !== this.joystickPointer.id) return;

    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = this.joystickMaxRadius || 50;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    this.joystickKnob.setPosition(kx, ky);

    this.joystickVector = {
      dx: maxRadius > 0 ? (Math.cos(angle) * clampedDist) / maxRadius : 0,
      dy: maxRadius > 0 ? (Math.sin(angle) * clampedDist) / maxRadius : 0,
    };
  }

  handleJoystickPointerUp(pointer) {
    if (!this.joystickPointer || pointer.id !== this.joystickPointer.id) return;

    this.joystickPointer = null;
    this.joystickVector = { dx: 0, dy: 0 };

    if (this.tweens && this.joystickKnob) {
      this.tweens.add({
        targets: this.joystickKnob,
        x: 0,
        y: 0,
        duration: 150,
        ease: "Back.easeOut",
      });
    } else if (this.joystickKnob) {
      this.joystickKnob.setPosition(0, 0);
    }

    if (this.joystickConfig?.mode === "dynamic" && this.joystickContainer) {
      if (this.tweens) {
        this.tweens.add({
          targets: this.joystickContainer,
          alpha: 0.3,
          duration: 200,
        });
      } else {
        this.joystickContainer.setAlpha(0.3);
      }
    }
  }

  updateJoystickConfig(newConfig) {
    if (!newConfig) return;
    this.joystickConfig = { ...this.joystickConfig, ...newConfig };
    this.createAnalogJoystick();
  }

  drawArenaGrid() {
    const { width, height } = this.arenaSize;
    const gridGraphics = this.add.graphics();

    gridGraphics.fillGradientStyle(0x090d16, 0x090d16, 0x111827, 0x1e1b4b, 1);
    gridGraphics.fillRect(0, 0, width, height);

    gridGraphics.lineStyle(1, 0x312e81, 0.35);
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridGraphics.lineBetween(0, y, width, y);
    }

    gridGraphics.lineStyle(3, 0x6366f1, 0.8);
    const accentSize = 30;
    gridGraphics.lineBetween(20, 20, 20 + accentSize, 20);
    gridGraphics.lineBetween(20, 20, 20, 20 + accentSize);
    gridGraphics.lineBetween(width - 20, 20, width - 20 - accentSize, 20);
    gridGraphics.lineBetween(width - 20, 20, width - 20, 20 + accentSize);
    gridGraphics.lineBetween(20, height - 20, 20 + accentSize, height - 20);
    gridGraphics.lineBetween(20, height - 20, 20, height - 20 - accentSize);
    gridGraphics.lineBetween(width - 20, height - 20, width - 20 - accentSize, height - 20);
    gridGraphics.lineBetween(width - 20, height - 20, width - 20, height - 20 - accentSize);
  }

  drawArenaWalls() {
    const wallGraphics = this.add.graphics();

    this.arenaWalls.forEach((wall) => {
      wallGraphics.lineStyle(4, 0x4338ca, 0.9);
      wallGraphics.fillStyle(0x0f172a, 0.95);
      wallGraphics.strokeRect(wall.x, wall.y, wall.w, wall.h);
      wallGraphics.fillRect(wall.x, wall.y, wall.w, wall.h);

      wallGraphics.lineStyle(2, 0x818cf8, 0.7);
      wallGraphics.strokeRect(wall.x + 3, wall.y + 3, wall.w - 6, wall.h - 6);

      wallGraphics.fillStyle(0x38bdf8, 1);
      wallGraphics.fillCircle(wall.x + 4, wall.y + 4, 2);
      wallGraphics.fillCircle(wall.x + wall.w - 4, wall.y + 4, 2);
      wallGraphics.fillCircle(wall.x + 4, wall.y + wall.h - 4, 2);
      wallGraphics.fillCircle(wall.x + wall.w - 4, wall.y + wall.h - 4, 2);
    });
  }

  // ── Helper: Check point collision against walls ──
  isPointCollidingWithWalls(x, y, radius = PLAYER_RADIUS) {
    for (const wall of this.arenaWalls) {
      if (
        x + radius > wall.x &&
        x - radius < wall.x + wall.w &&
        y + radius > wall.y &&
        y - radius < wall.y + wall.h
      ) {
        return true;
      }
    }
    return false;
  }

  update(time, delta) {
    const dt = delta / 1000;

    // 1. Process Input & Send to Server (30 updates / sec)
    if (time - this.lastInputTime > 30) {
      this.lastInputTime = time;
      this.sendPlayerInput();
    }

    // 2. Client-Side Prediction for Local Player (Instant 60 FPS response!)
    const myId = this.socket?.id;
    const localSprite = this.playerSprites.get(myId);

    if (localSprite) {
      const inputDir = this.getInputDirection();
      let currentSpeed = localSprite.hasSpeedPowerUp ? BASE_SPEED * 1.8 : BASE_SPEED;

      let nextX = this.predictedPos.x + inputDir.dx * currentSpeed * dt;
      let nextY = this.predictedPos.y + inputDir.dy * currentSpeed * dt;

      // Validate predicted move against arena walls
      if (!this.isPointCollidingWithWalls(nextX, this.predictedPos.y, PLAYER_RADIUS)) {
        this.predictedPos.x = nextX;
      }
      if (!this.isPointCollidingWithWalls(this.predictedPos.x, nextY, PLAYER_RADIUS)) {
        this.predictedPos.y = nextY;
      }

      // Clamp predicted position to boundary padding
      this.predictedPos.x = Math.max(PLAYER_RADIUS + 20, Math.min(this.arenaSize.width - PLAYER_RADIUS - 20, this.predictedPos.x));
      this.predictedPos.y = Math.max(PLAYER_RADIUS + 20, Math.min(this.arenaSize.height - PLAYER_RADIUS - 20, this.predictedPos.y));

      // Reconcile with server target position smoothly
      const distToServer = Math.hypot(this.predictedPos.x - localSprite.targetX, this.predictedPos.y - localSprite.targetY);
      const speedMag = Math.hypot(inputDir.dx, inputDir.dy);

      if (distToServer > 50) {
        this.predictedPos.x = localSprite.targetX;
        this.predictedPos.y = localSprite.targetY;
      } else if (speedMag <= 0.05) {
        // Soft lerp prediction towards server position when stationary
        this.predictedPos.x = Phaser.Math.Linear(this.predictedPos.x, localSprite.targetX, 0.2);
        this.predictedPos.y = Phaser.Math.Linear(this.predictedPos.y, localSprite.targetY, 0.2);
      }

      localSprite.container.x = this.predictedPos.x;
      localSprite.container.y = this.predictedPos.y;

      if (localSprite.trailParticles && speedMag > 0.1) {
        localSprite.trailParticles.emitParticleAt(localSprite.container.x, localSprite.container.y);
      }

      // 2b. Instant Local 60 FPS Coin & Power-Up Pickup Prediction for Mobile
      const COIN_RADIUS = 14;
      this.coinSprites.forEach((coinData) => {
        if (coinData.container && coinData.container.visible && !coinData.collectedLocally) {
          const dist = Math.hypot(this.predictedPos.x - coinData.container.x, this.predictedPos.y - coinData.baseY);
          if (dist <= PLAYER_RADIUS + COIN_RADIUS + 8) {
            coinData.collectedLocally = true;
            coinData.container.setVisible(false);
            this.triggerLocalCoinPickupFx(coinData);
          }
        }
      });

      const POWERUP_RADIUS = 22;
      this.powerUpSprites.forEach((pwData) => {
        if (pwData.container && pwData.container.visible && !pwData.collectedLocally) {
          const dist = Math.hypot(this.predictedPos.x - pwData.x, this.predictedPos.y - pwData.y);
          if (dist <= PLAYER_RADIUS + POWERUP_RADIUS + 8) {
            pwData.collectedLocally = true;
            pwData.container.setVisible(false);
            this.triggerLocalPowerUpPickupFx(pwData);
          }
        }
      });
    }

    // 3. Interpolate & Extrapolate Remote Player Sprites
    this.playerSprites.forEach((spriteData, socketId) => {
      if (socketId === myId) return; // Skip local player (already predicted)

      // Extrapolate remote player target using velocity
      spriteData.targetX += (spriteData.vx || 0) * dt;
      spriteData.targetY += (spriteData.vy || 0) * dt;

      const prevX = spriteData.container.x;
      const prevY = spriteData.container.y;

      spriteData.container.x = Phaser.Math.Linear(prevX, spriteData.targetX, 0.35);
      spriteData.container.y = Phaser.Math.Linear(prevY, spriteData.targetY, 0.35);

      const moveDist = Math.hypot(spriteData.container.x - prevX, spriteData.container.y - prevY);
      if (spriteData.trailParticles && moveDist > 0.5) {
        spriteData.trailParticles.emitParticleAt(spriteData.container.x, spriteData.container.y);
      }

      if (spriteData.aura && spriteData.aura.visible) {
        spriteData.aura.rotation += 0.05;
      }
    });

    // 4. Animate Spinning & Floating Coins
    this.coinSprites.forEach((coinData) => {
      coinData.bobOffset += 0.06;
      const bobY = Math.sin(coinData.bobOffset) * 5;
      coinData.container.y = coinData.baseY + bobY;
      coinData.outer.rotation += 0.04;
      if (coinData.glowRing) {
        coinData.glowRing.scale = 1 + Math.sin(coinData.bobOffset * 1.5) * 0.15;
      }
    });

    // 5. Animate Power-Ups
    this.powerUpSprites.forEach((pwData) => {
      pwData.ring.rotation += 0.06;
      if (pwData.glow) {
        pwData.glow.rotation -= 0.03;
      }
    });
  }

  getInputDirection() {
    let dx = 0;
    let dy = 0;

    // 1. Analog Virtual Touch Joystick Input (360 Degree Continuous Vector)
    if (this.joystickVector && (this.joystickVector.dx !== 0 || this.joystickVector.dy !== 0)) {
      return { dx: this.joystickVector.dx, dy: this.joystickVector.dy };
    }

    // 2. Direct Window Keyboard Event Input
    if (this.keyState) {
      if (this.keyState.Left) dx -= 1;
      if (this.keyState.Right) dx += 1;
      if (this.keyState.Up) dy -= 1;
      if (this.keyState.Down) dy += 1;
    }

    // 3. On-Screen D-Pad Buttons Input
    if (this.dpadState) {
      if (this.dpadState.Left) dx -= 1;
      if (this.dpadState.Right) dx += 1;
      if (this.dpadState.Up) dy -= 1;
      if (this.dpadState.Down) dy += 1;
    }

    // 4. Phaser Cursors & WASD Keys Input
    if (dx === 0 && dy === 0 && this.cursors && this.wasd) {
      if (this.wasd.left.isDown || this.cursors.left.isDown) dx -= 1;
      if (this.wasd.right.isDown || this.cursors.right.isDown) dx += 1;
      if (this.wasd.up.isDown || this.cursors.up.isDown) dy -= 1;
      if (this.wasd.down.isDown || this.cursors.down.isDown) dy += 1;
    }

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    return { dx, dy };
  }

  sendPlayerInput() {
    if (!this.socket || !this.socket.connected) return;
    const { dx, dy } = this.getInputDirection();
    this.socket.emit("coinRush_playerInput", { dx, dy, roomId: this.roomId });
  }

  handleGameState(state) {
    if (!state || !state.players) return;

    const currentSocketIds = new Set();
    const currentCoinIds = new Set();
    const currentPowerUpIds = new Set();

    // ── 1. Update / Create Players ──
    state.players.forEach((p) => {
      currentSocketIds.add(p.id);

      if (!this.playerSprites.has(p.id)) {
        this.createPlayerSprite(p);
      } else {
        const spriteData = this.playerSprites.get(p.id);
        spriteData.targetX = p.x;
        spriteData.targetY = p.y;
        spriteData.vx = p.vx || 0;
        spriteData.vy = p.vy || 0;

        if (p.powerUp) {
          spriteData.hasSpeedPowerUp = p.powerUp.type === "speed";
          spriteData.aura.setVisible(true);
          const auraColor =
            p.powerUp.type === "speed"
              ? 0x38bdf8
              : p.powerUp.type === "double"
              ? 0xf59e0b
              : 0xa855f7;
          spriteData.aura.setStrokeStyle(4, auraColor, 0.95);
        } else {
          spriteData.hasSpeedPowerUp = false;
          spriteData.aura.setVisible(false);
        }
      }
    });

    // Remove disconnected players
    this.playerSprites.forEach((spriteData, socketId) => {
      if (!currentSocketIds.has(socketId)) {
        if (spriteData.trailParticles) spriteData.trailParticles.destroy();
        spriteData.container.destroy();
        this.playerSprites.delete(socketId);
      }
    });

    // ── 2. Update / Create Coins ──
    if (state.coins) {
      state.coins.forEach((c) => {
        currentCoinIds.add(c.id);
        if (!this.coinSprites.has(c.id)) {
          this.createCoinSprite(c);
        } else {
          const coinData = this.coinSprites.get(c.id);
          coinData.container.x = c.x;
          coinData.baseY = c.y;
          if (coinData.collectedLocally) {
            coinData.container.setVisible(false);
          }
        }
      });

      this.coinSprites.forEach((coinData, coinId) => {
        if (!currentCoinIds.has(coinId)) {
          if (coinData.container) coinData.container.destroy();
          this.coinSprites.delete(coinId);
        }
      });
    }

    // ── 3. Update / Create Power-Ups ──
    if (state.powerUps) {
      state.powerUps.forEach((pw) => {
        currentPowerUpIds.add(pw.id);
        if (!this.powerUpSprites.has(pw.id)) {
          this.createPowerUpSprite(pw);
        } else {
          const pwData = this.powerUpSprites.get(pw.id);
          if (pwData && pwData.collectedLocally) {
            pwData.container.setVisible(false);
          }
        }
      });

      this.powerUpSprites.forEach((pwData, pwId) => {
        if (!currentPowerUpIds.has(pwId)) {
          if (pwData.container) pwData.container.destroy();
          this.powerUpSprites.delete(pwId);
        }
      });
    }

    // Camera follow local player smoothly
    const localSprite = this.playerSprites.get(this.socket?.id);
    if (localSprite && !this.cameras.main.isFollowing) {
      this.cameras.main.startFollow(localSprite.container, true, 0.12, 0.12);
    }
  }

  createPlayerSprite(player) {
    const container = this.add.container(player.x, player.y);
    const colorHex = Phaser.Display.Color.HexStringToColor(player.color || "#38bdf8").color;

    const isMe = player.id === this.socket?.id;
    if (isMe) {
      this.predictedPos = { x: player.x, y: player.y };
    }

    const trailParticles = this.add.particles(0, 0, "glowParticle", {
      speed: 15,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: colorHex,
      lifespan: 300,
      blendMode: "ADD",
      emitting: false,
    });

    const aura = this.add.arc(0, 0, 28, 0, 360, false);
    aura.setStrokeStyle(4, 0xf59e0b, 0.9);
    aura.setVisible(false);

    const glowCircle = this.add.circle(0, 0, 24, colorHex, 0.35);
    const bodyCircle = this.add.circle(0, 0, 20, colorHex);
    bodyCircle.setStrokeStyle(3, 0xffffff, 0.95);
    const innerCircle = this.add.circle(-5, -5, 6, 0xffffff, 0.45);

    const displayName = isMe ? `${player.name} (You)` : player.name;
    const nameText = this.add.text(0, -34, displayName, {
      fontFamily: "Inter, Roboto, sans-serif",
      fontSize: "12px",
      fontWeight: "900",
      color: isMe ? "#fde047" : "#ffffff",
      stroke: "#0f172a",
      strokeThickness: 4,
    });
    nameText.setOrigin(0.5);

    container.add([aura, glowCircle, bodyCircle, innerCircle, nameText]);

    this.playerSprites.set(player.id, {
      container,
      circle: bodyCircle,
      nameText,
      aura,
      trailParticles,
      targetX: player.x,
      targetY: player.y,
      vx: player.vx || 0,
      vy: player.vy || 0,
      isMe,
      hasSpeedPowerUp: false,
    });
  }

  createCoinSprite(coin) {
    const container = this.add.container(coin.x, coin.y);
    const isSuper = coin.type === "super";

    const outerColor = isSuper ? 0xa855f7 : 0xf59e0b;
    const glowColor = isSuper ? 0xc084fc : 0xfde047;

    const glowRing = this.add.circle(0, 0, 18, glowColor, 0.3);
    const outer = this.add.circle(0, 0, 14, outerColor);
    outer.setStrokeStyle(2, 0xffffff, 0.95);

    const symbol = this.add.text(0, 0, isSuper ? "★" : "🪙", {
      fontSize: isSuper ? "14px" : "12px",
    });
    symbol.setOrigin(0.5);

    container.add([glowRing, outer, symbol]);

    this.coinSprites.set(coin.id, {
      container,
      outer,
      glowRing,
      baseY: coin.y,
      bobOffset: Math.random() * 10,
      type: coin.type,
      value: coin.value || (isSuper ? 30 : 10),
      collectedLocally: false,
    });
  }

  createPowerUpSprite(pw) {
    const container = this.add.container(pw.x, pw.y);

    let icon = "⚡";
    let color = 0x38bdf8;

    if (pw.type === "double") {
      icon = "🪙2X";
      color = 0xf59e0b;
    } else if (pw.type === "magnet") {
      icon = "🧲";
      color = 0xa855f7;
    }

    const glow = this.add.circle(0, 0, 26, color, 0.35);
    const bg = this.add.circle(0, 0, 18, color, 0.9);
    const ring = this.add.arc(0, 0, 22, 0, 360, false);
    ring.setStrokeStyle(3, 0xffffff, 0.95);

    const txt = this.add.text(0, 0, icon, {
      fontSize: pw.type === "double" ? "10px" : "14px",
      fontWeight: "bold",
      color: "#ffffff",
    });
    txt.setOrigin(0.5);

    container.add([glow, bg, ring, txt]);

    this.powerUpSprites.set(pw.id, {
      container,
      ring,
      glow,
      x: pw.x,
      y: pw.y,
      type: pw.type,
      collectedLocally: false,
    });
  }

  triggerLocalCoinPickupFx(coinData) {
    if (!coinData) return;

    const isSuper = coinData.type === "super" || coinData.value >= 20;
    if (isSuper) {
      playSuperCoinSound();
      if (this.cameras.main) this.cameras.main.shake(150, 0.005);
    } else {
      playCoinSound();
    }

    const popX = coinData.container?.x || this.predictedPos.x;
    const popY = coinData.baseY || coinData.container?.y || this.predictedPos.y;

    const burst = this.add.particles(popX, popY, "glowParticle", {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: isSuper ? 0xf472b6 : 0xfde047,
      lifespan: 400,
      blendMode: "ADD",
      emitting: false,
    });
    burst.explode(12);
    this.time.delayedCall(500, () => burst.destroy());

    const pointsAdded = coinData.value || (isSuper ? 30 : 10);
    const popText = this.add.text(popX, popY - 15, `+${pointsAdded}`, {
      fontFamily: "Inter, Roboto, sans-serif",
      fontSize: "20px",
      fontWeight: "900",
      color: isSuper ? "#f472b6" : "#fde047",
      stroke: "#0f172a",
      strokeThickness: 5,
    });
    popText.setOrigin(0.5);

    this.tweens.add({
      targets: popText,
      y: popY - 65,
      alpha: 0,
      scale: 1.5,
      duration: 850,
      ease: "Back.easeOut",
      onComplete: () => popText.destroy(),
    });
  }

  triggerLocalPowerUpPickupFx(pwData) {
    if (!pwData) return;
    playPowerUpSound(pwData.type);
    if (this.cameras.main) this.cameras.main.shake(200, 0.008);

    const label =
      pwData.type === "speed"
        ? "⚡ SPEED BOOST!"
        : pwData.type === "double"
        ? "🪙 DOUBLE COINS!"
        : "🧲 MAGNET!";

    const pwText = this.add.text(pwData.x, pwData.y - 25, label, {
      fontFamily: "Inter, Roboto, sans-serif",
      fontSize: "15px",
      fontWeight: "900",
      color: "#38bdf8",
      stroke: "#0f172a",
      strokeThickness: 4,
    });
    pwText.setOrigin(0.5);

    this.tweens.add({
      targets: pwText,
      y: pwData.y - 65,
      alpha: 0,
      scale: 1.3,
      duration: 1000,
      ease: "Power2",
      onComplete: () => pwText.destroy(),
    });
  }

  handleCoinCollected(data) {
    if (!data) return;

    const isMe = data.playerId === this.socket?.id;
    const coinData = this.coinSprites.get(data.coinId);

    // If local player already picked this up locally, don't replay sound/FX
    if (isMe && coinData && coinData.collectedLocally) {
      if (coinData.container) coinData.container.destroy();
      this.coinSprites.delete(data.coinId);
      return;
    }

    if (isMe) {
      if (data.pointsAdded >= 20) {
        playSuperCoinSound();
        this.cameras.main.shake(150, 0.005);
      } else {
        playCoinSound();
      }
    }

    const playerSprite = this.playerSprites.get(data.playerId);
    if (playerSprite) {
      const popX = playerSprite.container.x;
      const popY = playerSprite.container.y - 25;

      const burst = this.add.particles(popX, popY, "glowParticle", {
        speed: { min: 40, max: 120 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: data.pointsAdded >= 20 ? 0xf472b6 : 0xfde047,
        lifespan: 400,
        blendMode: "ADD",
        emitting: false,
      });
      burst.explode(12);
      this.time.delayedCall(500, () => burst.destroy());

      const popText = this.add.text(popX, popY, `+${data.pointsAdded}`, {
        fontFamily: "Inter, Roboto, sans-serif",
        fontSize: "20px",
        fontWeight: "900",
        color: data.pointsAdded >= 20 ? "#f472b6" : "#fde047",
        stroke: "#0f172a",
        strokeThickness: 5,
      });
      popText.setOrigin(0.5);

      this.tweens.add({
        targets: popText,
        y: popY - 50,
        alpha: 0,
        scale: 1.5,
        duration: 850,
        ease: "Back.easeOut",
        onComplete: () => popText.destroy(),
      });
    }
  }

  handlePowerUpCollected(data) {
    if (!data) return;

    const isMe = data.playerId === this.socket?.id;
    if (isMe) {
      playPowerUpSound(data.type);
      this.cameras.main.shake(200, 0.008);
    }

    const playerSprite = this.playerSprites.get(data.playerId);
    if (playerSprite) {
      const label =
        data.type === "speed"
          ? "⚡ SPEED BOOST!"
          : data.type === "double"
          ? "🪙 DOUBLE COINS!"
          : "🧲 MAGNET!";

      const pwText = this.add.text(playerSprite.container.x, playerSprite.container.y - 35, label, {
        fontFamily: "Inter, Roboto, sans-serif",
        fontSize: "15px",
        fontWeight: "900",
        color: "#38bdf8",
        stroke: "#0f172a",
        strokeThickness: 4,
      });
      pwText.setOrigin(0.5);

      this.tweens.add({
        targets: pwText,
        y: playerSprite.container.y - 70,
        alpha: 0,
        scale: 1.3,
        duration: 1000,
        ease: "Power2",
        onComplete: () => pwText.destroy(),
      });
    }
  }

  // ── Complete Lifecycle Clean Up (Prevents Duplicate Socket Handlers & Memory Leaks) ──
  cleanUpScene() {
    if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener("keyup", this.onKeyUp);
    if (this.onWindowBlur) window.removeEventListener("blur", this.onWindowBlur);

    if (this.socket) {
      if (this.boundHandleGameState) this.socket.off("coinRush_gameState", this.boundHandleGameState);
      if (this.boundHandleCoinCollected) this.socket.off("coinRush_coinCollected", this.boundHandleCoinCollected);
      if (this.boundHandlePowerUpCollected) this.socket.off("coinRush_powerUpCollected", this.boundHandlePowerUpCollected);
    }

    if (this.input) {
      this.input.off("pointerdown", this.handleJoystickPointerDown, this);
      this.input.off("pointermove", this.handleJoystickPointerMove, this);
      this.input.off("pointerup", this.handleJoystickPointerUp, this);
      this.input.off("pointerupoutside", this.handleJoystickPointerUp, this);
    }
    if (this.joystickContainer) {
      this.joystickContainer.destroy();
      this.joystickContainer = null;
    }

    this.playerSprites.forEach((p) => {
      if (p.trailParticles) p.trailParticles.destroy();
      p.container.destroy();
    });
    this.playerSprites.clear();

    this.coinSprites.forEach((c) => c.container.destroy());
    this.coinSprites.clear();

    this.powerUpSprites.forEach((pw) => pw.container.destroy());
    this.powerUpSprites.clear();
  }
}
