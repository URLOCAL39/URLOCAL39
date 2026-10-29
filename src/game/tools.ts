import * as THREE from 'three';
import { BlockShape, DynaBlock } from './physics';
import { CLASSIC_COLORS } from './textures';
import { sounds } from './audio';

export type ToolType = 'grab' | 'build' | 'rocket' | 'tnt' | 'paint' | 'delete' | 'sword';

export interface ToolDef {
  id: ToolType;
  name: string;
  icon: string;
  slotKey: string;
  description: string;
}

export const TOOLS: ToolDef[] = [
  { id: 'grab', name: 'Move Tool', icon: '🖐️', slotKey: '1', description: 'Pick up, carry, rotate, or fling loose DynaBlocks' },
  { id: 'build', name: 'Block Stamper', icon: '🧱', slotKey: '2', description: 'Place studded bricks, ramps, springs, and conveyors' },
  { id: 'rocket', name: 'Rocket Launcher', icon: '🚀', slotKey: '3', description: 'Classic 2006 explosive rocket with block blast physics' },
  { id: 'tnt', name: 'T.N.T. Barrel', icon: '🧨', slotKey: '4', description: 'Place 3-second fuse dynamite blocks' },
  { id: 'paint', name: 'Paint Bucket', icon: '🎨', slotKey: '5', description: 'Recolor blocks with authentic 2006 Roblox palette' },
  { id: 'delete', name: 'Vaporizer', icon: '🗑️', slotKey: '6', description: 'Disintegrate blocks into sparkling stud debris' },
  { id: 'sword', name: 'Linked Sword', icon: '🗡️', slotKey: '7', description: 'Classic brick melee sword with slash knockback' },
];

export class ToolVisuals {
  public static createHeldToolMesh(type: ToolType, activeColorHex: string = '#f5cd2f'): THREE.Group {
    const group = new THREE.Group();

    if (type === 'rocket') {
      // Classic Rocket Launcher model
      const launcherMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3 });
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.8, 16), launcherMat);
      barrel.rotation.x = Math.PI / 2;
      group.add(barrel);

      // Yellow ring accent
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xf5cd2f, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = 0.4;
      group.add(ring);

      // Handle grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.16), launcherMat);
      grip.position.set(0, -0.4, -0.2);
      group.add(grip);

      // Scope
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), launcherMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.35, 0);
      group.add(scope);
    } else if (type === 'sword') {
      // Classic 2006 Linked Sword
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0xf5cd2f, roughness: 0.3 }); // Yellow crossguard
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x0d69ac, roughness: 0.4 }); // Blue grip

      // Blade
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.35), bladeMat);
      blade.position.y = 1.3;
      group.add(blade);

      // Tip angle
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), bladeMat);
      tip.position.y = 2.65;
      tip.rotation.y = Math.PI / 4;
      group.add(tip);

      // Crossguard
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 1.1), hiltMat);
      guard.position.y = 0.2;
      group.add(guard);

      // Handle grip
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 8), gripMat);
      grip.position.y = -0.15;
      group.add(grip);

      // Pommel
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), hiltMat);
      pommel.position.y = -0.5;
      group.add(pommel);
    } else if (type === 'paint') {
      // Paint bucket
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
      const paintMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(activeColorHex), roughness: 0.2 });

      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 12, 1, true), metalMat);
      group.add(bucket);

      const paintSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), paintMat);
      paintSurface.position.y = 0.22;
      group.add(paintSurface);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 12, Math.PI), metalMat);
      handle.position.y = 0.32;
      group.add(handle);
    } else if (type === 'build') {
      // Classic BTools Trowel
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 });
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), woodMat);
      group.add(handle);

      const spade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.45), bladeMat);
      spade.position.set(0, 0.5, 0);
      group.add(spade);
    } else if (type === 'tnt') {
      // Red dynamite stick bundle
      const dynMat = new THREE.MeshStandardMaterial({ color: 0xc4281c, roughness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), dynMat);
        const ang = (i / 3) * Math.PI * 2;
        stick.position.set(Math.cos(ang) * 0.12, 0, Math.sin(ang) * 0.12);
        group.add(stick);
      }
      // Fuse
      const fuseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), fuseMat);
      fuse.position.y = 0.45;
      group.add(fuse);
    } else if (type === 'delete') {
      // Sci-fi / retro trash tool
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.3 });
      const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.9, 8), bodyMat);
      group.add(wand);

      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
      tip.position.y = 0.5;
      group.add(tip);
    } else {
      // Grab Hand Tool
      const handMat = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 8, 16), handMat);
      group.add(ring);
    }

    return group;
  }
}
