import * as THREE from 'three';
import { TextureFactory, CLASSIC_COLORS } from './textures';
import { sounds } from './audio';

export type BlockShape = 'brick' | 'wedge' | 'cylinder' | 'sphere' | 'spring' | 'tnt' | 'conveyor';

export interface DynaBlockOptions {
  id?: string;
  position: THREE.Vector3;
  size?: THREE.Vector3; // width, height, depth (default 2, 1.2, 4)
  shape?: BlockShape;
  color?: string; // hex
  isAnchored?: boolean;
  isLava?: boolean;
  conveyorSpeed?: number;
}

export class DynaBlock {
  public id: string;
  public mesh: THREE.Mesh;
  public size: THREE.Vector3;
  public shape: BlockShape;
  public isAnchored: boolean;
  public isLava: boolean;
  public colorHex: string;
  public conveyorSpeed: number;

  // Rigid Body Physics State
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public angularVelocity: THREE.Vector3 = new THREE.Vector3();
  public mass: number = 1.0;
  public restitution: number = 0.2; // bounciness
  public friction: number = 0.7;

  // TNT State
  public isTntActive: boolean = false;
  public tntTimer: number = 3.0;
  private tntFlashTick: number = 0;

  // Materials reference for quick color change or highlight
  private materials: THREE.Material[];

  constructor(options: DynaBlockOptions, renderer?: THREE.WebGLRenderer) {
    this.id = options.id || `block_${Math.random().toString(36).substring(2, 9)}`;
    this.size = options.size ? options.size.clone() : new THREE.Vector3(2, 1.2, 4);
    this.shape = options.shape || 'brick';
    this.isAnchored = options.isAnchored !== undefined ? options.isAnchored : true;
    this.isLava = !!options.isLava;
    this.colorHex = options.color || '#9ea3a8';
    this.conveyorSpeed = options.conveyorSpeed || 0;

    if (this.shape === 'spring') {
      this.restitution = 1.6;
      this.colorHex = '#289b38';
    } else if (this.shape === 'tnt') {
      this.colorHex = '#c4281c';
    } else if (this.isLava) {
      this.colorHex = '#ff3300';
    }

    const matColor = new THREE.Color(this.colorHex);

    // Multi-material setup for studded box
    const sideMat = new THREE.MeshStandardMaterial({
      color: matColor,
      roughness: 0.35,
      metalness: 0.05,
      emissive: this.isLava ? new THREE.Color('#ff2200') : new THREE.Color(0x000000),
      emissiveIntensity: this.isLava ? 0.7 : 0,
    });

    // Top face with stud texture tiled based on brick size
    const studTex = TextureFactory.getStudTexture(renderer).clone();
    studTex.repeat.set(Math.max(1, Math.round(this.size.x)), Math.max(1, Math.round(this.size.z)));
    studTex.needsUpdate = true;

    const topMat = new THREE.MeshStandardMaterial({
      color: matColor,
      map: studTex,
      roughness: 0.3,
      metalness: 0.05,
      emissive: this.isLava ? new THREE.Color('#ff3300') : new THREE.Color(0x000000),
      emissiveIntensity: this.isLava ? 0.7 : 0,
    });

    // Bottom face with inlet texture
    const inletTex = TextureFactory.getInletTexture().clone();
    inletTex.repeat.set(Math.max(1, Math.round(this.size.x)), Math.max(1, Math.round(this.size.z)));
    inletTex.needsUpdate = true;

    const bottomMat = new THREE.MeshStandardMaterial({
      color: matColor,
      map: inletTex,
      roughness: 0.35,
      metalness: 0.05,
    });

    let geometry: THREE.BufferGeometry;

    if (this.shape === 'cylinder') {
      geometry = new THREE.CylinderGeometry(this.size.x / 2, this.size.x / 2, this.size.y, 24);
      this.materials = [topMat, sideMat, bottomMat];
      this.mesh = new THREE.Mesh(geometry, sideMat);
    } else if (this.shape === 'sphere') {
      geometry = new THREE.SphereGeometry(this.size.x / 2, 24, 20);
      this.materials = [sideMat];
      this.mesh = new THREE.Mesh(geometry, sideMat);
    } else if (this.shape === 'wedge') {
      // Prism wedge ramp
      geometry = this.createWedgeGeometry(this.size.x, this.size.y, this.size.z);
      this.materials = [sideMat, topMat];
      this.mesh = new THREE.Mesh(geometry, sideMat);
    } else if (this.shape === 'tnt') {
      geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
      const tntSide = new THREE.MeshStandardMaterial({
        map: TextureFactory.getTNTTexture(),
        roughness: 0.4,
      });
      // 0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z, 5:-Z
      this.materials = [tntSide, tntSide, topMat, bottomMat, tntSide, tntSide];
      this.mesh = new THREE.Mesh(geometry, this.materials);
    } else if (this.shape === 'conveyor') {
      geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
      const convTex = TextureFactory.getConveyorTexture().clone();
      convTex.repeat.set(Math.max(1, Math.round(this.size.x)), Math.max(1, Math.round(this.size.z)));
      const convTop = new THREE.MeshStandardMaterial({
        map: convTex,
        roughness: 0.4,
      });
      this.materials = [sideMat, sideMat, convTop, bottomMat, sideMat, sideMat];
      this.mesh = new THREE.Mesh(geometry, this.materials);
    } else {
      // Standard Brick
      geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
      // Box face order: +x, -x, +y, -y, +z, -z
      this.materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
      this.mesh = new THREE.Mesh(geometry, this.materials);
    }

    this.mesh.position.copy(options.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = { blockId: this.id, dynaBlock: this };
  }

  private createWedgeGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
    // Right triangle prism
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2);
    shape.closePath();

    const extrudeSettings = {
      depth: d,
      bevelEnabled: false,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }

  public setColor(hex: string) {
    this.colorHex = hex;
    const c = new THREE.Color(hex);
    this.materials.forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.color.copy(c);
        m.needsUpdate = true;
      }
    });
  }

  public ignite() {
    if (this.shape !== 'tnt' || this.isTntActive) return;
    this.isTntActive = true;
    this.tntTimer = 3.0;
  }

  public updateTnt(dt: number): boolean {
    if (!this.isTntActive) return false;
    this.tntTimer -= dt;
    this.tntFlashTick += dt * 10;

    // Flash block white/red
    const isFlashing = Math.sin(this.tntFlashTick) > 0;
    this.materials.forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.emissive.set(isFlashing ? 0xffffff : 0xff0000);
        m.emissiveIntensity = isFlashing ? 0.9 : 0.3;
      }
    });

    if (this.tntTimer <= 0) {
      return true; // Trigger explosion!
    }
    return false;
  }
}

export interface RocketProjectile {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
}

export class PhysicsWorld {
  public blocks: DynaBlock[] = [];
  public rockets: RocketProjectile[] = [];
  public gravity: number = -26.0;
  public hitstopTimer: number = 0;
  public scene: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;

  // Particle pool
  public particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    color: THREE.Color;
  }[] = [];

  constructor(scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
  }

  public addBlock(options: DynaBlockOptions): DynaBlock {
    const block = new DynaBlock(options, this.renderer);
    this.blocks.push(block);
    this.scene.add(block.mesh);
    return block;
  }

  public removeBlock(id: string): DynaBlock | null {
    const idx = this.blocks.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const block = this.blocks[idx];
      this.scene.remove(block.mesh);
      this.blocks.splice(idx, 1);
      return block;
    }
    return null;
  }

  public clearAll() {
    this.blocks.forEach((b) => this.scene.remove(b.mesh));
    this.blocks = [];
    this.rockets.forEach((r) => this.scene.remove(r.mesh));
    this.rockets = [];
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
  }

  // Fire classic rocket launcher missile
  public fireRocket(startPos: THREE.Vector3, direction: THREE.Vector3) {
    sounds.playRocketLaunch();

    const rocketGroup = new THREE.Group();
    rocketGroup.position.copy(startPos);

    // Rocket body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    rocketGroup.add(body);

    // Rocket nose cone (bright red)
    const noseGeo = new THREE.ConeGeometry(0.22, 0.5, 12);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xc4281c,
      roughness: 0.3,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.85;
    rocketGroup.add(nose);

    // Yellow fins
    const finGeo = new THREE.BoxGeometry(0.8, 0.05, 0.3);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xf5cd2f });
    const fin1 = new THREE.Mesh(finGeo, finMat);
    fin1.position.z = -0.4;
    rocketGroup.add(fin1);

    const fin2 = new THREE.Mesh(finGeo, finMat);
    fin2.rotation.z = Math.PI / 2;
    fin2.position.z = -0.4;
    rocketGroup.add(fin2);

    rocketGroup.lookAt(startPos.clone().add(direction));

    const speed = 48.0;
    const velocity = direction.clone().normalize().multiplyScalar(speed);

    this.scene.add(rocketGroup);
    this.rockets.push({
      mesh: rocketGroup,
      position: rocketGroup.position,
      velocity: velocity,
      life: 5.0,
    });
  }

  // Create an explosion at target location
  public createExplosion(center: THREE.Vector3, radius: number = 8.0, force: number = 32.0) {
    sounds.playExplosion();
    this.hitstopTimer = 0.05; // 50ms hitstop punch

    // Particle burst
    this.spawnExplosionParticles(center, 24);

    // Explode nearby blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      const dist = block.mesh.position.distanceTo(center);

      if (dist < radius) {
        // If it's a TNT block, chain explode it!
        if (block.shape === 'tnt' && !block.isTntActive) {
          block.ignite();
          block.tntTimer = 0.15; // Fast chain reaction!
        }

        // Unanchor blocks caught in blast
        block.isAnchored = false;

        const impulseDir = block.mesh.position.clone().sub(center);
        if (impulseDir.lengthSq() < 0.001) impulseDir.set(0, 1, 0);
        impulseDir.normalize();

        const power = ((radius - dist) / radius) * force;
        block.velocity.add(impulseDir.multiplyScalar(power));
        block.velocity.y += power * 0.45; // Pop upwards!

        block.angularVelocity.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );
      }
    }
  }

  public spawnExplosionParticles(pos: THREE.Vector3, count: number) {
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const colors = [0xf5cd2f, 0xc4281c, 0xff7700, 0x555555];

    for (let i = 0; i < count; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        Math.random() * 18 + 4,
        (Math.random() - 0.5) * 22
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: Math.random() * 0.8 + 0.4,
        color: new THREE.Color(col),
      });
    }
  }

  public spawnDeleteSparkles(pos: THREE.Vector3) {
    sounds.playVaporize();
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xf5cd2f });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        )
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 9 + 3,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.6,
        color: new THREE.Color(0xf5cd2f),
      });
    }
  }

  public update(dt: number): { explosions: THREE.Vector3[] } {
    const occurredExplosions: THREE.Vector3[] = [];

    // Hitstop handler
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return { explosions: occurredExplosions };
    }

    // 1. Update Rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.life -= dt;
      r.position.addScaledVector(r.velocity, dt);

      // Trailing smoke
      if (Math.random() < 0.7) {
        const smokeGeo = new THREE.SphereGeometry(0.2, 6, 6);
        const smokeMat = new THREE.MeshBasicMaterial({
          color: 0xcccccc,
          transparent: true,
          opacity: 0.7,
        });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.copy(r.position);
        this.scene.add(smoke);
        this.particles.push({
          mesh: smoke,
          velocity: new THREE.Vector3(0, 0.5, 0),
          life: 0,
          maxLife: 0.45,
          color: new THREE.Color(0xcccccc),
        });
      }

      // Check collision with blocks or ground
      let hit = false;
      if (r.position.y <= 0.2) {
        hit = true;
      } else {
        for (const block of this.blocks) {
          const halfX = block.size.x * 0.5;
          const halfY = block.size.y * 0.5;
          const halfZ = block.size.z * 0.5;
          const bPos = block.mesh.position;

          if (
            Math.abs(r.position.x - bPos.x) <= halfX &&
            Math.abs(r.position.y - bPos.y) <= halfY &&
            Math.abs(r.position.z - bPos.z) <= halfZ
          ) {
            hit = true;
            break;
          }
        }
      }

      if (hit || r.life <= 0) {
        const impactPos = r.position.clone();
        occurredExplosions.push(impactPos);
        this.createExplosion(impactPos, 9.0, 36.0);
        this.scene.remove(r.mesh);
        this.rockets.splice(i, 1);
      }
    }

    // 2. Update Blocks Physics (Unanchored blocks)
    for (const block of this.blocks) {
      // Check TNT countdown
      if (block.updateTnt(dt)) {
        const pos = block.mesh.position.clone();
        occurredExplosions.push(pos);
        this.createExplosion(pos, 11.0, 42.0);
        this.removeBlock(block.id);
        continue;
      }

      if (block.isAnchored) continue;

      // Apply gravity
      block.velocity.y += this.gravity * dt;

      // Update position
      block.mesh.position.addScaledVector(block.velocity, dt);

      // Rotate
      block.mesh.rotation.x += block.angularVelocity.x * dt;
      block.mesh.rotation.y += block.angularVelocity.y * dt;
      block.mesh.rotation.z += block.angularVelocity.z * dt;

      // Damping
      block.velocity.x *= 0.985;
      block.velocity.z *= 0.985;
      block.angularVelocity.multiplyScalar(0.97);

      // Ground collision (y = 0)
      const halfY = block.size.y * 0.5;
      if (block.mesh.position.y - halfY < 0) {
        block.mesh.position.y = halfY;
        if (block.velocity.y < -1.0) {
          block.velocity.y = -block.velocity.y * block.restitution;
        } else {
          block.velocity.y = 0;
        }
      }

      // Simple collision against other anchored blocks
      for (const other of this.blocks) {
        if (other === block) continue;
        const b1Pos = block.mesh.position;
        const b2Pos = other.mesh.position;

        const dx = Math.abs(b1Pos.x - b2Pos.x);
        const dy = Math.abs(b1Pos.y - b2Pos.y);
        const dz = Math.abs(b1Pos.z - b2Pos.z);

        const targetX = (block.size.x + other.size.x) * 0.5;
        const targetY = (block.size.y + other.size.y) * 0.5;
        const targetZ = (block.size.z + other.size.z) * 0.5;

        if (dx < targetX && dy < targetY && dz < targetZ) {
          // Resolve vertical stacking
          if (dy > dx && dy > dz) {
            if (b1Pos.y > b2Pos.y) {
              block.mesh.position.y = b2Pos.y + targetY;
              if (block.velocity.y < 0) {
                block.velocity.y = other.shape === 'spring' ? 24.0 : 0;
              }
            }
          } else if (dx > dz) {
            const pushDir = b1Pos.x > b2Pos.x ? 1 : -1;
            block.mesh.position.x = b2Pos.x + targetX * pushDir;
            block.velocity.x = -block.velocity.x * 0.3;
          } else {
            const pushDir = b1Pos.z > b2Pos.z ? 1 : -1;
            block.mesh.position.z = b2Pos.z + targetZ * pushDir;
            block.velocity.z = -block.velocity.z * 0.3;
          }
        }
      }
    }

    // 3. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.velocity.y += this.gravity * 0.5 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      const lifeRatio = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, lifeRatio));

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    return { explosions: occurredExplosions };
  }
}
