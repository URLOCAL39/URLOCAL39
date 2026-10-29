import * as THREE from 'three';
import { TextureFactory, CLASSIC_COLORS } from './textures';
import { sounds } from './audio';

export interface AvatarCustomization {
  name: string;
  headColor: string;
  torsoColor: string;
  leftArmColor: string;
  rightArmColor: string;
  legsColor: string;
  hat: 'helmet' | 'cap' | 'tophat' | 'none';
  face: 'smile' | 'oof' | 'smirk' | 'robot';
}

export const DEFAULT_AVATAR: AvatarCustomization = {
  name: 'DynaBuilder',
  headColor: '#f5cd2f', // Classic Yellow
  torsoColor: '#0d69ac', // Classic Blue
  leftArmColor: '#f5cd2f',
  rightArmColor: '#f5cd2f',
  legsColor: '#289b38', // Classic Green
  hat: 'helmet',
  face: 'smile',
};

export class AvatarModel {
  public group: THREE.Group;
  public headGroup: THREE.Group;
  public torsoMesh: THREE.Mesh;
  public leftArmGroup: THREE.Group;
  public rightArmGroup: THREE.Group;
  public leftLegGroup: THREE.Group;
  public rightLegGroup: THREE.Group;
  public toolMount: THREE.Group;
  public heldToolGroup: THREE.Group;

  private headMesh: THREE.Mesh;
  private faceMesh: THREE.Mesh;
  private chestDecalMesh: THREE.Mesh;
  private hatGroup: THREE.Group;
  private nameTagSprite: THREE.Sprite | null = null;
  private chatBubbleSprite: THREE.Sprite | null = null;

  private customization: AvatarCustomization;
  private isOofing: boolean = false;
  private oofTimer: number = 0;
  private walkCycle: number = 0;
  private currentChat: string = '';
  private chatTimer: number = 0;

  // Materials
  private headMat: THREE.MeshStandardMaterial;
  private torsoMat: THREE.MeshStandardMaterial;
  private leftArmMat: THREE.MeshStandardMaterial;
  private rightArmMat: THREE.MeshStandardMaterial;
  private legsMat: THREE.MeshStandardMaterial;
  private faceMat: THREE.MeshBasicMaterial;

  constructor(customization: AvatarCustomization = DEFAULT_AVATAR) {
    this.customization = { ...customization };
    this.group = new THREE.Group();
    this.group.name = 'Avatar';

    // Build R6 Rig Hierarchy
    // Total character height ~ 3.2 units (standing flush on ground at y=0)

    // Materials
    this.headMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.headColor),
      roughness: 0.35,
      metalness: 0.05,
    });
    this.torsoMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.torsoColor),
      roughness: 0.35,
      metalness: 0.05,
    });
    this.leftArmMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.leftArmColor),
      roughness: 0.35,
      metalness: 0.05,
    });
    this.rightArmMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.rightArmColor),
      roughness: 0.35,
      metalness: 0.05,
    });
    this.legsMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.legsColor),
      roughness: 0.35,
      metalness: 0.05,
    });

    // 1. Torso: width 1.4, height 1.4, depth 0.7
    // Sits above legs: legs height is 1.4, so torso center is at y = 1.4 + 0.7 = 2.1
    const torsoGeo = new THREE.BoxGeometry(1.4, 1.4, 0.7);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.torsoMat);
    this.torsoMesh.position.y = 2.1;
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.group.add(this.torsoMesh);

    // Torso chest badge decal
    const decalGeo = new THREE.PlaneGeometry(1.0, 0.7);
    const decalMat = new THREE.MeshBasicMaterial({
      map: TextureFactory.getChestLogoTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.chestDecalMesh = new THREE.Mesh(decalGeo, decalMat);
    this.chestDecalMesh.position.set(0, 0, 0.352);
    this.torsoMesh.add(this.chestDecalMesh);

    // 2. Head Group: pivot at top of torso (y = 2.8)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.8, 0);
    this.group.add(this.headGroup);

    // Head mesh (Roblox cylinder-box hybrid: bevel cube or cylinder)
    // Classic Roblox head is roughly a rounded cylinder/block: radius 0.45, height 0.8
    const headGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.8, 16);
    this.headMesh = new THREE.Mesh(headGeo, this.headMat);
    this.headMesh.position.set(0, 0.42, 0);
    this.headMesh.castShadow = true;
    this.headGroup.add(this.headMesh);

    // Head top stud (authentic classic stud on head!)
    const studGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
    const studMesh = new THREE.Mesh(studGeo, this.headMat);
    studMesh.position.set(0, 0.45, 0);
    this.headMesh.add(studMesh);

    // Face decal (curved or flat plane on front of head)
    const faceGeo = new THREE.PlaneGeometry(0.68, 0.68);
    this.faceMat = new THREE.MeshBasicMaterial({
      map: TextureFactory.getFaceTexture(this.customization.face),
      transparent: true,
      depthWrite: false,
    });
    this.faceMesh = new THREE.Mesh(faceGeo, this.faceMat);
    this.faceMesh.position.set(0, 0.42, 0.49);
    this.headGroup.add(this.faceMesh);

    // Hat Group attached to head
    this.hatGroup = new THREE.Group();
    this.hatGroup.position.set(0, 0.82, 0);
    this.headGroup.add(this.hatGroup);
    this.rebuildHat();

    // 3. Left Arm Group: pivot at left shoulder (x = -1.05, y = 2.7)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-1.05, 2.7, 0);
    this.group.add(this.leftArmGroup);

    const armGeo = new THREE.BoxGeometry(0.7, 1.4, 0.7);
    const leftArmMesh = new THREE.Mesh(armGeo, this.leftArmMat);
    leftArmMesh.position.set(0, -0.65, 0);
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);

    // 4. Right Arm Group: pivot at right shoulder (x = 1.05, y = 2.7)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(1.05, 2.7, 0);
    this.group.add(this.rightArmGroup);

    const rightArmMesh = new THREE.Mesh(armGeo, this.rightArmMat);
    rightArmMesh.position.set(0, -0.65, 0);
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);

    // Tool Mount attached to right hand (bottom of right arm)
    this.toolMount = new THREE.Group();
    this.toolMount.position.set(0, -1.2, 0.25);
    this.rightArmGroup.add(this.toolMount);

    this.heldToolGroup = new THREE.Group();
    this.toolMount.add(this.heldToolGroup);

    // 5. Left Leg Group: pivot at hip (x = -0.36, y = 1.4)
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.36, 1.4, 0);
    this.group.add(this.leftLegGroup);

    const legGeo = new THREE.BoxGeometry(0.68, 1.4, 0.7);
    const leftLegMesh = new THREE.Mesh(legGeo, this.legsMat);
    leftLegMesh.position.set(0, -0.7, 0);
    leftLegMesh.castShadow = true;
    this.leftLegGroup.add(leftLegMesh);

    // 6. Right Leg Group: pivot at hip (x = 0.36, y = 1.4)
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.36, 1.4, 0);
    this.group.add(this.rightLegGroup);

    const rightLegMesh = new THREE.Mesh(legGeo, this.legsMat);
    rightLegMesh.position.set(0, -0.7, 0);
    rightLegMesh.castShadow = true;
    this.rightLegGroup.add(rightLegMesh);

    // Contact shadow beneath character
    const shadowGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);

    // Overhead Nametag & Health Sprite
    this.updateNametag(100);
  }

  public rebuildHat() {
    // Clear old hat meshes
    while (this.hatGroup.children.length > 0) {
      this.hatGroup.remove(this.hatGroup.children[0]);
    }

    if (this.customization.hat === 'helmet') {
      // Classic Yellow / Red Construction Hardhat with "DYNA" logo
      const domeGeo = new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const hatMat = new THREE.MeshStandardMaterial({
        color: 0xf5cd2f,
        roughness: 0.25,
        metalness: 0.1,
      });
      const dome = new THREE.Mesh(domeGeo, hatMat);
      dome.scale.set(1.05, 0.65, 1.15);
      dome.position.set(0, -0.05, 0);
      this.hatGroup.add(dome);

      // Brim
      const brimGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.08, 16);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.set(0, -0.06, 0.05);
      this.hatGroup.add(brim);

      // Center Ridge
      const ridgeGeo = new THREE.BoxGeometry(0.12, 0.25, 0.95);
      const ridge = new THREE.Mesh(ridgeGeo, hatMat);
      ridge.position.set(0, 0.15, 0);
      this.hatGroup.add(ridge);
    } else if (this.customization.hat === 'cap') {
      // Classic Red Baseball Cap backwards/forwards
      const capMat = new THREE.MeshStandardMaterial({ color: 0xc4281c, roughness: 0.4 });
      const domeGeo = new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const cap = new THREE.Mesh(domeGeo, capMat);
      cap.scale.set(1.05, 0.6, 1.1);
      this.hatGroup.add(cap);

      // Visor
      const visorGeo = new THREE.BoxGeometry(0.65, 0.05, 0.5);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, -0.05, 0.55);
      visor.rotation.x = 0.12;
      this.hatGroup.add(visor);
    } else if (this.customization.hat === 'tophat') {
      // Classic Gentleman Top Hat
      const topMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xc4281c, roughness: 0.3 });

      const brimGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 16);
      const brim = new THREE.Mesh(brimGeo, topMat);
      this.hatGroup.add(brim);

      const tallGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.9, 16);
      const tall = new THREE.Mesh(tallGeo, topMat);
      tall.position.set(0, 0.48, 0);
      this.hatGroup.add(tall);

      const ribbonGeo = new THREE.CylinderGeometry(0.49, 0.49, 0.16, 16);
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.set(0, 0.12, 0);
      this.hatGroup.add(ribbon);
    }
  }

  public updateNametag(health: number = 100) {
    if (this.nameTagSprite) {
      this.group.remove(this.nameTagSprite);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;

    // Player name
    ctx.font = 'bold 26px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(this.customization.name, 128, 30);

    // Health bar container
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(38, 42, 180, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 42, 180, 16);

    // Green health fill
    const healthPercent = Math.max(0, Math.min(100, health)) / 100;
    const barWidth = 176 * healthPercent;
    ctx.fillStyle = healthPercent > 0.5 ? '#289b38' : healthPercent > 0.25 ? '#f5cd2f' : '#c4281c';
    ctx.fillRect(40, 44, barWidth, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    this.nameTagSprite = new THREE.Sprite(spriteMat);
    this.nameTagSprite.position.set(0, 4.4, 0);
    this.nameTagSprite.scale.set(2.4, 0.75, 1);
    this.group.add(this.nameTagSprite);
  }

  public showChatBubble(message: string) {
    this.currentChat = message;
    this.chatTimer = 5.0; // Show for 5 seconds

    if (this.chatBubbleSprite) {
      this.group.remove(this.chatBubbleSprite);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // White rounded speech bubble with tail
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(10, 10, 300, 60, 14);
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(150, 70);
    ctx.lineTo(160, 90);
    ctx.lineTo(170, 70);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Message text
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 20px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message.slice(0, 28), 160, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    this.chatBubbleSprite = new THREE.Sprite(spriteMat);
    this.chatBubbleSprite.position.set(0, 5.3, 0);
    this.chatBubbleSprite.scale.set(3.2, 1.0, 1);
    this.group.add(this.chatBubbleSprite);
  }

  public triggerOof() {
    this.isOofing = true;
    this.oofTimer = 0.6;
    sounds.playOof();
    this.faceMat.map = TextureFactory.getFaceTexture('oof');
    this.faceMat.needsUpdate = true;
    this.torsoMat.color.setHex(0xff3333);
  }

  public setCustomization(customization: Partial<AvatarCustomization>) {
    this.customization = { ...this.customization, ...customization };
    this.headMat.color.set(this.customization.headColor);
    this.torsoMat.color.set(this.customization.torsoColor);
    this.leftArmMat.color.set(this.customization.leftArmColor);
    this.rightArmMat.color.set(this.customization.rightArmColor);
    this.legsMat.color.set(this.customization.legsColor);
    this.faceMat.map = TextureFactory.getFaceTexture(this.customization.face);
    this.faceMat.needsUpdate = true;
    this.rebuildHat();
    this.updateNametag();
  }

  public update(dt: number, speed: number, isJumping: boolean, isEquipped: boolean) {
    // Handle Oof flash timer
    if (this.isOofing) {
      this.oofTimer -= dt;
      if (this.oofTimer <= 0) {
        this.isOofing = false;
        this.faceMat.map = TextureFactory.getFaceTexture(this.customization.face);
        this.faceMat.needsUpdate = true;
        this.torsoMat.color.set(this.customization.torsoColor);
      }
    }

    // Handle chat bubble timer
    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0 && this.chatBubbleSprite) {
        this.group.remove(this.chatBubbleSprite);
        this.chatBubbleSprite = null;
      }
    }

    // Character limb swinging animation
    if (isJumping) {
      // Classic Roblox jump pose: both arms raised up, legs angled
      this.leftArmGroup.rotation.x = THREE.MathUtils.damp(this.leftArmGroup.rotation.x, -2.6, 12, dt);
      this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, isEquipped ? -1.6 : -2.6, 12, dt);
      this.leftArmGroup.rotation.z = THREE.MathUtils.damp(this.leftArmGroup.rotation.z, -0.4, 12, dt);
      this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, 0.4, 12, dt);

      this.leftLegGroup.rotation.x = THREE.MathUtils.damp(this.leftLegGroup.rotation.x, -0.3, 12, dt);
      this.rightLegGroup.rotation.x = THREE.MathUtils.damp(this.rightLegGroup.rotation.x, 0.3, 12, dt);
      this.torsoMesh.position.y = 2.1;
    } else if (speed > 0.1) {
      // Walking / Running swing
      this.walkCycle += dt * speed * 4.2;
      const swing = Math.sin(this.walkCycle) * 0.8;

      // Legs swing opposite to each other
      this.leftLegGroup.rotation.x = swing;
      this.rightLegGroup.rotation.x = -swing;

      // Left arm swings opposite to left leg
      this.leftArmGroup.rotation.x = -swing * 0.9;
      this.leftArmGroup.rotation.z = 0;

      // Right arm (if equipped, points slightly forward or holds tool)
      if (isEquipped) {
        this.rightArmGroup.rotation.x = -1.4 + Math.sin(this.walkCycle * 2) * 0.08;
        this.rightArmGroup.rotation.z = -0.15;
      } else {
        this.rightArmGroup.rotation.x = swing * 0.9;
        this.rightArmGroup.rotation.z = 0;
      }

      // Torso bobbing
      this.torsoMesh.position.y = 2.1 + Math.abs(Math.sin(this.walkCycle)) * 0.08;
      this.headGroup.position.y = 2.8 + Math.abs(Math.sin(this.walkCycle)) * 0.08;
    } else {
      // Idle pose
      this.leftArmGroup.rotation.x = THREE.MathUtils.damp(this.leftArmGroup.rotation.x, 0, 10, dt);
      this.leftArmGroup.rotation.z = THREE.MathUtils.damp(this.leftArmGroup.rotation.z, 0, 10, dt);

      if (isEquipped) {
        this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, -1.4, 10, dt);
        this.rightArmGroup.rotation.z = -0.15;
      } else {
        this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, 0, 10, dt);
        this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, 0, 10, dt);
      }

      this.leftLegGroup.rotation.x = THREE.MathUtils.damp(this.leftLegGroup.rotation.x, 0, 10, dt);
      this.rightLegGroup.rotation.x = THREE.MathUtils.damp(this.rightLegGroup.rotation.x, 0, 10, dt);
      this.torsoMesh.position.y = THREE.MathUtils.damp(this.torsoMesh.position.y, 2.1, 10, dt);
      this.headGroup.position.y = THREE.MathUtils.damp(this.headGroup.position.y, 2.8, 10, dt);
    }
  }
}
