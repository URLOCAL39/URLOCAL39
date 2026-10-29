import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AvatarModel, AvatarCustomization, DEFAULT_AVATAR } from './avatar';
import { PhysicsWorld, DynaBlock, BlockShape } from './physics';
import { WorldBuilder, WorldId, WORLDS, WorldDef } from './worlds';
import { TOOLS, ToolType, ToolVisuals } from './tools';
import { CLASSIC_COLORS } from './textures';
import { sounds } from './audio';
import { MultiplayerServerSim, ChatLogEntry } from './multiplayer';

export interface ConnectedPlayerInfo {
  id: string;
  name: string;
  color: string;
  ping: number;
  tix: number;
  blocksPlaced: number;
  wipeouts: number;
  isHost?: boolean;
}

export interface GameStats {
  health: number;
  tix: number;
  blocksPlaced: number;
  wipeouts: number;
  activeTool: ToolType;
  activeColor: string;
  activeShape: BlockShape;
  isAnchored: boolean;
  currentWorld: WorldId;
  isPaused: boolean;
  isVictory: boolean;
  fps: number;
  isPointerLocked: boolean;
  onlinePlayers: ConnectedPlayerInfo[];
  chatFeed: ChatLogEntry[];
}

export class DynaGameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public isSoftwareGl: boolean;

  // Game Systems
  public physics: PhysicsWorld;
  public avatar: AvatarModel;
  public avatarCustomization: AvatarCustomization;
  public multiplayer: MultiplayerServerSim;
  public currentWorldId: WorldId = 'crossroads';
  private victoryTriggerPos?: THREE.Vector3;
  private currentCheckPoint: THREE.Vector3 = new THREE.Vector3(0, 2, 0);

  // Player Kinematics
  public playerPos: THREE.Vector3 = new THREE.Vector3(0, 2, 12);
  public playerVel: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = false;
  private coyoteTimer: number = 0;
  private jumpBuffer: number = 0;
  private playerRotation: number = 0;
  private health: number = 100;
  private tix: number = 25;
  private blocksPlaced: number = 0;
  private wipeouts: number = 0;

  // Camera Orbit
  public cameraPitch: number = 0.35;
  public cameraYaw: number = 0;
  public cameraDist: number = 14;
  private cameraShake: number = 0;
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  public isPointerLocked: boolean = false;
  private mouseDragDist: number = 0;
  private mousePos: THREE.Vector2 = new THREE.Vector2();
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  // Input
  private keysHeld: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();

  // Active Tool & Building
  public activeTool: ToolType = 'grab';
  public activeColorHex: string = '#f5cd2f';
  public activeShape: BlockShape = 'brick';
  public placeAnchored: boolean = true;
  private toolCooldown: number = 0;
  private grabbedBlock: DynaBlock | null = null;
  private grabDistance: number = 10;
  private stamperRotationAngle: number = 0;

  // Build Preview Mesh
  private previewMesh: THREE.Mesh | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // State
  public isPaused: boolean = false;
  public isVictory: boolean = false;
  public isTitleScreen: boolean = true;
  private frameId: number = 0;
  private lastTime: number = 0;
  private fpsCounter: number = 60;
  private fpsTick: number = 0;
  private fpsFrames: number = 0;

  // Callbacks
  public onStatsChange?: (stats: GameStats) => void;

  constructor(container: HTMLElement, customization: AvatarCustomization = DEFAULT_AVATAR) {
    this.container = container;

    // Detect software WebGL per Three.js skill guidelines
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // 2. Studio Environment & Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.setupLighting();

    // 3. Physics & Avatar
    this.physics = new PhysicsWorld(this.scene, this.renderer);
    this.avatarCustomization = { ...customization };
    this.avatar = new AvatarModel(customization);
    this.scene.add(this.avatar.group);

    // 4. Multiplayer Server Simulation
    this.multiplayer = new MultiplayerServerSim(this.scene, this.physics, this.playerPos, customization.name);
    this.multiplayer.onPlayersUpdated = () => this.notifyStats();
    this.multiplayer.onChatLogUpdated = () => this.notifyStats();

    // 5. Build Initial World
    this.loadWorld('crossroads');

    // 6. Initialize Tool Preview Mesh
    this.createStamperPreview();
    this.updateHeldToolVisual();

    // 7. Bind Listeners
    this.bindEvents();

    // 8. Start Render Loop
    this.lastTime = performance.now();
    this.animate();
  }

  private setupLighting() {
    // Warm Key Light with tight shadow bounds
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    keyLight.position.set(35, 60, 35);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 150;
      const d = 50;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cool Sky & Warm Ground Fill (HemisphereLight)
    const hemiLight = new THREE.HemisphereLight(0x8ec7f5, 0x4a3c28, 0.85);
    this.scene.add(hemiLight);

    // Soft Rim Light
    const rimLight = new THREE.DirectionalLight(0x9bc2e6, 0.5);
    rimLight.position.set(-30, 25, -30);
    this.scene.add(rimLight);
  }

  public loadWorld(worldId: WorldId) {
    this.currentWorldId = worldId;
    const worldDef = WORLDS.find((w) => w.id === worldId) || WORLDS[0];

    // Background & Fog
    this.scene.background = new THREE.Color(worldDef.skyColor);
    this.scene.fog = new THREE.FogExp2(worldDef.fogColor, 0.008);

    // Rebuild world geometry
    const result = WorldBuilder.buildWorld(worldId, this.physics, this.scene, this.renderer);
    this.victoryTriggerPos = result.victoryTriggerPos;
    this.currentCheckPoint = result.checkPoints?.[0] || worldDef.spawnPos.clone();

    // Reset player position & multiplayer bots
    this.respawnPlayer();
    this.multiplayer.resetPlayers(this.currentCheckPoint);
    this.isVictory = false;
    this.notifyStats();
  }

  public restartMap() {
    this.loadWorld(this.currentWorldId);
    sounds.playSnap();
    this.notifyStats();
  }

  public respawnPlayer(withOof: boolean = false) {
    if (withOof) {
      this.avatar.triggerOof();
      this.cameraShake = 0.4;
      this.physics.spawnDeleteSparkles(this.playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    this.playerPos.copy(this.currentCheckPoint);
    this.playerVel.set(0, 0, 0);
    this.health = 100;
    this.avatar.updateNametag(this.health);
    this.notifyStats();
  }

  private createStamperPreview() {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
    }

    const geo = new THREE.BoxGeometry(2, 1.2, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.previewMesh = new THREE.Mesh(geo, mat);
    this.previewMesh.visible = false;
    this.scene.add(this.previewMesh);
  }

  public setTool(tool: ToolType) {
    this.activeTool = tool;
    sounds.playEquip();
    this.updateHeldToolVisual();
    if (this.previewMesh) {
      this.previewMesh.visible = tool === 'build';
    }
    this.notifyStats();
  }

  public setColor(hex: string) {
    this.activeColorHex = hex;
    this.updateHeldToolVisual();
    this.notifyStats();
  }

  public setShape(shape: BlockShape) {
    this.activeShape = shape;
    if (this.previewMesh) {
      let geo: THREE.BufferGeometry;
      if (shape === 'cylinder') geo = new THREE.CylinderGeometry(1, 1, 1.2, 16);
      else if (shape === 'sphere') geo = new THREE.SphereGeometry(1, 16, 12);
      else geo = new THREE.BoxGeometry(2, 1.2, 4);
      this.previewMesh.geometry.dispose();
      this.previewMesh.geometry = geo;
    }
    this.notifyStats();
  }

  public toggleAnchored() {
    this.placeAnchored = !this.placeAnchored;
    this.notifyStats();
  }

  private updateHeldToolVisual() {
    // Clear tool mount
    while (this.avatar.heldToolGroup.children.length > 0) {
      this.avatar.heldToolGroup.remove(this.avatar.heldToolGroup.children[0]);
    }
    const mesh = ToolVisuals.createHeldToolMesh(this.activeTool, this.activeColorHex);
    this.avatar.heldToolGroup.add(mesh);
  }

  public sendChat(text: string) {
    this.avatar.showChatBubble(text);
    this.multiplayer.handleUserChatMessage(this.avatarCustomization.name, text);
  }

  public updateCustomization(customization: AvatarCustomization) {
    this.avatarCustomization = { ...customization };
    this.avatar.setCustomization(customization);
    this.notifyStats();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    this.container.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('resize', this.onResize);
  }

  public togglePointerLock() {
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    } else {
      this.renderer.domElement.requestPointerLock().catch(() => {});
    }
  }

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.notifyStats();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Ignore input if user is typing in chat or another input element
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return;
    }

    const key = e.key.toLowerCase();
    this.keysHeld.add(key);
    this.justPressedKeys.add(key);

    // Number keys for tools 1-7
    if (e.key >= '1' && e.key <= '7') {
      const idx = parseInt(e.key) - 1;
      if (idx < TOOLS.length) {
        this.setTool(TOOLS[idx].id);
      }
    }

    // R key rotates building block or grabbed block
    if (key === 'r') {
      this.stamperRotationAngle = (this.stamperRotationAngle + Math.PI / 2) % (Math.PI * 2);
      if (this.grabbedBlock) {
        this.grabbedBlock.mesh.rotation.y += Math.PI / 2;
      }
    }

    // L key toggles Shift-Lock / Free Mouse-Look
    if (key === 'l') {
      this.togglePointerLock();
    }

    // Space key on Title Screen starts the game!
    if (this.isTitleScreen && (e.code === 'Space' || e.code === 'Enter')) {
      this.isTitleScreen = false;
      this.notifyStats();
    }

    // Escape pauses/unpauses
    if (e.key === 'Escape' && !this.isTitleScreen) {
      this.isPaused = !this.isPaused;
      this.notifyStats();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.key.toLowerCase());
  };

  private onWindowBlur = () => {
    this.keysHeld.clear();
    this.justPressedKeys.clear();
    this.isMouseDown = false;
    this.isRightMouseDown = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.isTitleScreen) {
      this.isTitleScreen = false;
      this.notifyStats();
      return;
    }

    this.mouseDragDist = 0;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (e.button === 2) {
      this.isRightMouseDown = true;
    } else if (e.button === 0) {
      this.isMouseDown = true;
      // In pointer lock mode, immediately trigger tool on click at center crosshair
      if (this.isPointerLocked) {
        this.triggerActiveToolAction();
      }
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isRightMouseDown = false;
    } else if (e.button === 0) {
      // In normal mode, if the mouse was simply clicked without dragging the camera, fire tool action
      if (!this.isPointerLocked) {
        if (this.mouseDragDist < 8) {
          this.triggerActiveToolAction();
        }
      }
      this.isMouseDown = false;
      if (this.activeTool === 'grab' && this.grabbedBlock) {
        // Drop grabbed block with throw momentum
        this.grabbedBlock = null;
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    // 1. If Pointer Lock (Free Mouse Look) is active, moving the mouse directly rotates the camera!
    if (this.isPointerLocked) {
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      this.cameraYaw -= dx * 0.0035;
      this.cameraPitch = Math.max(0.08, Math.min(1.4, this.cameraPitch + dy * 0.0035));
      this.mousePos.set(0, 0);
      return;
    }

    // 2. Standard Viewport Mouse Tracking
    const rect = this.container.getBoundingClientRect();
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // 3. When hitting/holding ANY mouse button (Left click OR Right click), dragging moves the camera!
    if (this.isMouseDown || this.isRightMouseDown) {
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.mouseDragDist += Math.abs(dx) + Math.abs(dy);

      this.cameraYaw -= dx * 0.0065;
      this.cameraPitch = Math.max(0.08, Math.min(1.4, this.cameraPitch + dy * 0.0065));
    }

    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  };

  private onWheel = (e: WheelEvent) => {
    this.cameraDist = Math.max(4, Math.min(36, this.cameraDist + e.deltaY * 0.015));
  };

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private triggerActiveToolAction() {
    if (this.toolCooldown > 0) return;

    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const blockMeshes = this.physics.blocks.map((b) => b.mesh);
    const baseplate = this.scene.getObjectByName('Baseplate');
    const interactables = baseplate ? [...blockMeshes, baseplate] : blockMeshes;

    const intersects = this.raycaster.intersectObjects(interactables, false);

    if (this.activeTool === 'rocket') {
      // Fire rocket towards ray direction
      const forward = this.raycaster.ray.direction.clone();
      const spawnPos = this.avatar.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)).add(forward.clone().multiplyScalar(1.5));
      this.physics.fireRocket(spawnPos, forward);
      this.toolCooldown = 0.55;
      // Kickback
      this.avatar.rightArmGroup.rotation.x = -2.2;
    } else if (this.activeTool === 'build') {
      if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
        const hitPoint = hit.point.clone().add(normal.clone().multiplyScalar(0.6));

        // Snap to 1-stud grid
        const snapX = Math.round(hitPoint.x);
        const snapZ = Math.round(hitPoint.z);
        const snapY = Math.max(0.6, Math.round(hitPoint.y * 10) / 10);

        this.physics.addBlock({
          position: new THREE.Vector3(snapX, snapY, snapZ),
          size: new THREE.Vector3(2, 1.2, 4),
          shape: this.activeShape,
          color: this.activeColorHex,
          isAnchored: this.placeAnchored,
        });

        sounds.playSnap();
        this.blocksPlaced++;
        this.tix += 2;
        this.toolCooldown = 0.2;
        this.notifyStats();
      }
    } else if (this.activeTool === 'paint') {
      if (intersects.length > 0) {
        const hitBlock = this.findBlockFromMesh(intersects[0].object);
        if (hitBlock) {
          hitBlock.setColor(this.activeColorHex);
          sounds.playSnap();
        }
      }
    } else if (this.activeTool === 'delete') {
      if (intersects.length > 0) {
        const hitBlock = this.findBlockFromMesh(intersects[0].object);
        if (hitBlock) {
          this.physics.spawnDeleteSparkles(hitBlock.mesh.position);
          this.physics.removeBlock(hitBlock.id);
        }
      }
    } else if (this.activeTool === 'tnt') {
      // Place TNT in front of character
      const forward = new THREE.Vector3(Math.sin(this.playerRotation), 0, Math.cos(this.playerRotation));
      const pos = this.playerPos.clone().add(forward.multiplyScalar(3)).setY(1.0);
      const tnt = this.physics.addBlock({
        position: pos,
        size: new THREE.Vector3(2, 2, 2),
        shape: 'tnt',
        isAnchored: false,
      });
      tnt.ignite();
      sounds.playSnap();
      this.toolCooldown = 0.8;
    } else if (this.activeTool === 'sword') {
      sounds.playSwordSlash();
      this.avatar.rightArmGroup.rotation.x = -2.4;
      this.toolCooldown = 0.35;

      // Melee hit unanchored blocks in front
      const forward = new THREE.Vector3(Math.sin(this.playerRotation), 0, Math.cos(this.playerRotation));
      const slashCenter = this.playerPos.clone().add(forward.multiplyScalar(2.5)).setY(1.5);

      for (const block of this.physics.blocks) {
        if (!block.isAnchored && block.mesh.position.distanceTo(slashCenter) < 4.0) {
          const push = block.mesh.position.clone().sub(this.playerPos).normalize().multiplyScalar(18);
          push.y = 8;
          block.velocity.add(push);
          block.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        }
      }
    } else if (this.activeTool === 'grab') {
      if (intersects.length > 0) {
        const hitBlock = this.findBlockFromMesh(intersects[0].object);
        if (hitBlock) {
          hitBlock.isAnchored = false; // Grab unanchors it!
          this.grabbedBlock = hitBlock;
          this.grabDistance = Math.min(18, hitBlock.mesh.position.distanceTo(this.playerPos));
        }
      }
    }
  }

  private findBlockFromMesh(object: THREE.Object3D): DynaBlock | null {
    if (object.userData && object.userData.dynaBlock) {
      return object.userData.dynaBlock as DynaBlock;
    }
    return null;
  }

  private updatePlayer(dt: number) {
    // 1. Movement Inputs relative to Camera Yaw
    const moveX = (this.keysHeld.has('d') || this.keysHeld.has('arrowright') ? 1 : 0) -
                  (this.keysHeld.has('a') || this.keysHeld.has('arrowleft') ? 1 : 0);
    const moveZ = (this.keysHeld.has('s') || this.keysHeld.has('arrowdown') ? 1 : 0) -
                  (this.keysHeld.has('w') || this.keysHeld.has('arrowup') ? 1 : 0);

    const isMoving = moveX !== 0 || moveZ !== 0;
    const isShiftRunning = this.keysHeld.has('shift');
    const speed = (isShiftRunning ? 16.0 : 11.5);

    // Camera forward vector projected on horizontal plane
    const camForward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
    const camRight = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

    const wishDir = new THREE.Vector3();
    if (isMoving) {
      wishDir.addScaledVector(camRight, moveX);
      wishDir.addScaledVector(camForward, -moveZ);
      wishDir.normalize();

      // Smooth rotate player towards movement
      const targetAngle = Math.atan2(wishDir.x, wishDir.z);
      this.playerRotation = THREE.MathUtils.damp(this.playerRotation, targetAngle, 16, dt);
    }

    // Horizontal velocity acceleration and friction
    const targetVelX = wishDir.x * speed;
    const targetVelZ = wishDir.z * speed;
    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVelX, isMoving ? 14 : 10, dt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVelZ, isMoving ? 14 : 10, dt);

    // 2. Jump & Coyote Time
    if (this.isGrounded) {
      this.coyoteTimer = 0.15;
    } else {
      this.coyoteTimer -= dt;
    }

    if (this.justPressedKeys.has(' ')) {
      this.jumpBuffer = 0.15;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
    }

    if (this.jumpBuffer > 0 && this.coyoteTimer > 0) {
      this.playerVel.y = 15.0; // Jump force!
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      sounds.playJump();
    }

    // Apply Gravity
    this.playerVel.y += this.physics.gravity * dt;

    // Apply Velocity to Position
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.y += this.playerVel.y * dt;
    this.playerPos.z += this.playerVel.z * dt;

    // 3. Collision Resolution against Baseplate & Blocks
    this.isGrounded = false;

    // Baseplate ground floor (y = 0)
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    // Collision against DynaBlocks
    const pRadius = 0.8;
    const pHeight = 2.8;

    for (const block of this.physics.blocks) {
      const bPos = block.mesh.position;
      const halfX = block.size.x * 0.5;
      const halfY = block.size.y * 0.5;
      const halfZ = block.size.z * 0.5;

      const closestX = Math.max(bPos.x - halfX, Math.min(this.playerPos.x, bPos.x + halfX));
      const closestY = Math.max(bPos.y - halfY, Math.min(this.playerPos.y + pHeight * 0.5, bPos.y + halfY));
      const closestZ = Math.max(bPos.z - halfZ, Math.min(this.playerPos.z, bPos.z + halfZ));

      const dx = this.playerPos.x - closestX;
      const dy = (this.playerPos.y + pHeight * 0.5) - closestY;
      const dz = this.playerPos.z - closestZ;

      const distSq = dx * dx + dz * dz;

      // Horizontal cylinder collision
      if (distSq < pRadius * pRadius && Math.abs(dy) < (halfY + pHeight * 0.5)) {
        // Check if standing on top of block
        if (this.playerPos.y >= bPos.y + halfY - 0.35 && this.playerVel.y <= 0) {
          this.playerPos.y = bPos.y + halfY;
          this.playerVel.y = 0;
          this.isGrounded = true;

          // Check block special mechanics!
          if (block.shape === 'spring') {
            this.playerVel.y = 28.0; // High super spring launch!
            this.isGrounded = false;
            sounds.playSpring();
            this.cameraShake = 0.5;
          } else if (block.shape === 'conveyor') {
            // Apply conveyor push
            this.playerPos.z += block.conveyorSpeed * dt;
          } else if (block.isLava) {
            // Lava wipeout!
            this.takeDamage(100);
          }
        } else {
          // Push player out horizontally
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            const pushAmt = (pRadius - dist);
            this.playerPos.x += (dx / dist) * pushAmt;
            this.playerPos.z += (dz / dist) * pushAmt;
          }
        }
      }
    }

    // Check fell off world (Void wipeout)
    if (this.playerPos.y < -25) {
      this.takeDamage(100);
    }

    // Check Victory trigger (Podium reach)
    if (this.victoryTriggerPos && !this.isVictory) {
      if (this.playerPos.distanceTo(this.victoryTriggerPos) < 5.0) {
        this.isVictory = true;
        sounds.playTixChime();
        this.tix += 100;
        this.notifyStats();
      }
    }

    // Update Avatar model transform and limb animations
    this.avatar.group.position.copy(this.playerPos);
    this.avatar.group.rotation.y = this.playerRotation;

    const horizontalSpeed = Math.sqrt(this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z);
    this.avatar.update(dt, horizontalSpeed, !this.isGrounded, true);
  }

  public takeDamage(amt: number) {
    this.health = Math.max(0, this.health - amt);
    this.avatar.updateNametag(this.health);
    this.avatar.triggerOof();
    this.cameraShake = 0.8;

    if (this.health <= 0) {
      this.wipeouts++;
      setTimeout(() => {
        this.respawnPlayer();
      }, 700);
    }
    this.notifyStats();
  }

  private updateGrabbedBlock(dt: number) {
    if (!this.grabbedBlock) return;

    // Raycast target point along camera ray at grabDistance
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const targetPos = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(this.grabDistance));

    // Spring-physics pull towards targetPos
    const bPos = this.grabbedBlock.mesh.position;
    const toTarget = targetPos.sub(bPos);
    this.grabbedBlock.velocity.add(toTarget.multiplyScalar(22 * dt));
    this.grabbedBlock.velocity.multiplyScalar(0.85); // Damping
  }

  private updateCamera(dt: number) {
    if (this.isTitleScreen) {
      // Atmospheric live-world circular orbit around castle
      const t = performance.now() * 0.0003;
      const camR = 45;
      this.camera.position.set(Math.cos(t) * camR, 20 + Math.sin(t * 1.5) * 4, Math.sin(t) * camR);
      this.camera.lookAt(0, 5, 0);
      return;
    }

    // Third-person orbit follow camera
    const cx = this.playerPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;
    const cy = this.playerPos.y + 2.5 + Math.sin(this.cameraPitch) * this.cameraDist;
    const cz = this.playerPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;

    // Decay camera shake
    let shakeOffset = new THREE.Vector3();
    if (this.cameraShake > 0.001) {
      shakeOffset.set(
        (Math.random() - 0.5) * this.cameraShake * 1.2,
        (Math.random() - 0.5) * this.cameraShake * 1.2,
        (Math.random() - 0.5) * this.cameraShake * 1.2
      );
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 8, dt);
    }

    this.camera.position.set(cx, cy, cz).add(shakeOffset);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 2.0, this.playerPos.z);
  }

  private updatePreview() {
    if (!this.previewMesh || this.activeTool !== 'build') return;

    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const blockMeshes = this.physics.blocks.map((b) => b.mesh);
    const baseplate = this.scene.getObjectByName('Baseplate');
    const targets = baseplate ? [...blockMeshes, baseplate] : blockMeshes;

    const intersects = this.raycaster.intersectObjects(targets, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
      const pos = hit.point.clone().add(normal.clone().multiplyScalar(0.6));

      this.previewMesh.position.set(Math.round(pos.x), Math.max(0.6, Math.round(pos.y * 10) / 10), Math.round(pos.z));
      this.previewMesh.rotation.y = this.stamperRotationAngle;
      this.previewMesh.visible = true;
    } else {
      this.previewMesh.visible = false;
    }
  }

  private notifyStats() {
    if (this.onStatsChange) {
      const onlinePlayers: ConnectedPlayerInfo[] = [
        {
          id: 'player_local',
          name: this.avatarCustomization ? this.avatarCustomization.name : 'DynaBuilder',
          color: this.avatarCustomization ? this.avatarCustomization.torsoColor : '#0d69ac',
          ping: 18,
          tix: this.tix,
          blocksPlaced: this.blocksPlaced,
          wipeouts: this.wipeouts,
          isHost: true,
        },
        ...(this.multiplayer
          ? this.multiplayer.players.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.customization.torsoColor,
              ping: p.ping,
              tix: p.tix,
              blocksPlaced: p.blocksPlaced,
              wipeouts: p.wipeouts,
              isHost: false,
            }))
          : []),
      ];

      this.onStatsChange({
        health: this.health,
        tix: this.tix,
        blocksPlaced: this.blocksPlaced,
        wipeouts: this.wipeouts,
        activeTool: this.activeTool,
        activeColor: this.activeColorHex,
        activeShape: this.activeShape,
        isAnchored: this.placeAnchored,
        currentWorld: this.currentWorldId,
        isPaused: this.isPaused,
        isVictory: this.isVictory,
        fps: this.fpsCounter,
        isPointerLocked: this.isPointerLocked,
        onlinePlayers,
        chatFeed: this.multiplayer ? this.multiplayer.chatLog : [],
      });
    }
  }

  private animate = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // Clamped dt

    // Calculate FPS
    this.fpsFrames++;
    this.fpsTick += dt;
    if (this.fpsTick >= 0.5) {
      this.fpsCounter = Math.round(this.fpsFrames / this.fpsTick);
      this.fpsFrames = 0;
      this.fpsTick = 0;
    }

    if (!this.isPaused) {
      if (this.toolCooldown > 0) this.toolCooldown -= dt;

      // Update Physics & Blocks
      const { explosions } = this.physics.update(dt);
      if (explosions.length > 0) {
        this.cameraShake = Math.min(1.2, this.cameraShake + 0.6);
      }

      // Update Player & Controls
      this.updatePlayer(dt);

      // Update Multiplayer Bots
      if (this.multiplayer) {
        this.multiplayer.update(dt);
      }

      // Update Grabbed block
      this.updateGrabbedBlock(dt);

      // Update Stamper build preview
      this.updatePreview();
    }

    // Update Camera
    this.updateCamera(dt);

    // Clear edge-triggered keys
    this.justPressedKeys.clear();

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    // Pace software WebGL or rAF
    if (this.isSoftwareGl) {
      this.afterDraw(this.animate);
    } else {
      this.frameId = requestAnimationFrame(this.animate);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
