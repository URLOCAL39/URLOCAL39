import * as THREE from 'three';

// Procedural Canvas textures for DynaBlocks & early Roblox aesthetics
// No external PNGs or 404s!

export interface ColorDef {
  id: string;
  name: string;
  hex: string;
  threeColor: THREE.Color;
}

export const CLASSIC_COLORS: ColorDef[] = [
  { id: 'bright_yellow', name: 'Bright Yellow', hex: '#f5cd2f', threeColor: new THREE.Color('#f5cd2f') },
  { id: 'bright_blue', name: 'Bright Blue', hex: '#0d69ac', threeColor: new THREE.Color('#0d69ac') },
  { id: 'bright_green', name: 'Bright Green', hex: '#289b38', threeColor: new THREE.Color('#289b38') },
  { id: 'bright_red', name: 'Bright Red', hex: '#c4281c', threeColor: new THREE.Color('#c4281c') },
  { id: 'medium_stone_grey', name: 'Medium Stone Grey', hex: '#9ea3a8', threeColor: new THREE.Color('#9ea3a8') },
  { id: 'dark_stone_grey', name: 'Dark Stone Grey', hex: '#5b5d61', threeColor: new THREE.Color('#5b5d61') },
  { id: 'white', name: 'White', hex: '#f4f5f5', threeColor: new THREE.Color('#f4f5f5') },
  { id: 'black', name: 'Black', hex: '#1e2024', threeColor: new THREE.Color('#1e2024') },
  { id: 'bright_orange', name: 'Bright Orange', hex: '#da7428', threeColor: new THREE.Color('#da7428') },
  { id: 'lavender', name: 'Lavender', hex: '#8a62a6', threeColor: new THREE.Color('#8a62a6') },
  { id: 'sand_yellow', name: 'Sand Yellow', hex: '#968a73', threeColor: new THREE.Color('#968a73') },
  { id: 'teal', name: 'Classic Teal', hex: '#217b85', threeColor: new THREE.Color('#217b85') },
];

export class TextureFactory {
  private static studCache: THREE.CanvasTexture | null = null;
  private static inletCache: THREE.CanvasTexture | null = null;
  private static faceCaches: Map<string, THREE.CanvasTexture> = new Map();
  private static tntCache: THREE.CanvasTexture | null = null;
  private static conveyorCache: THREE.CanvasTexture | null = null;
  private static chestLogoCache: THREE.CanvasTexture | null = null;

  // The iconic embossed circular stud texture with classic 3D bevel & rim
  public static getStudTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
    if (this.studCache) return this.studCache;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Neutral base plastic
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Subtle edge grid seam
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Stud center
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.32;

    // Outer drop shadow on the bottom-right
    const shadowGrad = ctx.createRadialGradient(cx + 3, cy + 4, r * 0.8, cx + 4, cy + 5, r * 1.25);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 4, r * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Stud cylinder top face
    const studGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    studGrad.addColorStop(0, '#ffffff');
    studGrad.addColorStop(0.5, '#e4e4e4');
    studGrad.addColorStop(1, '#cccccc');

    ctx.fillStyle = studGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Stud beveled rim highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.5, Math.PI * 0.75, Math.PI * 1.75);
    ctx.stroke();

    // Stud beveled rim shadow
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.5, -Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();

    // Inner bevel circle
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // Classic stylized "DYNA" embossed in center
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('DYNA', cx, cy - 0.5);
    ctx.fillStyle = 'rgba(80, 80, 80, 0.35)';
    ctx.fillText('DYNA', cx, cy + 0.5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (renderer) {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    texture.needsUpdate = true;
    this.studCache = texture;
    return texture;
  }

  // Classic bottom inlet texture (hollow circle)
  public static getInletTexture(): THREE.CanvasTexture {
    if (this.inletCache) return this.inletCache;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.32;

    // Sunken cavity
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.7, '#888888');
    grad.addColorStop(1, '#b0b0b0');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.inletCache = texture;
    return texture;
  }

  // Classic 2004-2006 Roblox character faces
  public static getFaceTexture(type: 'smile' | 'oof' | 'smirk' | 'robot' = 'smile'): THREE.CanvasTexture {
    if (this.faceCaches.has(type)) {
      return this.faceCaches.get(type)!;
    }

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    if (type === 'smile') {
      // Classic :] smiling face
      // Left eye
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(85, 95, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Right eye
      ctx.beginPath();
      ctx.ellipse(171, 95, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye glints
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(88, 90, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(174, 90, 4, 0, Math.PI * 2);
      ctx.fill();

      // Big simple happy smile
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(128, 125, 48, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (type === 'oof') {
      // Classic wide-eyed OOF shock face :O
      ctx.fillStyle = '#111111';
      // Left big open eye
      ctx.beginPath();
      ctx.arc(80, 95, 20, 0, Math.PI * 2);
      ctx.fill();
      // Right big open eye
      ctx.beginPath();
      ctx.arc(176, 95, 20, 0, Math.PI * 2);
      ctx.fill();

      // White pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(80, 95, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(176, 95, 7, 0, Math.PI * 2);
      ctx.fill();

      // Open oval "O" mouth
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(128, 160, 22, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'smirk') {
      // Classic mischievous smirk
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(85, 95, 12, 16, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(171, 95, 12, 16, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Asymmetric cheeky grin
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(90, 155);
      ctx.quadraticCurveTo(140, 175, 175, 140);
      ctx.stroke();
    } else {
      // Robot face
      ctx.fillStyle = '#111111';
      ctx.fillRect(65, 85, 35, 20);
      ctx.fillRect(156, 85, 35, 20);
      ctx.fillStyle = '#00ffcc';
      ctx.fillRect(72, 90, 21, 10);
      ctx.fillRect(163, 90, 21, 10);

      // Grid teeth
      ctx.fillStyle = '#111111';
      ctx.fillRect(80, 145, 96, 25);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(86 + i * 18, 149, 12, 17);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.faceCaches.set(type, texture);
    return texture;
  }

  // Classic DynaBlocks shirt logo (white blocky 'R' / DynaBlocks emblem on chest)
  public static getChestLogoTexture(): THREE.CanvasTexture {
    if (this.chestLogoCache) return this.chestLogoCache;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Retro white badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.roundRect(40, 50, 176, 120, 16);
    ctx.fill();

    // Red border
    ctx.strokeStyle = '#c4281c';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Red 3D Block
    ctx.fillStyle = '#c4281c';
    ctx.fillRect(60, 75, 45, 45);
    ctx.fillStyle = '#e64235';
    ctx.fillRect(60, 70, 45, 8);

    // Letter 'D' inside block
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('D', 82, 98);

    // DynaBlocks text
    ctx.fillStyle = '#111111';
    ctx.font = '900 20px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DYNA', 115, 90);
    ctx.fillStyle = '#c4281c';
    ctx.fillText('BLOCKS', 115, 112);

    // Est. 2004 tag
    ctx.fillStyle = '#666666';
    ctx.font = '700 11px monospace';
    ctx.fillText('EST. 2004', 115, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.chestLogoCache = texture;
    return texture;
  }

  // TNT Block side label
  public static getTNTTexture(): THREE.CanvasTexture {
    if (this.tntCache) return this.tntCache;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Red painted wood base
    ctx.fillStyle = '#a6241b';
    ctx.fillRect(0, 0, size, size);

    // Wooden slats
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 3;
    for (let y = 64; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Yellow warning band
    ctx.fillStyle = '#f5cd2f';
    ctx.fillRect(0, 75, size, 106);

    // Hazard border lines
    ctx.fillStyle = '#111111';
    for (let x = -20; x < size + 40; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 75);
      ctx.lineTo(x + 20, 75);
      ctx.lineTo(x + 5, 181);
      ctx.lineTo(x - 15, 181);
      ctx.fill();
    }

    // Center white plaque with TNT
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 95, size - 70, 66);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.strokeRect(35, 95, size - 70, 66);

    ctx.fillStyle = '#c4281c';
    ctx.font = '900 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T.N.T.', size / 2, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.tntCache = texture;
    return texture;
  }

  // Animated conveyor belt texture
  public static getConveyorTexture(): THREE.CanvasTexture {
    if (this.conveyorCache) return this.conveyorCache;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, size, size);

    // Chevrons
    ctx.fillStyle = '#f5cd2f';
    for (let y = 0; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(size / 2, y + 4);
      ctx.lineTo(size - 10, y + 26);
      ctx.lineTo(size - 25, y + 26);
      ctx.lineTo(size / 2, y + 14);
      ctx.lineTo(25, y + 26);
      ctx.lineTo(10, y + 26);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.conveyorCache = texture;
    return texture;
  }
}
