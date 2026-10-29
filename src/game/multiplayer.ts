import * as THREE from 'three';
import { AvatarModel, AvatarCustomization } from './avatar';
import { PhysicsWorld } from './physics';
import { sounds } from './audio';
import { CLASSIC_COLORS } from './textures';
import { ToolVisuals, ToolType } from './tools';

export interface SimulatedPlayer {
  id: string;
  name: string;
  customization: AvatarCustomization;
  avatar: AvatarModel;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetPos: THREE.Vector3;
  equippedTool: ToolType;
  tix: number;
  blocksPlaced: number;
  wipeouts: number;
  ping: number;
  actionTimer: number;
  chatTimer: number;
  isJumping: boolean;
  active: boolean;
}

export interface ChatLogEntry {
  id: string;
  sender: string;
  message: string;
  isSystem?: boolean;
  time: string;
}

const PRESET_PLAYERS: Omit<SimulatedPlayer, 'avatar' | 'pos' | 'vel' | 'targetPos' | 'actionTimer' | 'chatTimer' | 'isJumping' | 'active'>[] = [
  {
    id: 'p_builderman',
    name: 'Builderman',
    customization: {
      name: 'Builderman',
      headColor: '#f5cd2f',
      torsoColor: '#da7428', // Orange construction shirt
      leftArmColor: '#f5cd2f',
      rightArmColor: '#f5cd2f',
      legsColor: '#5b5d61', // Dark grey pants
      hat: 'helmet',
      face: 'smile',
    },
    equippedTool: 'build',
    tix: 150,
    blocksPlaced: 14,
    wipeouts: 1,
    ping: 28,
  },
  {
    id: 'p_telamon',
    name: 'Telamon',
    customization: {
      name: 'Telamon',
      headColor: '#f5cd2f',
      torsoColor: '#c4281c', // Bright red shirt
      leftArmColor: '#f5cd2f',
      rightArmColor: '#f5cd2f',
      legsColor: '#1e2024',
      hat: 'cap',
      face: 'smirk',
    },
    equippedTool: 'sword',
    tix: 220,
    blocksPlaced: 8,
    wipeouts: 3,
    ping: 35,
  },
  {
    id: 'p_erik',
    name: 'Erik.Cassel',
    customization: {
      name: 'Erik.Cassel',
      headColor: '#f5cd2f',
      torsoColor: '#289b38', // Green shirt
      leftArmColor: '#f5cd2f',
      rightArmColor: '#f5cd2f',
      legsColor: '#0d69ac',
      hat: 'helmet',
      face: 'smile',
    },
    equippedTool: 'grab',
    tix: 180,
    blocksPlaced: 22,
    wipeouts: 0,
    ping: 22,
  },
  {
    id: 'p_retronoob',
    name: 'RetroNoob',
    customization: {
      name: 'RetroNoob',
      headColor: '#f5cd2f', // Classic Yellow skin
      torsoColor: '#0d69ac', // Classic Blue shirt
      leftArmColor: '#f5cd2f',
      rightArmColor: '#f5cd2f',
      legsColor: '#289b38', // Classic Green pants
      hat: 'none',
      face: 'smile',
    },
    equippedTool: 'rocket',
    tix: 45,
    blocksPlaced: 3,
    wipeouts: 5,
    ping: 52,
  },
  {
    id: 'p_clockwork',
    name: 'Clockwork',
    customization: {
      name: 'Clockwork',
      headColor: '#9ea3a8',
      torsoColor: '#217b85', // Teal shirt
      leftArmColor: '#9ea3a8',
      rightArmColor: '#9ea3a8',
      legsColor: '#1e2024',
      hat: 'tophat',
      face: 'robot',
    },
    equippedTool: 'paint',
    tix: 310,
    blocksPlaced: 19,
    wipeouts: 2,
    ping: 44,
  },
  {
    id: 'p_brickmaster',
    name: 'BrickMaster06',
    customization: {
      name: 'BrickMaster06',
      headColor: '#f5cd2f',
      torsoColor: '#8a62a6', // Lavender shirt
      leftArmColor: '#f5cd2f',
      rightArmColor: '#f5cd2f',
      legsColor: '#5b5d61',
      hat: 'cap',
      face: 'oof',
    },
    equippedTool: 'tnt',
    tix: 95,
    blocksPlaced: 11,
    wipeouts: 4,
    ping: 39,
  },
];

const RANDOM_CHATTERS = [
  'welcome to dynablocks!',
  'check out this tower lol',
  'who wants to blow up the castle?',
  'nice studded bricks!',
  'press space to jump on the trampoline :D',
  'watch out for falling blocks!',
  'classic roblox physics engine is legendary',
  'gg',
  'oof :O',
  'did you see that domino chain?',
  'anyone got a rocket launcher?',
  'building a fortress right now',
  'love the retro 2004 aesthetic',
  'teeter totter is fun haha',
];

export class MultiplayerServerSim {
  public players: SimulatedPlayer[] = [];
  public chatLog: ChatLogEntry[] = [];
  private scene: THREE.Scene;
  private physics: PhysicsWorld;
  private spawnOrigin: THREE.Vector3;
  private joinQueueIndex: number = 0;
  private timeElapsed: number = 0;
  private nextJoinTime: number = 2.5;

  public onPlayersUpdated?: (players: SimulatedPlayer[]) => void;
  public onChatLogUpdated?: (chatLog: ChatLogEntry[]) => void;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, spawnOrigin: THREE.Vector3, playerName: string) {
    this.scene = scene;
    this.physics = physics;
    this.spawnOrigin = spawnOrigin.clone();

    // System welcome log
    this.addChatEntry('SYSTEM', `Connected to DynaBlocks Server #1 (127.0.0.1:53640)`, true);
    this.addChatEntry('SYSTEM', `Welcome, ${playerName}! You are Player #1 on this server.`, true);
  }

  public setSpawnOrigin(origin: THREE.Vector3) {
    this.spawnOrigin.copy(origin);
  }

  public addChatEntry(sender: string, message: string, isSystem: boolean = false) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry: ChatLogEntry = {
      id: `chat_${Date.now()}_${Math.random()}`,
      sender,
      message,
      isSystem,
      time,
    };
    this.chatLog.push(entry);
    if (this.chatLog.length > 50) {
      this.chatLog.shift();
    }
    this.onChatLogUpdated?.([...this.chatLog]);
  }

  public handleUserChatMessage(senderName: string, text: string) {
    this.addChatEntry(senderName, text, false);

    // Contextual responses from nearby bots after 1-2 seconds
    setTimeout(() => {
      const activeBots = this.players.filter((p) => p.active);
      if (activeBots.length === 0) return;

      const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
      const lower = text.toLowerCase();

      let reply = 'cool! :]';
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        reply = `hey ${senderName}! welcome to the server!`;
      } else if (lower.includes('build') || lower.includes('brick') || lower.includes('stamper')) {
        reply = 'nice build! grab tool or stamper is tool [2]';
      } else if (lower.includes('rocket') || lower.includes('boom') || lower.includes('blow')) {
        reply = 'firing rockets is so fun haha watch out!';
      } else if (lower.includes('oof')) {
        reply = 'OOF :O';
      } else if (lower.includes('obby') || lower.includes('win')) {
        reply = 'have you reached the golden trophy yet?';
      } else {
        reply = RANDOM_CHATTERS[Math.floor(Math.random() * RANDOM_CHATTERS.length)];
      }

      randomBot.avatar.showChatBubble(reply);
      this.addChatEntry(randomBot.name, reply, false);
      sounds.playSnap();
    }, 1200 + Math.random() * 800);
  }

  public update(dt: number) {
    this.timeElapsed += dt;

    // 1. Process Sequential Player Joins
    if (this.joinQueueIndex < PRESET_PLAYERS.length && this.timeElapsed >= this.nextJoinTime) {
      this.spawnNextPlayer();
      this.nextJoinTime = this.timeElapsed + 7.0 + Math.random() * 9.0;
    }

    // 2. Update each active simulated player
    for (const player of this.players) {
      if (!player.active) continue;

      player.actionTimer -= dt;
      player.chatTimer -= dt;

      // Pick new target / action periodically
      if (player.actionTimer <= 0) {
        player.actionTimer = 4.0 + Math.random() * 6.0;

        // Choose random action
        const actionRoll = Math.random();
        if (actionRoll < 0.65) {
          // Wander to random position near spawn
          const offsetRadius = 14 + Math.random() * 18;
          const angle = Math.random() * Math.PI * 2;
          player.targetPos.set(
            this.spawnOrigin.x + Math.cos(angle) * offsetRadius,
            this.spawnOrigin.y,
            this.spawnOrigin.z + Math.sin(angle) * offsetRadius
          );
        } else if (actionRoll < 0.85) {
          // Place a block
          const blockPos = player.pos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            0.6,
            (Math.random() - 0.5) * 6
          ));
          const col = CLASSIC_COLORS[Math.floor(Math.random() * CLASSIC_COLORS.length)].hex;
          this.physics.addBlock({
            position: blockPos,
            size: new THREE.Vector3(2, 1.2, 4),
            color: col,
            isAnchored: Math.random() > 0.4,
          });
          player.blocksPlaced++;
          player.tix += 2;
          sounds.playSnap();
        } else {
          // Jump or fire rocket
          if (player.equippedTool === 'rocket') {
            const fireDir = new THREE.Vector3(Math.random() - 0.5, 0.2, Math.random() - 0.5).normalize();
            this.physics.fireRocket(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), fireDir);
          } else {
            player.vel.y = 14.0;
            player.isJumping = true;
            sounds.playJump();
          }
        }
      }

      // Random spontaneous chat bubble
      if (player.chatTimer <= 0) {
        player.chatTimer = 18.0 + Math.random() * 25.0;
        const msg = RANDOM_CHATTERS[Math.floor(Math.random() * RANDOM_CHATTERS.length)];
        player.avatar.showChatBubble(msg);
        this.addChatEntry(player.name, msg, false);
      }

      // Horizontal movement towards target
      const toTarget = player.targetPos.clone().sub(player.pos);
      toTarget.y = 0;
      const dist = toTarget.length();

      let moveSpeed = 0;
      if (dist > 1.2) {
        toTarget.normalize();
        moveSpeed = 8.5;
        player.vel.x = THREE.MathUtils.damp(player.vel.x, toTarget.x * moveSpeed, 12, dt);
        player.vel.z = THREE.MathUtils.damp(player.vel.z, toTarget.z * moveSpeed, 12, dt);

        // Turn towards direction
        const targetRot = Math.atan2(toTarget.x, toTarget.z);
        player.avatar.group.rotation.y = THREE.MathUtils.damp(player.avatar.group.rotation.y, targetRot, 14, dt);
      } else {
        player.vel.x = THREE.MathUtils.damp(player.vel.x, 0, 10, dt);
        player.vel.z = THREE.MathUtils.damp(player.vel.z, 0, 10, dt);
      }

      // Gravity and jumping
      player.vel.y += this.physics.gravity * dt;
      player.pos.addScaledVector(player.vel, dt);

      // Floor collision
      if (player.pos.y <= 0) {
        player.pos.y = 0;
        player.vel.y = 0;
        player.isJumping = false;
      }

      // Check collision with blocks or trampolines
      for (const block of this.physics.blocks) {
        if (block.shape === 'spring') {
          if (player.pos.distanceTo(block.mesh.position) < 3.2 && player.pos.y <= block.mesh.position.y + 1.2) {
            player.vel.y = 26.0;
            player.isJumping = true;
            sounds.playSpring();
            break;
          }
        }
      }

      // Void check
      if (player.pos.y < -20) {
        player.avatar.triggerOof();
        player.pos.copy(this.spawnOrigin);
        player.vel.set(0, 0, 0);
        player.wipeouts++;
      }

      // Update avatar mesh position and limb animations
      player.avatar.group.position.copy(player.pos);
      const hSpeed = Math.hypot(player.vel.x, player.vel.z);
      player.avatar.update(dt, hSpeed, player.isJumping, true);
    }
  }

  private spawnNextPlayer() {
    const template = PRESET_PLAYERS[this.joinQueueIndex];
    if (!template) return;
    this.joinQueueIndex++;

    const avatar = new AvatarModel(template.customization);

    // Randomize initial tool mesh
    while (avatar.heldToolGroup.children.length > 0) {
      avatar.heldToolGroup.remove(avatar.heldToolGroup.children[0]);
    }
    const toolMesh = ToolVisuals.createHeldToolMesh(template.equippedTool, template.customization.torsoColor);
    avatar.heldToolGroup.add(toolMesh);

    // Offset spawn position slightly around spawn pad
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * 4;
    const spawnPos = this.spawnOrigin.clone().add(new THREE.Vector3(Math.cos(angle) * dist, 1.0, Math.sin(angle) * dist));

    avatar.group.position.copy(spawnPos);
    this.scene.add(avatar.group);

    // Spawn sparkle effect
    this.physics.spawnDeleteSparkles(spawnPos);
    sounds.playPlayerJoin();

    const player: SimulatedPlayer = {
      ...template,
      avatar,
      pos: spawnPos,
      vel: new THREE.Vector3(),
      targetPos: spawnPos.clone(),
      actionTimer: 2.0,
      chatTimer: 4.0 + Math.random() * 8.0,
      isJumping: false,
      active: true,
    };

    this.players.push(player);

    // System join broadcast!
    this.addChatEntry('SYSTEM', `${template.name} joined the game.`, true);

    // Player greeting in bubble & chat feed
    const greetings = [
      `hey everyone! :]`,
      `what's up server!`,
      `ready to build!`,
      `anyone seen the golden trophy?`,
      `hello dyna builders!`,
      `gg let's play!`,
    ];
    const greetingMsg = greetings[Math.floor(Math.random() * greetings.length)];

    setTimeout(() => {
      avatar.showChatBubble(greetingMsg);
      this.addChatEntry(player.name, greetingMsg, false);
    }, 1200);

    this.onPlayersUpdated?.([...this.players]);
  }

  public resetPlayers(newSpawnOrigin: THREE.Vector3) {
    this.spawnOrigin.copy(newSpawnOrigin);
    for (const player of this.players) {
      player.pos.copy(newSpawnOrigin).add(new THREE.Vector3((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 8));
      player.vel.set(0, 0, 0);
      player.avatar.group.position.copy(player.pos);
    }
    this.onPlayersUpdated?.([...this.players]);
  }

  public clearAll() {
    for (const p of this.players) {
      this.scene.remove(p.avatar.group);
    }
    this.players = [];
    this.joinQueueIndex = 0;
    this.timeElapsed = 0;
    this.nextJoinTime = 2.5;
  }
}
