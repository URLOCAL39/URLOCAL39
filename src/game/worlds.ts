import * as THREE from 'three';
import { PhysicsWorld, DynaBlock } from './physics';
import { TextureFactory, CLASSIC_COLORS } from './textures';

export type WorldId = 'crossroads' | 'physics_lab' | 'chaos_obby' | 'sandbox';

export interface WorldDef {
  id: WorldId;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  skyColor: number;
  fogColor: number;
  groundColor: string;
  spawnPos: THREE.Vector3;
}

export const WORLDS: WorldDef[] = [
  {
    id: 'crossroads',
    name: 'Crossroads 2006',
    tagline: 'The Legendary Battleground',
    badge: 'CLASSIC',
    description: 'Castle watchtowers, suspension bridges, trampolines, and destroyable brick ramparts.',
    skyColor: 0x8ec7f5,
    fogColor: 0x8ec7f5,
    groundColor: '#289b38', // Grass green
    spawnPos: new THREE.Vector3(0, 1.5, 12),
  },
  {
    id: 'physics_lab',
    name: 'Physics Playground',
    tagline: 'Dominoes & Demolition',
    badge: 'CHAOS',
    description: 'Massive domino chains, rollable DynaBalls, spring launchers, and high-rise brick towers.',
    skyColor: 0x9bc2e6,
    fogColor: 0x9bc2e6,
    groundColor: '#9ea3a8', // Medium stone grey
    spawnPos: new THREE.Vector3(-15, 1.5, 0),
  },
  {
    id: 'chaos_obby',
    name: 'Retro Chaos Obby',
    tagline: '8 Vintage Challenge Stages',
    badge: 'OBBY',
    description: 'Truss climbs, conveyor leaps, neon lava hazards, and the glowing golden DynaTrophy.',
    skyColor: 0x6ca0dc,
    fogColor: 0x6ca0dc,
    groundColor: '#1e2024',
    spawnPos: new THREE.Vector3(0, 2.0, 0),
  },
  {
    id: 'sandbox',
    name: 'DynaBaseplate',
    tagline: 'Blank Infinite Canvas',
    badge: 'BUILD',
    description: 'Unlimited studded baseplate with zero distractions. Grab your stamper and build anything.',
    skyColor: 0x87ceeb,
    fogColor: 0x87ceeb,
    groundColor: '#5b5d61',
    spawnPos: new THREE.Vector3(0, 1.5, 0),
  },
];

export class WorldBuilder {
  public static buildWorld(
    worldId: WorldId,
    physics: PhysicsWorld,
    scene: THREE.Scene,
    renderer?: THREE.WebGLRenderer
  ): { victoryTriggerPos?: THREE.Vector3; checkPoints?: THREE.Vector3[] } {
    // Clean up any previous world environment objects
    const existingGroup = scene.getObjectByName('WorldEnvironmentGroup');
    if (existingGroup) {
      scene.remove(existingGroup);
    }
    const worldGroup = new THREE.Group();
    worldGroup.name = 'WorldEnvironmentGroup';
    scene.add(worldGroup);

    // 1. Create Baseplate / Ground
    const worldDef = WORLDS.find((w) => w.id === worldId) || WORLDS[0];

    const baseSize = worldId === 'chaos_obby' ? 60 : 160;
    const baseGeo = new THREE.BoxGeometry(baseSize, 2, baseSize);

    const studTex = TextureFactory.getStudTexture(renderer).clone();
    studTex.repeat.set(baseSize / 2, baseSize / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(worldDef.groundColor),
      map: studTex,
      roughness: 0.45,
      metalness: 0.05,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(worldDef.groundColor).multiplyScalar(0.7),
      roughness: 0.6,
    });

    const baseMesh = new THREE.Mesh(baseGeo, [sideMat, sideMat, groundMat, sideMat, sideMat, sideMat]);
    baseMesh.position.set(0, -1, 0);
    baseMesh.receiveShadow = true;
    baseMesh.name = 'Baseplate';
    worldGroup.add(baseMesh);

    // Decorative retro perimeter elements (Trees / natural barrier)
    if (worldId === 'crossroads' || worldId === 'physics_lab') {
      this.createPerimeterTrees(worldGroup, baseSize * 0.44);
    }

    let victoryTriggerPos: THREE.Vector3 | undefined;
    const checkPoints: THREE.Vector3[] = [worldDef.spawnPos.clone()];

    // 2. Build Specific World Structures
    if (worldId === 'crossroads') {
      // Classic Castle Fortress
      // 4 Corner Towers
      const towerCoords = [
        [-12, -12],
        [12, -12],
        [-12, 12],
        [12, 12],
      ];

      towerCoords.forEach(([tx, tz]) => {
        // Tower base
        physics.addBlock({
          position: new THREE.Vector3(tx, 3, tz),
          size: new THREE.Vector3(6, 6, 6),
          color: '#5b5d61',
          isAnchored: true,
        });

        // Tower top battlements
        physics.addBlock({
          position: new THREE.Vector3(tx, 6.6, tz),
          size: new THREE.Vector3(7, 1.2, 7),
          color: '#9ea3a8',
          isAnchored: true,
        });

        // Merlons
        [-2.5, 2.5].forEach((mx) => {
          [-2.5, 2.5].forEach((mz) => {
            physics.addBlock({
              position: new THREE.Vector3(tx + mx, 7.8, tz + mz),
              size: new THREE.Vector3(1.5, 1.2, 1.5),
              color: '#9ea3a8',
              isAnchored: true,
            });
          });
        });
      });

      // Castle Walls connecting towers
      physics.addBlock({
        position: new THREE.Vector3(0, 2.5, -12),
        size: new THREE.Vector3(18, 5, 2),
        color: '#5b5d61',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(-12, 2.5, 0),
        size: new THREE.Vector3(2, 5, 18),
        color: '#5b5d61',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(12, 2.5, 0),
        size: new THREE.Vector3(2, 5, 18),
        color: '#5b5d61',
        isAnchored: true,
      });

      // Front Archway
      physics.addBlock({
        position: new THREE.Vector3(-6, 2.5, 12),
        size: new THREE.Vector3(6, 5, 2),
        color: '#5b5d61',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(6, 2.5, 12),
        size: new THREE.Vector3(6, 5, 2),
        color: '#5b5d61',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(0, 4.2, 12),
        size: new THREE.Vector3(6, 1.6, 2),
        color: '#9ea3a8',
        isAnchored: true,
      });

      // Central Tall Tower of Peace
      physics.addBlock({
        position: new THREE.Vector3(0, 7.5, 0),
        size: new THREE.Vector3(5, 15, 5),
        color: '#f4f5f5',
        isAnchored: true,
      });
      // Tower balcony
      physics.addBlock({
        position: new THREE.Vector3(0, 15.6, 0),
        size: new THREE.Vector3(9, 1.2, 9),
        color: '#f5cd2f',
        isAnchored: true,
      });

      // Trampolines!
      physics.addBlock({
        position: new THREE.Vector3(18, 0.6, 18),
        size: new THREE.Vector3(6, 1.2, 6),
        shape: 'spring',
        color: '#289b38',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(-18, 0.6, -18),
        size: new THREE.Vector3(6, 1.2, 6),
        shape: 'spring',
        color: '#289b38',
        isAnchored: true,
      });

      // Destroyable / Unanchored brick stacks inside courtyard
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 2; x++) {
          physics.addBlock({
            position: new THREE.Vector3(-4 + x * 2.2, 0.6 + y * 1.2, -4),
            size: new THREE.Vector3(2, 1.2, 2),
            color: (y + x) % 2 === 0 ? '#c4281c' : '#f5cd2f',
            isAnchored: false,
          });
        }
      }

      // TNT caches
      physics.addBlock({
        position: new THREE.Vector3(4, 0.6, 4),
        size: new THREE.Vector3(2, 2, 2),
        shape: 'tnt',
        isAnchored: false,
      });
      physics.addBlock({
        position: new THREE.Vector3(4, 2.6, 4),
        size: new THREE.Vector3(2, 2, 2),
        shape: 'tnt',
        isAnchored: false,
      });
    } else if (worldId === 'physics_lab') {
      // 1. Long Domino Chain (18 colorful domino tiles)
      for (let i = 0; i < 16; i++) {
        const col = CLASSIC_COLORS[i % CLASSIC_COLORS.length].hex;
        physics.addBlock({
          position: new THREE.Vector3(-25 + i * 2.4, 2.0, -10),
          size: new THREE.Vector3(0.5, 4.0, 2.4),
          color: col,
          isAnchored: false,
        });
      }

      // Starter push wedge near domino #1
      physics.addBlock({
        position: new THREE.Vector3(-28, 1.0, -10),
        size: new THREE.Vector3(3, 2, 2.4),
        shape: 'wedge',
        color: '#c4281c',
        isAnchored: true,
      });

      // 2. High Tower of Bricks (5 floors of stacked unanchored bricks)
      for (let floor = 0; floor < 6; floor++) {
        const isOdd = floor % 2 === 1;
        const y = 0.6 + floor * 1.2;
        if (isOdd) {
          physics.addBlock({ position: new THREE.Vector3(12, y, 6), size: new THREE.Vector3(1.2, 1.2, 5), color: '#da7428', isAnchored: false });
          physics.addBlock({ position: new THREE.Vector3(15, y, 6), size: new THREE.Vector3(1.2, 1.2, 5), color: '#da7428', isAnchored: false });
        } else {
          physics.addBlock({ position: new THREE.Vector3(13.5, y, 4.5), size: new THREE.Vector3(5, 1.2, 1.2), color: '#f5cd2f', isAnchored: false });
          physics.addBlock({ position: new THREE.Vector3(13.5, y, 7.5), size: new THREE.Vector3(5, 1.2, 1.2), color: '#f5cd2f', isAnchored: false });
        }
      }

      // TNT in center of tower
      physics.addBlock({
        position: new THREE.Vector3(13.5, 0.6, 6),
        size: new THREE.Vector3(2, 2, 2),
        shape: 'tnt',
        isAnchored: false,
      });

      // 3. High Ramp & Rolling DynaBalls
      physics.addBlock({
        position: new THREE.Vector3(-6, 3, 14),
        size: new THREE.Vector3(16, 6, 4),
        shape: 'wedge',
        color: '#0d69ac',
        isAnchored: true,
      });

      // Giant Rolling Sphere atop ramp
      physics.addBlock({
        position: new THREE.Vector3(-12, 7.5, 14),
        size: new THREE.Vector3(3, 3, 3),
        shape: 'sphere',
        color: '#f5cd2f',
        isAnchored: false,
      });
      physics.addBlock({
        position: new THREE.Vector3(-8, 6.5, 14),
        size: new THREE.Vector3(2.4, 2.4, 2.4),
        shape: 'sphere',
        color: '#c4281c',
        isAnchored: false,
      });

      // 4. Spring Boost Pad launching toward target
      physics.addBlock({
        position: new THREE.Vector3(0, 0.6, -18),
        size: new THREE.Vector3(5, 1.2, 5),
        shape: 'spring',
        color: '#289b38',
        isAnchored: true,
      });

      // 5. Conveyor Run
      physics.addBlock({
        position: new THREE.Vector3(22, 0.6, -6),
        size: new THREE.Vector3(14, 1.2, 3),
        shape: 'conveyor',
        color: '#1e2024',
        conveyorSpeed: 8,
        isAnchored: true,
      });
    } else if (worldId === 'chaos_obby') {
      // 8-Stage Classic Roblox Obby Course
      let currentZ = 0;

      // Stage 1: Stepping stones
      checkPoints.push(new THREE.Vector3(0, 2, currentZ));
      for (let i = 0; i < 4; i++) {
        currentZ -= 6;
        physics.addBlock({
          position: new THREE.Vector3(Math.sin(i * 1.5) * 3, 1.5 + i * 0.4, currentZ),
          size: new THREE.Vector3(2.5, 1.0, 2.5),
          color: CLASSIC_COLORS[i].hex,
          isAnchored: true,
        });
      }

      // Stage 2: Platform with Neon Lava hazard lines!
      currentZ -= 8;
      checkPoints.push(new THREE.Vector3(0, 3.5, currentZ));
      physics.addBlock({
        position: new THREE.Vector3(0, 3.0, currentZ),
        size: new THREE.Vector3(8, 1.2, 10),
        color: '#5b5d61',
        isAnchored: true,
      });
      // Lava strips
      physics.addBlock({
        position: new THREE.Vector3(0, 3.65, currentZ - 2),
        size: new THREE.Vector3(8, 0.2, 1.2),
        color: '#ff2200',
        isLava: true,
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(0, 3.65, currentZ + 2),
        size: new THREE.Vector3(8, 0.2, 1.2),
        color: '#ff2200',
        isLava: true,
        isAnchored: true,
      });

      // Stage 3: Truss Climb Tower
      currentZ -= 10;
      checkPoints.push(new THREE.Vector3(0, 4, currentZ));
      physics.addBlock({
        position: new THREE.Vector3(0, 6.0, currentZ),
        size: new THREE.Vector3(4, 10, 4),
        color: '#0d69ac',
        isAnchored: true,
      });
      // Steps spiraling around tower
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        physics.addBlock({
          position: new THREE.Vector3(Math.cos(angle) * 3.2, 2.0 + s * 1.6, currentZ + Math.sin(angle) * 3.2),
          size: new THREE.Vector3(2, 0.6, 2),
          color: '#f5cd2f',
          isAnchored: true,
        });
      }

      // Stage 4: Spring Cloud Jump
      currentZ -= 10;
      physics.addBlock({
        position: new THREE.Vector3(0, 11.0, currentZ),
        size: new THREE.Vector3(4, 1.2, 4),
        shape: 'spring',
        color: '#289b38',
        isAnchored: true,
      });

      // Stage 5: Floating Sky Conveyor
      currentZ -= 14;
      physics.addBlock({
        position: new THREE.Vector3(0, 14.0, currentZ),
        size: new THREE.Vector3(4, 1.2, 12),
        shape: 'conveyor',
        color: '#1e2024',
        conveyorSpeed: 6,
        isAnchored: true,
      });

      // Stage 6: Disappearing / Narrow Beam
      currentZ -= 14;
      physics.addBlock({
        position: new THREE.Vector3(0, 14.0, currentZ),
        size: new THREE.Vector3(1.2, 1.0, 10),
        color: '#da7428',
        isAnchored: true,
      });

      // Stage 7: Final Step Ramps
      currentZ -= 8;
      physics.addBlock({
        position: new THREE.Vector3(0, 15.0, currentZ),
        size: new THREE.Vector3(4, 1.2, 4),
        color: '#8a62a6',
        isAnchored: true,
      });

      // Stage 8: Golden Victory Podium & DynaTrophy!
      currentZ -= 10;
      victoryTriggerPos = new THREE.Vector3(0, 17.5, currentZ);

      // Gold platform
      physics.addBlock({
        position: new THREE.Vector3(0, 16.0, currentZ),
        size: new THREE.Vector3(10, 1.8, 10),
        color: '#f5cd2f',
        isAnchored: true,
      });

      // 3D DynaTrophy Model
      const trophyGroup = new THREE.Group();
      trophyGroup.position.set(0, 17.2, currentZ);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.15,
      });
      const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 0.6, 16), goldMat);
      trophyGroup.add(cupBase);

      const cupStem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 12), goldMat);
      cupStem.position.y = 0.8;
      trophyGroup.add(cupStem);

      const cupBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 1.4, 16), goldMat);
      cupBowl.position.y = 1.8;
      trophyGroup.add(cupBowl);

      // Trophy handles
      const handle1 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 16), goldMat);
      handle1.position.set(-1.1, 1.8, 0);
      trophyGroup.add(handle1);

      const handle2 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 16), goldMat);
      handle2.position.set(1.1, 1.8, 0);
      trophyGroup.add(handle2);

      worldGroup.add(trophyGroup);
    } else {
      // Sandbox: starter building zones and starter sample tower
      physics.addBlock({
        position: new THREE.Vector3(0, 1.5, -8),
        size: new THREE.Vector3(6, 3, 6),
        color: '#0d69ac',
        isAnchored: true,
      });
      physics.addBlock({
        position: new THREE.Vector3(0, 3.6, -8),
        size: new THREE.Vector3(4, 1.2, 4),
        shape: 'spring',
        color: '#289b38',
        isAnchored: true,
      });

      // Sample loose blocks
      physics.addBlock({
        position: new THREE.Vector3(8, 1.0, 0),
        size: new THREE.Vector3(2, 2, 2),
        color: '#f5cd2f',
        isAnchored: false,
      });
      physics.addBlock({
        position: new THREE.Vector3(8, 3.0, 0),
        size: new THREE.Vector3(2, 2, 2),
        color: '#c4281c',
        isAnchored: false,
      });
      physics.addBlock({
        position: new THREE.Vector3(8, 5.0, 0),
        size: new THREE.Vector3(2, 2, 2),
        shape: 'tnt',
        isAnchored: false,
      });
    }

    return { victoryTriggerPos, checkPoints };
  }

  private static createPerimeterTrees(parent: THREE.Object3D, radius: number) {
    const treeTrunkGeo = new THREE.CylinderGeometry(0.6, 0.8, 4.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });

    const foliageGeo = new THREE.BoxGeometry(4.0, 4.0, 4.0);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e6629, roughness: 0.6 });

    const treeCount = 14;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * 8;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 2.25;
      trunk.castShadow = true;
      tree.add(trunk);

      // Blocky foliage (classic Roblox pine tree style)
      const f1 = new THREE.Mesh(foliageGeo, foliageMat);
      f1.position.y = 5.2;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 3.0), foliageMat);
      f2.position.y = 7.5;
      f2.castShadow = true;
      tree.add(f2);

      parent.add(tree);
    }
  }
}
