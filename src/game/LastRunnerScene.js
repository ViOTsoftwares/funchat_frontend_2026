import Phaser from "phaser";

export default class LastRunnerScene extends Phaser.Scene {
  constructor() {
    super({ key: "LastRunnerScene" });

    // Scene variables
    this.socket = null;
    this.localPlayerId = null;
    this.roomId = null;

    // Track Geometry
    this.trackWidth = 420;
    this.laneX = [0, 0, 0]; // Calculated on create based on canvas width
    this.groundY = 560; // Base Y position where runners run

    // Visual Objects
    this.playerSprites = new Map(); // id -> { container, body, shadow, head, label, aura, shieldGfx, role, ... }
    this.obstacleSprites = new Map(); // id -> Container
    this.itemSprites = new Map(); // id -> Container
    this.projectileSprites = [];

    // Track grid lines
    this.gridLines = [];
    this.trackSpeed = 320;

    // Game state tracking
    this.localTargetLane = 1;
    this.isPaused = false;
    this.serverPlayers = [];
  }

  init(data) {
    this.socket = data.socket;
    this.localPlayerId = data.localPlayerId;
    this.roomId = data.roomId;
    this.initialTrack = data.initialTrack || [];
    this.onGameOver = data.onGameOver || (() => {});
    this.onItemCollected = data.onItemCollected || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.groundY = height - 120;

    // Calculate 3 lane X positions centered
    const centerX = width / 2;
    const laneSpacing = Math.min(130, width * 0.28);
    this.laneX = [centerX - laneSpacing, centerX, centerX + laneSpacing];

    // 1. Background Layers (Cyberpunk / Neon Endless Highway)
    this.createBackground(width, height);

    // 2. Track & Lane Lines
    this.createTrack(width, height);

    // 3. Setup Input Listeners
    this.setupInputs();

    // 4. Setup Socket Event Listeners
    this.setupSocketEvents();

    // 5. Particle Systems
    this.createParticleSystems();

    // 6. Spawn initial track if passed from lobby
    if (this.initialTrack && Array.isArray(this.initialTrack) && this.initialTrack.length > 0) {
      this.spawnTrackElements(this.initialTrack);
    }

    // Cleanup listeners when scene shuts down or is destroyed
    this.events.once("shutdown", this.shutdown, this);
    this.events.once("destroy", this.shutdown, this);
  }

  createBackground(width, height) {
    // Dark cyber gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x090d16, 0x090d16, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-20);

    // Distant neon horizon grid
    const horizonY = height * 0.25;
    const horizon = this.add.graphics();
    horizon.lineStyle(1, 0x6366f1, 0.25);
    for (let x = 0; x < width; x += 40) {
      horizon.lineBetween(x, horizonY, width / 2 + (x - width / 2) * 2.5, height);
    }
    horizon.setDepth(-10);

    // Side Cyber Pillars
    this.sideProps = [];
    for (let i = 0; i < 8; i++) {
      const propLeft = this.add.rectangle(this.laneX[0] - 100, i * 120, 16, 80, 0x3b82f6, 0.4);
      const propRight = this.add.rectangle(this.laneX[2] + 100, i * 120, 16, 80, 0xec4899, 0.4);
      propLeft.setDepth(1);
      propRight.setDepth(1);
      this.sideProps.push(propLeft, propRight);
    }
  }

  createTrack(width, height) {
    const trackGfx = this.add.graphics();

    // Main Road Surface
    const leftEdge = this.laneX[0] - 70;
    const rightEdge = this.laneX[2] + 70;
    const roadWidth = rightEdge - leftEdge;

    trackGfx.fillStyle(0x0f172a, 0.95);
    trackGfx.fillRect(leftEdge, 0, roadWidth, height);

    // Glowing Track Borders
    trackGfx.lineStyle(4, 0x6366f1, 0.8);
    trackGfx.lineBetween(leftEdge, 0, leftEdge, height);
    trackGfx.lineBetween(rightEdge, 0, rightEdge, height);
    trackGfx.setDepth(0);

    // Scrolling Horizontal Road Stripes
    this.roadStripes = [];
    for (let y = 0; y < height; y += 60) {
      const stripe = this.add.rectangle(width / 2, y, roadWidth - 10, 4, 0x1e293b, 0.8);
      stripe.setDepth(2);
      this.roadStripes.push(stripe);
    }

    // Lane Divider Dashes
    this.laneDividers = [];
    const divX1 = (this.laneX[0] + this.laneX[1]) / 2;
    const divX2 = (this.laneX[1] + this.laneX[2]) / 2;

    for (let y = 0; y < height; y += 50) {
      const d1 = this.add.rectangle(divX1, y, 4, 24, 0x818cf8, 0.6);
      const d2 = this.add.rectangle(divX2, y, 4, 24, 0x818cf8, 0.6);
      d1.setDepth(2);
      d2.setDepth(2);
      this.laneDividers.push(d1, d2);
    }
  }

  createParticleSystems() {
    // Canvas graphics texture for sparks and dust
    if (!this.textures.exists("sparkParticle")) {
      const canvas = document.createElement("canvas");
      canvas.width = 12;
      canvas.height = 12;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(6, 6, 5, 0, Math.PI * 2);
      ctx.fill();
      this.textures.addCanvas("sparkParticle", canvas);
    }
  }

  setupInputs() {
    // Keyboard Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Keyboard trigger listeners
    this.keyA.on("down", () => this.handleMoveLeft());
    this.cursors.left.on("down", () => this.handleMoveLeft());

    this.keyD.on("down", () => this.handleMoveRight());
    this.cursors.right.on("down", () => this.handleMoveRight());

    this.keyW.on("down", () => this.handleJump());
    this.cursors.up.on("down", () => this.handleJump());
    this.keySpace.on("down", () => this.handleJump());

    this.keyS.on("down", () => this.handleSlide());
    this.cursors.down.on("down", () => this.handleSlide());

    this.keyE.on("down", () => this.handleThrow());

    // Swipe gestures on mobile
    this.input.on("pointerdown", (pointer) => {
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
      this.touchStartTime = Date.now();
    });

    this.input.on("pointerup", (pointer) => {
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;
      const dt = Date.now() - this.touchStartTime;

      // Minimum swipe distance
      if (dt < 400 && (Math.abs(dx) > 30 || Math.abs(dy) > 30)) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -30) this.handleMoveLeft();
          else if (dx > 30) this.handleMoveRight();
        } else {
          if (dy < -30) this.handleJump();
          else if (dy > 30) this.handleSlide();
        }
      }
    });
  }

  setupSocketEvents() {
    if (!this.socket) return;
    this.removeSocketEvents();

    // Authoritative 20 TPS Game State
    this.onGameState = (data) => {
      if (this.isPaused) return;
      this.trackSpeed = data.baseSpeed || 320;
      this.serverPlayers = data.players || [];

      // If scene had no track yet, use track from gameState
      if (data.track && Array.isArray(data.track) && this.obstacleSprites.size === 0) {
        this.spawnTrackElements(data.track);
      }

      this.updatePlayerEntities(data.players || []);
    };

    // Track extension
    this.onTrackExtended = ({ newElements }) => {
      this.spawnTrackElements(newElements);
    };

    // Initial countdown & track
    this.onCountdown = (data) => {
      if (data.track && Array.isArray(data.track)) {
        if (this.obstacleSprites.size === 0) {
          this.spawnTrackElements(data.track);
        }
      }
    };

    // Player action animations (jump / slide)
    this.onPlayerAction = ({ playerId, action, durationMs }) => {
      this.animatePlayerAction(playerId, action, durationMs);
    };

    // Item collected
    this.onItemCollectedEvt = ({ playerId, itemType }) => {
      const sprite = this.playerSprites.get(playerId);
      if (sprite && sprite.container) {
        this.showFloatingNotice(sprite.container.x, sprite.container.y - 60, `+ ${itemType.toUpperCase()}!`, 0xf59e0b);
      }
      if (playerId === this.localPlayerId) {
        this.onItemCollected(itemType);
      }
    };

    // Projectile Thrown
    this.onItemThrown = ({ senderId, targetId, itemType, flightTimeMs }) => {
      this.spawnProjectile(senderId, targetId, itemType, flightTimeMs);
    };

    // Projectile Hit
    this.onItemHit = ({ targetId, itemType, slowPercent }) => {
      this.handleProjectileHit(targetId, itemType, slowPercent);
    };

    // Attack Blocked by Shield
    this.onAttackBlocked = ({ targetId, blockedItem }) => {
      const sprite = this.playerSprites.get(targetId);
      if (sprite && sprite.container) {
        this.cameras.main.shake(150, 0.005);
        this.showFloatingNotice(sprite.container.x, sprite.container.y - 70, "🛡️ SHIELD BLOCKED!", 0x38bdf8);
      }
    };

    // Elimination
    this.onPlayerEliminatedEvt = ({ playerId, playerName, reason }) => {
      this.handlePlayerEliminated(playerId, playerName, reason);
    };

    this.socket.on("lastRunner_gameState", this.onGameState);
    this.socket.on("lastRunner_trackExtended", this.onTrackExtended);
    this.socket.on("lastRunner_countdown", this.onCountdown);
    this.socket.on("lastRunner_playerAction", this.onPlayerAction);
    this.socket.on("lastRunner_itemCollected", this.onItemCollectedEvt);
    this.socket.on("lastRunner_itemThrown", this.onItemThrown);
    this.socket.on("lastRunner_itemHit", this.onItemHit);
    this.socket.on("lastRunner_attackBlocked", this.onAttackBlocked);
    this.socket.on("lastRunner_playerEliminated", this.onPlayerEliminatedEvt);
  }

  removeSocketEvents() {
    if (!this.socket) return;
    if (this.onGameState) this.socket.off("lastRunner_gameState", this.onGameState);
    if (this.onTrackExtended) this.socket.off("lastRunner_trackExtended", this.onTrackExtended);
    if (this.onCountdown) this.socket.off("lastRunner_countdown", this.onCountdown);
    if (this.onPlayerAction) this.socket.off("lastRunner_playerAction", this.onPlayerAction);
    if (this.onItemCollectedEvt) this.socket.off("lastRunner_itemCollected", this.onItemCollectedEvt);
    if (this.onItemThrown) this.socket.off("lastRunner_itemThrown", this.onItemThrown);
    if (this.onItemHit) this.socket.off("lastRunner_itemHit", this.onItemHit);
    if (this.onAttackBlocked) this.socket.off("lastRunner_attackBlocked", this.onAttackBlocked);
    if (this.onPlayerEliminatedEvt) this.socket.off("lastRunner_playerEliminated", this.onPlayerEliminatedEvt);
  }

  shutdown() {
    this.removeSocketEvents();
    this.clearTrackElements();
    for (const [, s] of this.playerSprites) {
      if (s.container) s.container.destroy();
    }
    this.playerSprites.clear();
  }

  // ── Input Action Handlers ──
  handleMoveLeft() {
    if (this.localTargetLane > 0) {
      this.localTargetLane -= 1;
      this.socket?.emit("lastRunner_playerInput", { action: "left" });
    }
  }

  handleMoveRight() {
    if (this.localTargetLane < 2) {
      this.localTargetLane += 1;
      this.socket?.emit("lastRunner_playerInput", { action: "right" });
    }
  }

  handleJump() {
    this.socket?.emit("lastRunner_playerInput", { action: "jump" });
  }

  handleSlide() {
    this.socket?.emit("lastRunner_playerInput", { action: "slide" });
  }

  handleThrow() {
    this.socket?.emit("lastRunner_throwItem");
  }

  // ── Track Elements Spawning ──
  spawnTrackElements(elements) {
    if (!elements || !Array.isArray(elements)) return;

    for (const elem of elements) {
      if (this.obstacleSprites.has(elem.id) || this.itemSprites.has(elem.id)) continue;

      const laneIdx = Phaser.Math.Clamp(elem.lane ?? 1, 0, 2);
      const laneX = this.laneX[laneIdx];
      // Initial Y position off top of screen relative to current distance
      const initialY = -200;

      if (elem.category === "obstacle") {
        const container = this.add.container(laneX, initialY);
        container.setDepth(10);

        let gfx = this.add.graphics();
        if (elem.type === "barrier") {
          // 🚧 Barrier (requires jump)
          gfx.fillStyle(0xef4444, 1);
          gfx.fillRoundedRect(-35, -25, 70, 40, 8);
          gfx.lineStyle(3, 0xfacc15, 1);
          gfx.strokeRoundedRect(-35, -25, 70, 40, 8);

          // Warning hazard stripes
          const label = this.add.text(0, -5, "🚧 JUMP", {
            fontSize: "12px",
            fontFamily: "monospace",
            fontStyle: "bold",
            color: "#ffffff",
          }).setOrigin(0.5);
          container.add([gfx, label]);
        } else if (elem.type === "low") {
          // Low spikes / hurdle (requires jump)
          gfx.fillStyle(0xf97316, 1);
          gfx.fillTriangle(-35, 15, 0, -20, 35, 15);
          gfx.lineStyle(2, 0xffedd5, 1);
          gfx.strokeTriangle(-35, 15, 0, -20, 35, 15);

          const label = this.add.text(0, -28, "▲ JUMP", {
            fontSize: "11px",
            fontStyle: "bold",
            color: "#fdba74",
          }).setOrigin(0.5);
          container.add([gfx, label]);
        } else if (elem.type === "overhead") {
          // High overhead laser beam / steel beam (requires slide)
          gfx.fillStyle(0x8b5cf6, 0.9);
          gfx.fillRect(-50, -50, 100, 18);
          gfx.lineStyle(2, 0xc084fc, 1);
          gfx.strokeRect(-50, -50, 100, 18);

          // Danger beam
          const beam = this.add.rectangle(0, -41, 96, 6, 0xec4899, 1);
          const label = this.add.text(0, -68, "⚡ SLIDE ⚡", {
            fontSize: "11px",
            fontStyle: "bold",
            color: "#f472b6",
          }).setOrigin(0.5);
          container.add([gfx, beam, label]);
        }

        container.elemData = elem;
        this.obstacleSprites.set(elem.id, container);
      } else if (elem.category === "item") {
        const container = this.add.container(laneX, initialY);
        container.setDepth(10);

        // Glow ring
        const ring = this.add.circle(0, 0, 22, 0xffffff, 0.15);
        let iconChar = "🥚";

        if (elem.type === "ice") {
          iconChar = "🧊";
        } else if (elem.type === "bomb") {
          iconChar = "💣";
        } else if (elem.type === "shield") {
          iconChar = "🛡️";
        }

        const icon = this.add.text(0, 0, iconChar, { fontSize: "24px" }).setOrigin(0.5);
        container.add([ring, icon]);

        // Hover bobbing tween
        this.tweens.add({
          targets: icon,
          y: -6,
          duration: 400,
          yoyo: true,
          repeat: -1,
        });

        container.elemData = elem;
        this.itemSprites.set(elem.id, container);
      }
    }
  }

  clearTrackElements() {
    for (const [, obs] of this.obstacleSprites) obs.destroy();
    this.obstacleSprites.clear();
    for (const [, itm] of this.itemSprites) itm.destroy();
    this.itemSprites.clear();
  }

  // ── Synchronize Players ──
  updatePlayerEntities(players) {
    const activeIds = new Set(players.map((p) => p.id));

    // Remove disconnected player sprites
    for (const [id, spriteObj] of this.playerSprites) {
      if (!activeIds.has(id)) {
        spriteObj.container.destroy();
        this.playerSprites.delete(id);
      }
    }

    // Determine reference local player distance to scroll world objects
    const localData = players.find((p) => p.id === this.localPlayerId) || players[0];
    const localDist = localData ? localData.distance : 0;

    for (const p of players) {
      let spriteObj = this.playerSprites.get(p.id);

      if (!spriteObj) {
        spriteObj = this.createPlayerSprite(p);
        this.playerSprites.set(p.id, spriteObj);
      }

      // Smooth horizontal interpolation towards lane X
      const laneIdx = Phaser.Math.Clamp(p.lane ?? 1, 0, 2);
      const targetX = this.laneX[laneIdx];
      spriteObj.container.x = Phaser.Math.Linear(spriteObj.container.x, targetX, 0.35);

      // Distance offset relative to local player
      // If opponent is ahead, they are visually higher on screen; if behind, visually lower
      const distOffset = (p.distance - localDist) * 0.8;
      const targetY = Phaser.Math.Clamp(this.groundY - distOffset, 180, this.groundY + 80);
      spriteObj.container.y = Phaser.Math.Linear(spriteObj.container.y, targetY, 0.25);

      // Shield visual state
      spriteObj.shieldGfx.setVisible(Boolean(p.hasShield));

      // Slow debuff visual indicator (using dedicated slowAura circle instead of clearTint on Graphics)
      if (p.isSlowed) {
        spriteObj.slowAura.setVisible(true);
        const auraColor = (p.slowPercent || 0) > 50 ? 0x06b6d4 : 0xf59e0b;
        spriteObj.slowAura.setFillStyle(auraColor, 0.3);
        spriteObj.slowAura.setStrokeStyle(3, auraColor, 0.9);
      } else {
        spriteObj.slowAura.setVisible(false);
      }

      // If eliminated, animate tumble
      if (p.eliminated && !spriteObj.eliminated) {
        spriteObj.eliminated = true;
        this.tweens.add({
          targets: spriteObj.container,
          alpha: 0.3,
          scale: 0.7,
          angle: 90,
          duration: 400,
        });
      }
    }

    // Update track elements Y positions relative to local player's distance
    for (const [id, obs] of this.obstacleSprites) {
      const distFromPlayer = obs.elemData.distance - localDist;
      // Convert distance to canvas Y coordinates:
      // distFromPlayer = 0 -> groundY
      // distFromPlayer > 0 -> higher up on screen (coming towards player)
      obs.y = this.groundY - distFromPlayer * 1.0;

      // Despawn once scrolled well past player
      if (obs.y > this.scale.height + 150) {
        obs.destroy();
        this.obstacleSprites.delete(id);
      }
    }

    for (const [id, itm] of this.itemSprites) {
      if (itm.elemData.collected) {
        itm.destroy();
        this.itemSprites.delete(id);
        continue;
      }
      const distFromPlayer = itm.elemData.distance - localDist;
      itm.y = this.groundY - distFromPlayer * 1.0;

      if (itm.y > this.scale.height + 150) {
        itm.destroy();
        this.itemSprites.delete(id);
      }
    }
  }

  createPlayerSprite(player) {
    const isLocal = player.id === this.localPlayerId;
    const isP1 = player.role === "p1";
    const primaryColor = isP1 ? 0x06b6d4 : 0xf43f5e; // Cyan vs Coral Red

    const laneIdx = Phaser.Math.Clamp(player.lane ?? 1, 0, 2);
    const container = this.add.container(this.laneX[laneIdx], this.groundY);
    container.setDepth(20);

    // 1. Runner Shadow
    const shadow = this.add.ellipse(0, 32, 44, 16, 0x000000, 0.45);

    // Slow effect aura ring
    const slowAura = this.add.circle(0, 0, 34, 0x06b6d4, 0.25);
    slowAura.setStrokeStyle(3, 0x06b6d4, 0.9);
    slowAura.setVisible(false);

    // 2. Runner Body (stylized sci-fi runner)
    const bodyGfx = this.add.graphics();
    bodyGfx.fillStyle(primaryColor, 1);
    bodyGfx.fillRoundedRect(-16, -24, 32, 48, 10);
    bodyGfx.lineStyle(2, 0xffffff, 0.9);
    bodyGfx.strokeRoundedRect(-16, -24, 32, 48, 10);

    // Visor
    const visor = this.add.rectangle(0, -12, 20, 8, 0xffffff, 0.95);

    // Running bobbing legs
    const legL = this.add.rectangle(-8, 22, 6, 14, primaryColor);
    const legR = this.add.rectangle(8, 22, 6, 14, primaryColor);

    // 3. Name & Role Tag
    const nameLabel = this.add.text(0, -42, isLocal ? "YOU" : player.name, {
      fontSize: "12px",
      fontFamily: "sans-serif",
      fontStyle: "bold",
      color: isLocal ? "#38bdf8" : "#f43f5e",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 4. Shield Aura Ring
    const shieldGfx = this.add.graphics();
    shieldGfx.lineStyle(4, 0x38bdf8, 0.85);
    shieldGfx.strokeCircle(0, 0, 38);
    shieldGfx.fillStyle(0x38bdf8, 0.15);
    shieldGfx.fillCircle(0, 0, 38);
    shieldGfx.setVisible(false);

    container.add([shadow, slowAura, shieldGfx, legL, legR, bodyGfx, visor, nameLabel]);

    // Running bobbing motion
    this.tweens.add({
      targets: [bodyGfx, visor],
      y: -2,
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    return {
      container,
      body: bodyGfx,
      shadow,
      slowAura,
      shieldGfx,
      legL,
      legR,
      nameLabel,
      role: player.role,
      eliminated: false,
    };
  }

  // ── Animate Player Action (Jump / Slide) ──
  animatePlayerAction(playerId, action, durationMs) {
    const sprite = this.playerSprites.get(playerId);
    if (!sprite) return;

    if (action === "jump") {
      // Elevate body upwards and scale shadow
      this.tweens.add({
        targets: [sprite.body, sprite.legL, sprite.legR, sprite.nameLabel],
        y: "-=75",
        scaleX: 1.1,
        scaleY: 1.1,
        duration: durationMs * 0.45,
        yoyo: true,
        ease: "Cubic.easeOut",
      });

      this.tweens.add({
        targets: sprite.shadow,
        scaleX: 0.6,
        scaleY: 0.6,
        alpha: 0.2,
        duration: durationMs * 0.45,
        yoyo: true,
      });
    } else if (action === "slide") {
      // Flatten body into slide pose
      this.tweens.add({
        targets: [sprite.body, sprite.legL, sprite.legR],
        scaleY: 0.45,
        scaleX: 1.35,
        y: "+=12",
        duration: durationMs * 0.5,
        yoyo: true,
        ease: "Back.easeOut",
      });
    }
  }

  // ── Projectile Throwing Animation ──
  spawnProjectile(senderId, targetId, itemType, flightTimeMs) {
    const sender = this.playerSprites.get(senderId);
    const target = this.playerSprites.get(targetId);
    if (!sender || !target) return;

    let iconChar = "🥚";
    if (itemType === "ice") iconChar = "🧊";
    if (itemType === "bomb") iconChar = "💣";

    const proj = this.add.text(sender.container.x, sender.container.y - 20, iconChar, {
      fontSize: "26px",
    }).setOrigin(0.5);
    proj.setDepth(25);

    // Arc trajectory towards target
    this.tweens.add({
      targets: proj,
      x: target.container.x,
      y: target.container.y - 20,
      angle: 360,
      duration: flightTimeMs,
      ease: "Quad.easeIn",
      onComplete: () => {
        proj.destroy();
      },
    });
  }

  // ── Projectile Hit Impact Effects ──
  handleProjectileHit(targetId, itemType, slowPercent) {
    const target = this.playerSprites.get(targetId);
    if (!target) return;

    // Screen shake on bomb
    if (itemType === "bomb") {
      this.cameras.main.shake(250, 0.015);
    } else {
      this.cameras.main.shake(120, 0.006);
    }

    // Floating text indicator
    const noticeText = itemType === "bomb" ? "💣 BOOM! -70%" : itemType === "ice" ? "🧊 FROZEN -60%" : "🥚 MUD -40%";
    const noticeColor = itemType === "bomb" ? 0xef4444 : itemType === "ice" ? 0x38bdf8 : 0xd97706;

    this.showFloatingNotice(target.container.x, target.container.y - 65, noticeText, noticeColor);
  }

  // ── Player Eliminated ──
  handlePlayerEliminated(playerId, playerName, reason) {
    const sprite = this.playerSprites.get(playerId);
    this.cameras.main.shake(300, 0.02);

    if (sprite) {
      this.showFloatingNotice(sprite.container.x, sprite.container.y - 80, `💥 ${playerName} CRASHED!`, 0xef4444);
    }
  }

  // ── Helper: Floating Combat Text ──
  showFloatingNotice(x, y, text, colorHex) {
    const label = this.add.text(x, y, text, {
      fontSize: "15px",
      fontStyle: "bold",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);
    label.setDepth(30);

    this.tweens.add({
      targets: label,
      y: y - 45,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  update(time, delta) {
    if (this.isPaused) return;

    // Dynamic Scrolling Speed (convert px/s to delta speed)
    const scrollDelta = (this.trackSpeed * (delta / 1000));

    // Scroll road stripes downwards to give continuous forward motion illusion
    for (const stripe of this.roadStripes) {
      stripe.y += scrollDelta;
      if (stripe.y > this.scale.height) {
        stripe.y -= this.scale.height;
      }
    }

    // Scroll lane dividers
    for (const d of this.laneDividers) {
      d.y += scrollDelta;
      if (d.y > this.scale.height) {
        d.y -= this.scale.height;
      }
    }

    // Scroll side props
    for (const p of this.sideProps) {
      p.y += scrollDelta * 0.8;
      if (p.y > this.scale.height + 40) {
        p.y -= this.scale.height + 120;
      }
    }
  }
}
