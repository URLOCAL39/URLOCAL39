import React, { useState, useEffect, useRef } from 'react';
import { GameStats } from '../game/engine';
import { TOOLS, ToolType } from '../game/tools';
import { CLASSIC_COLORS } from '../game/textures';
import { BlockShape } from '../game/physics';
import { WorldId, WORLDS } from '../game/worlds';
import {
  Volume2,
  VolumeX,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Anchor,
  Compass,
  Zap,
  Camera,
  Users,
  Send,
  Radio,
} from 'lucide-react';
import { sounds } from '../game/audio';

interface GameHUDProps {
  stats: GameStats;
  playerName: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (hex: string) => void;
  onSelectShape: (shape: BlockShape) => void;
  onToggleAnchored: () => void;
  onSwitchWorld: (worldId: WorldId) => void;
  onRespawn: () => void;
  onRestartMap: () => void;
  onTogglePointerLock: () => void;
  onSendChat: (message: string) => void;
  onOpenPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  playerName,
  isMuted,
  onToggleMute,
  onSelectTool,
  onSelectColor,
  onSelectShape,
  onToggleAnchored,
  onSwitchWorld,
  onRespawn,
  onRestartMap,
  onTogglePointerLock,
  onSendChat,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showWorldMenu, setShowWorldMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showMapToast, setShowMapToast] = useState(false);
  const [joinNotification, setJoinNotification] = useState<{ name: string; color: string } | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const prevPlayersCountRef = useRef<number>(stats.onlinePlayers?.length || 1);

  // Monitor player joins to trigger retro banner alert
  useEffect(() => {
    const currentCount = stats.onlinePlayers?.length || 1;
    if (currentCount > prevPlayersCountRef.current && currentCount > 1) {
      // Find newly joined player
      const newestPlayer = stats.onlinePlayers[stats.onlinePlayers.length - 1];
      if (newestPlayer && !newestPlayer.isHost) {
        setJoinNotification({ name: newestPlayer.name, color: newestPlayer.color });
        const timer = setTimeout(() => {
          setJoinNotification(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
    prevPlayersCountRef.current = currentCount;
  }, [stats.onlinePlayers]);

  // Auto-scroll chat log to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [stats.chatFeed]);

  const triggerRespawn = () => {
    onRespawn();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const triggerRestartMap = () => {
    onRestartMap();
    setShowMapToast(true);
    setTimeout(() => setShowMapToast(false), 2400);
  };

  // Keyboard shortcut 'h' for collapsing dock, '/' for chat, Backspace for respawn, Shift+M for restart map
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          chatInputRef.current?.blur();
        }
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === '/' || e.key === 't') {
        e.preventDefault();
        chatInputRef.current?.focus();
      } else if (e.key === 'Backspace' || (e.altKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        triggerRespawn();
      } else if (e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        triggerRestartMap();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
      chatInputRef.current?.blur();
    }
  };

  const currentWorldDef = WORLDS.find((w) => w.id === stats.currentWorld) || WORLDS[0];
  const playerCount = stats.onlinePlayers && stats.onlinePlayers.length > 0 ? stats.onlinePlayers.length : 1;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Center: Multiplayer Server Status & Player Join Banner */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-40 pointer-events-none">
        {/* Live Server Status Bar */}
        <div className="bg-[#111827]/95 border-2 border-[#374151] text-gray-200 px-4 py-1 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-mono font-bold pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[#f5cd2f]">SERVER: DynaNet #1</span>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            PLAYERS: {playerCount}/8
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-green-400 font-bold">18ms</span>
          <span className="text-gray-500">|</span>
          <span className="text-[10px] text-gray-400">127.0.0.1:53640</span>
        </div>

        {/* Join Broadcast Announcement Toast */}
        {joinNotification && (
          <div className="bg-[#0d69ac] border-2 border-[#f5cd2f] text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-mono font-bold animate-bounce pointer-events-none">
            <Radio className="w-3.5 h-3.5 text-yellow-300" />
            <span
              className="w-2.5 h-2.5 rounded-sm border border-black/50"
              style={{ backgroundColor: joinNotification.color }}
            />
            <span>
              <strong className="text-[#f5cd2f]">{joinNotification.name}</strong> joined the game!
            </span>
          </div>
        )}

        {/* Mouse-Look Shift-Lock Status Banner */}
        {stats.isPointerLocked && (
          <div className="bg-[#111827]/95 border-2 border-[#289b38] text-white px-4 py-1 rounded-full shadow-2xl flex items-center gap-2 text-xs font-mono font-bold pointer-events-none animate-pulse">
            <Camera className="w-4 h-4 text-green-400" />
            <span>MOUSE-LOOK ACTIVE (Move mouse to rotate camera · Press ESC or L to release)</span>
          </div>
        )}
      </div>

      {/* Top Perimeter: Left Status & Right Leaderboard */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Player Health & Tix Cluster */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Health Bar */}
          <div className="bg-[#111827]/90 border-2 border-[#374151] rounded p-2.5 shadow-lg min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-mono mb-1 text-gray-200">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                HEALTH
              </span>
              <span className="tabular-nums font-bold text-[#f5cd2f]">{stats.health} / 100</span>
            </div>
            {/* Retro Segmented Bar */}
            <div className="h-4 w-full bg-[#1f2937] border border-black rounded-sm overflow-hidden flex">
              <div
                className={`h-full transition-all duration-150 ${
                  stats.health > 50 ? 'bg-[#289b38]' : stats.health > 25 ? 'bg-[#f5cd2f]' : 'bg-[#c4281c]'
                }`}
                style={{ width: `${stats.health}%` }}
              />
            </div>
          </div>

          {/* Tix / Currency Readout */}
          <div className="bg-[#111827]/90 border-2 border-[#374151] rounded px-3 py-1.5 shadow-lg flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-bold flex items-center gap-1">
              <span className="text-[#f5cd2f] font-black text-sm">🎟️</span> TIX (COINS):
            </span>
            <span className="tabular-nums font-extrabold text-[#f5cd2f] text-sm">{stats.tix}</span>
          </div>

          {/* Toast Notification on Respawn */}
          {showToast && (
            <div className="bg-[#289b38] border-2 border-black text-white text-xs font-mono font-bold px-3 py-1 rounded shadow-lg flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span>RESPAWNED AT CHECKPOINT!</span>
            </div>
          )}

          {/* Toast Notification on Map Restart */}
          {showMapToast && (
            <div className="bg-[#da7428] border-2 border-black text-white text-xs font-mono font-bold px-3 py-1 rounded shadow-lg flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>MAP RESTARTED TO ORIGINAL STATE!</span>
            </div>
          )}

          {/* Action buttons row: RESPAWN CHARACTER, RESTART MAP, Mouse Look, World Switch, Audio */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 max-w-[420px]">
            {/* Prominent Classic Roblox-style Respawn Button */}
            <button
              onClick={triggerRespawn}
              className="flex items-center gap-1.5 bg-[#c4281c] hover:bg-[#e03123] text-white border-2 border-black px-3 py-1.5 rounded font-mono font-black text-xs shadow-[0_2px_0_#000] active:translate-y-0.5 active:shadow-none transition cursor-pointer"
              title="Respawn / Reset Character (Hotkey: Backspace)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              <span>RESPAWN CHARACTER</span>
            </button>

            {/* Dedicated RESTART THE MAP Button */}
            <button
              onClick={triggerRestartMap}
              className="flex items-center gap-1.5 bg-[#da7428] hover:bg-[#eb8334] text-white border-2 border-black px-3 py-1.5 rounded font-mono font-black text-xs shadow-[0_2px_0_#000] active:translate-y-0.5 active:shadow-none transition cursor-pointer"
              title="Restart Map: Clears debris, rebuilds all default blocks & resets map (Hotkey: Shift+M)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>RESTART THE MAP</span>
            </button>

            {/* Mouse-Look / Camera Orbit Toggle */}
            <button
              onClick={onTogglePointerLock}
              className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 rounded font-mono font-black text-xs shadow-[0_2px_0_#000] active:translate-y-0.5 active:shadow-none transition cursor-pointer ${
                stats.isPointerLocked
                  ? 'bg-[#289b38] hover:bg-[#32b844] text-white ring-2 ring-yellow-400'
                  : 'bg-[#1e3a5f] hover:bg-[#254877] text-gray-200'
              }`}
              title="Toggle Fullscreen Mouse Look / Camera Orbit (Hotkey: L or Click & Drag mouse)"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <span>{stats.isPointerLocked ? 'CAMERA LOCKED (ESC/L)' : 'MOUSE LOOK [L]'}</span>
            </button>

            {/* World Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowWorldMenu(!showWorldMenu)}
                className="bg-[#0d69ac] hover:bg-[#1282d4] text-white border border-[#f5cd2f] px-2.5 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition shadow"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{currentWorldDef.name}</span>
              </button>

              {showWorldMenu && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#111827] border-2 border-[#374151] rounded shadow-xl py-1 z-30">
                  {WORLDS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onSwitchWorld(w.id);
                        setShowWorldMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-[#1f2937] transition ${
                        stats.currentWorld === w.id ? 'text-[#f5cd2f] font-bold bg-[#1e3a5f]' : 'text-gray-200'
                      }`}
                    >
                      <span>{w.name}</span>
                      <span className="text-[10px] px-1 py-0.2 bg-[#374151] rounded">{w.badge}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onToggleMute}
              className="p-1.5 bg-[#1f2937] hover:bg-[#374151] text-gray-200 border border-[#4b5563] rounded text-xs cursor-pointer transition shadow"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            </button>
          </div>
        </div>

        {/* Top-Right: Classic 2006 Multiplayer Server Leaderboard */}
        <div className="pointer-events-auto bg-[#111827]/95 border-2 border-[#374151] rounded shadow-2xl overflow-hidden min-w-[280px] max-w-[340px]">
          {/* Header */}
          <div className="bg-[#0d69ac] px-3 py-1.5 text-white font-mono font-bold text-xs flex items-center justify-between border-b border-[#374151]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>SERVER PLAYERS ({playerCount}/8)</span>
            </div>
            <span className="tabular-nums text-[#f5cd2f] text-[11px]">{stats.fps} FPS</span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-5 px-2.5 py-1 bg-[#1f2937] text-[10px] font-mono text-gray-300 font-bold border-b border-[#374151]">
            <span className="col-span-2">PLAYER</span>
            <span className="text-right">PING</span>
            <span className="text-right">TIX</span>
            <span className="text-right">W.O.</span>
          </div>

          {/* Player Rows (Host connects first, then other classic players join!) */}
          <div className="max-h-44 overflow-y-auto divide-y divide-[#374151]/50">
            {(stats.onlinePlayers && stats.onlinePlayers.length > 0
              ? stats.onlinePlayers
              : [
                  {
                    id: 'local',
                    name: playerName,
                    color: stats.activeColor || '#f5cd2f',
                    ping: 18,
                    tix: stats.tix,
                    blocksPlaced: stats.blocksPlaced,
                    wipeouts: stats.wipeouts,
                    isHost: true,
                  },
                ]
            ).map((p) => (
              <div
                key={p.id}
                className={`grid grid-cols-5 px-2.5 py-1.5 text-xs font-mono items-center transition ${
                  p.isHost ? 'bg-[#1e3a5f]/85 text-[#f5cd2f] font-bold' : 'bg-[#111827] text-gray-200'
                }`}
              >
                <div className="col-span-2 flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-black/40"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                  {p.isHost && (
                    <span className="text-[9px] bg-[#f5cd2f] text-black px-1 rounded font-bold uppercase">
                      HOST [YOU]
                    </span>
                  )}
                </div>
                <span className="text-right tabular-nums text-green-400 text-[11px]">{p.ping}ms</span>
                <span className="text-right tabular-nums text-yellow-300 font-bold">{p.tix}</span>
                <span className="text-right tabular-nums text-red-400">{p.wipeouts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle-Left to Bottom: Classic 2006 Multiplayer Server Chat Log */}
      <div className="flex items-end justify-between w-full pointer-events-none mt-auto">
        {/* Left Side: Authentic Retro Server Chat Box */}
        <div className="pointer-events-auto bg-[#111827]/95 border-2 border-[#374151] rounded-lg shadow-2xl w-80 sm:w-96 max-w-[90vw] flex flex-col overflow-hidden mb-2">
          {/* Chat Window Title Bar */}
          <div className="bg-[#1f2937] px-2.5 py-1 flex items-center justify-between border-b border-[#374151] text-[11px] font-mono text-gray-300 font-bold">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#f5cd2f]" />
              <span>SERVER CHAT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 hidden sm:inline">Press [/] or [T] to talk</span>
              <button
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                className="text-gray-400 hover:text-white cursor-pointer"
                title={isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
              >
                {isChatCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!isChatCollapsed && (
            <>
              {/* Messages feed */}
              <div
                ref={chatScrollRef}
                className="h-32 sm:h-36 overflow-y-auto p-2 text-xs font-mono space-y-1 select-text bg-[#0b0f17]/90"
              >
                {stats.chatFeed && stats.chatFeed.length > 0 ? (
                  stats.chatFeed.map((entry) => (
                    <div key={entry.id} className="leading-snug break-words">
                      {entry.isSystem ? (
                        <div className="text-[#f5cd2f] font-semibold text-[11px] bg-yellow-950/20 px-1 py-0.5 rounded border-l-2 border-[#f5cd2f]">
                          [SYSTEM]: <span className="text-cyan-300 font-normal">{entry.message}</span>
                        </div>
                      ) : (
                        <div className="text-gray-200">
                          <span
                            className={`font-bold ${
                              entry.sender === playerName ? 'text-[#f5cd2f]' : 'text-blue-300'
                            }`}
                          >
                            [{entry.sender}]:
                          </span>{' '}
                          <span>{entry.message}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic text-[11px]">No messages yet...</div>
                )}
              </div>

              {/* Chat Quick Input Form */}
              <form
                onSubmit={handleChatSubmit}
                className="p-1.5 bg-[#18202f] border-t border-[#374151] flex items-center gap-1.5"
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  maxLength={48}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message or 3D chat bubble..."
                  className="flex-1 bg-black/70 border border-gray-600 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-[#f5cd2f]"
                />
                <button
                  type="submit"
                  className="bg-[#0d69ac] hover:bg-[#1282d4] text-white px-2.5 py-1 rounded text-xs font-bold font-mono cursor-pointer transition shadow flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Center Reticle (Low-Occlusion Crosshair) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60">
        <div className="w-3.5 h-3.5 border-2 border-white/80 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-[#f5cd2f] rounded-full" />
        </div>
      </div>

      {/* Bottom Center: Unified Collapsible Dock (HopperBin + Building Controls) */}
      <div className="w-full flex flex-col items-center pointer-events-auto">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="flex items-center gap-1.5 bg-[#111827]/90 hover:bg-[#1f2937] text-gray-300 hover:text-white border-t-2 border-x-2 border-[#374151] px-4 py-1 rounded-t text-xs font-mono font-bold cursor-pointer transition"
        >
          {isDockCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#f5cd2f]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#f5cd2f]" />
          )}
          <span>{isDockCollapsed ? 'Show HopperBin & Tools (H)' : 'Hide Dock (H)'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="bg-[#111827]/95 border-2 border-[#374151] rounded shadow-2xl p-2.5 max-w-[940px] w-full flex flex-col gap-2">
            {/* HopperBin 7-Slot Toolbelt */}
            <div className="grid grid-cols-7 gap-1.5">
              {TOOLS.map((tool) => {
                const isActive = stats.activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`p-2 rounded border-2 transition cursor-pointer flex flex-col items-center justify-between text-center relative ${
                      isActive
                        ? 'bg-[#0d69ac] border-[#f5cd2f] shadow-lg -translate-y-1 text-white'
                        : 'bg-[#1f2937] border-[#374151] hover:border-gray-500 text-gray-300'
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[10px] font-mono font-bold text-gray-400">
                      [{tool.slotKey}]
                    </span>
                    <span className="text-xl my-0.5">{tool.icon}</span>
                    <span className="text-[11px] font-bold font-mono truncate w-full leading-tight">
                      {tool.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Building Palettes Row (When Stamper or Paint is active) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#374151] text-xs font-mono">
              {/* Shape Selectors */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-bold mr-1">SHAPE:</span>
                {(['brick', 'wedge', 'cylinder', 'sphere', 'spring', 'tnt', 'conveyor'] as BlockShape[]).map(
                  (shape) => (
                    <button
                      key={shape}
                      onClick={() => {
                        onSelectShape(shape);
                        sounds.playEquip();
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-bold uppercase cursor-pointer border transition ${
                        stats.activeShape === shape
                          ? 'bg-[#f5cd2f] text-black border-black font-extrabold'
                          : 'bg-[#1f2937] text-gray-300 border-[#374151] hover:border-gray-500'
                      }`}
                    >
                      {shape}
                    </button>
                  )
                )}
              </div>

              {/* Anchored Physics Toggle */}
              <button
                onClick={onToggleAnchored}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer transition ${
                  stats.isAnchored
                    ? 'bg-[#289b38] text-white border-green-300'
                    : 'bg-[#c4281c] text-white border-red-300'
                }`}
                title="Anchored blocks stay fixed in place. Unanchored blocks tumble and react to physics!"
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>{stats.isAnchored ? 'ANCHORED (STATIC)' : 'UNANCHORED (PHYSICS)'}</span>
              </button>

              {/* Quick Respawn Button in dock */}
              <button
                onClick={triggerRespawn}
                className="flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer transition bg-[#c4281c] hover:bg-[#e03123] text-white border-black shadow"
                title="Respawn character back at spawn point (Backspace)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white" />
                <span>RESPAWN</span>
              </button>

              {/* Quick Restart Map Button in dock */}
              <button
                onClick={triggerRestartMap}
                className="flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer transition bg-[#da7428] hover:bg-[#eb8334] text-white border-black shadow"
                title="Restart the entire map (Shift+M)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span>RESTART MAP</span>
              </button>

              {/* Quick Camera Look Button in dock */}
              <button
                onClick={onTogglePointerLock}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer transition border-black shadow ${
                  stats.isPointerLocked
                    ? 'bg-[#289b38] text-white ring-1 ring-yellow-400'
                    : 'bg-[#1e3a5f] hover:bg-[#254877] text-gray-200'
                }`}
                title="Toggle Mouse Look / Pointer Lock (Hotkey: L or Drag Mouse)"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>{stats.isPointerLocked ? 'MOUSE LOOK ON' : 'MOUSE LOOK [L]'}</span>
              </button>

              {/* Color Swatches */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-bold mr-1">COLOR:</span>
                {CLASSIC_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectColor(c.hex);
                      sounds.playSnap();
                    }}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-sm border cursor-pointer transition ${
                      stats.activeColor === c.hex
                        ? 'border-white scale-110 shadow-md ring-2 ring-[#f5cd2f]'
                        : 'border-black/50 hover:scale-105'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
