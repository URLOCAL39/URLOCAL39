/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { DynaGameEngine, GameStats } from './game/engine';
import { AvatarCustomization, DEFAULT_AVATAR } from './game/avatar';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal';
import { PauseVictoryModal } from './components/PauseVictoryModal';
import { WorldId } from './game/worlds';
import { ToolType } from './game/tools';
import { BlockShape } from './game/physics';
import { sounds } from './game/audio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DynaGameEngine | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing'>('title');
  const [stats, setStats] = useState<GameStats>({
    health: 100,
    tix: 25,
    blocksPlaced: 0,
    wipeouts: 0,
    activeTool: 'grab',
    activeColor: '#f5cd2f',
    activeShape: 'brick',
    isAnchored: true,
    currentWorld: 'crossroads',
    isPaused: false,
    isVictory: false,
    fps: 60,
    isPointerLocked: false,
    onlinePlayers: [],
    chatFeed: [],
  });

  const [customization, setCustomization] = useState<AvatarCustomization>(() => {
    try {
      const saved = localStorage.getItem('dynablocks_avatar');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_AVATAR;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize Engine
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new DynaGameEngine(mountRef.current, customization);
    engineRef.current = engine;

    engine.onStatsChange = (newStats) => {
      setStats((prev) => ({ ...prev, ...newStats }));
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = (worldId: WorldId) => {
    if (!engineRef.current) return;
    engineRef.current.isTitleScreen = false;
    if (engineRef.current.currentWorldId !== worldId) {
      engineRef.current.loadWorld(worldId);
    }
    setGameState('playing');
  };

  const handleSaveCustomization = (newCustomization: AvatarCustomization) => {
    setCustomization(newCustomization);
    try {
      localStorage.setItem('dynablocks_avatar', JSON.stringify(newCustomization));
    } catch {
      // storage unavailable
    }
    if (engineRef.current) {
      engineRef.current.updateCustomization(newCustomization);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sounds.setMuted(nextMute);
  };

  const handleSelectTool = (tool: ToolType) => {
    engineRef.current?.setTool(tool);
  };

  const handleSelectColor = (hex: string) => {
    engineRef.current?.setColor(hex);
  };

  const handleSelectShape = (shape: BlockShape) => {
    engineRef.current?.setShape(shape);
  };

  const handleToggleAnchored = () => {
    engineRef.current?.toggleAnchored();
  };

  const handleSwitchWorld = (worldId: WorldId) => {
    engineRef.current?.loadWorld(worldId);
  };

  const handleRespawn = () => {
    engineRef.current?.respawnPlayer(true);
  };

  const handleRestartMap = () => {
    engineRef.current?.restartMap();
  };

  const handleTogglePointerLock = () => {
    engineRef.current?.togglePointerLock();
  };

  const handleSendChat = (message: string) => {
    engineRef.current?.sendChat(message);
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.isPaused = false;
      engineRef.current.isVictory = false;
      setStats((prev) => ({ ...prev, isPaused: false, isVictory: false }));
    }
  };

  const handleReturnTitle = () => {
    if (engineRef.current) {
      engineRef.current.isTitleScreen = true;
      engineRef.current.isPaused = false;
      engineRef.current.isVictory = false;
    }
    setGameState('title');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Viewport (100% Unobstructed) */}
      <div ref={mountRef} className="absolute inset-0 z-0 w-full h-full cursor-crosshair" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenCustomizer={() => setIsCustomizerOpen(true)}
          customization={customization}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Playing HUD Overlay */}
      {gameState === 'playing' && (
        <GameHUD
          stats={stats}
          playerName={customization.name}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onSelectTool={handleSelectTool}
          onSelectColor={handleSelectColor}
          onSelectShape={handleSelectShape}
          onToggleAnchored={handleToggleAnchored}
          onSwitchWorld={handleSwitchWorld}
          onRespawn={handleRespawn}
          onRestartMap={handleRestartMap}
          onTogglePointerLock={handleTogglePointerLock}
          onSendChat={handleSendChat}
          onOpenPause={() => {
            if (engineRef.current) {
              engineRef.current.isPaused = true;
              setStats((prev) => ({ ...prev, isPaused: true }));
            }
          }}
        />
      )}

      {/* Avatar Customizer Modal */}
      {isCustomizerOpen && (
        <AvatarCustomizerModal
          customization={customization}
          onSave={handleSaveCustomization}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}

      {/* Pause & Victory Modal */}
      <PauseVictoryModal
        isPaused={stats.isPaused}
        isVictory={stats.isVictory}
        currentWorld={stats.currentWorld}
        tix={stats.tix}
        blocksPlaced={stats.blocksPlaced}
        isMuted={isMuted}
        onResume={handleResume}
        onRespawn={handleRespawn}
        onRestartMap={handleRestartMap}
        onSwitchWorld={handleSwitchWorld}
        onReturnTitle={handleReturnTitle}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
