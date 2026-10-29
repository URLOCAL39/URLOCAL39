import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { WorldId, WORLDS } from '../game/worlds';
import { Trophy, Play, RotateCcw, RefreshCw, Home, Volume2, VolumeX, Compass } from 'lucide-react';
import { sounds } from '../game/audio';

interface PauseVictoryModalProps {
  isPaused: boolean;
  isVictory: boolean;
  currentWorld: WorldId;
  tix: number;
  blocksPlaced: number;
  isMuted: boolean;
  onResume: () => void;
  onRespawn: () => void;
  onRestartMap: () => void;
  onSwitchWorld: (worldId: WorldId) => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
}

export const PauseVictoryModal: React.FC<PauseVictoryModalProps> = ({
  isPaused,
  isVictory,
  currentWorld,
  tix,
  blocksPlaced,
  isMuted,
  onResume,
  onRespawn,
  onRestartMap,
  onSwitchWorld,
  onReturnTitle,
  onToggleMute,
}) => {
  // Fire celebratory confetti on victory!
  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#f5cd2f', '#c4281c', '#0d69ac', '#289b38'],
      });
    }
  }, [isVictory]);

  if (!isPaused && !isVictory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono">
      <div className="bg-[#111827] border-4 border-[#f5cd2f] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-white text-center">
        {/* Banner */}
        <div className={`py-4 px-6 ${isVictory ? 'bg-[#f5cd2f] text-black' : 'bg-[#0d69ac] text-white'}`}>
          {isVictory ? (
            <div className="flex flex-col items-center">
              <Trophy className="w-12 h-12 mb-1 fill-black" />
              <h2 className="text-2xl font-black tracking-wider">OBBY COMPLETED!</h2>
              <p className="text-xs font-bold uppercase">You claimed the Golden DynaTrophy</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-black tracking-wider">GAME PAUSED</h2>
              <p className="text-xs text-gray-200">DynaBlocks 2004 Physics Simulation</p>
            </div>
          )}
        </div>

        {/* Body Stats */}
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 bg-[#1f2937] p-3 rounded border border-gray-700 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">TIX BALANCE</span>
              <span className="text-lg font-bold text-[#f5cd2f] tabular-nums">{tix}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">BLOCKS BUILT</span>
              <span className="text-lg font-bold text-white tabular-nums">{blocksPlaced}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            {isVictory ? (
              <button
                onClick={() => onSwitchWorld('crossroads')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#f5cd2f] hover:bg-[#ffe366] text-black font-extrabold rounded border-2 border-black cursor-pointer shadow active:translate-y-0.5"
              >
                <Compass className="w-4 h-4" />
                <span>EXPLORE CROSSROADS 2006</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sounds.playSnap();
                  onResume();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#289b38] hover:bg-[#32b844] text-white font-extrabold rounded border-2 border-black cursor-pointer shadow active:translate-y-0.5"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>RESUME GAME (ESC)</span>
              </button>
            )}

            <button
              onClick={() => {
                onRespawn();
                onResume();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1f2937] hover:bg-[#374151] text-gray-200 font-bold rounded border border-gray-600 cursor-pointer text-sm"
            >
              <RotateCcw className="w-4 h-4 text-yellow-400" />
              <span>RESPAWN AT CHECKPOINT</span>
            </button>

            <button
              onClick={() => {
                onRestartMap();
                onResume();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#da7428] hover:bg-[#eb8334] text-white font-extrabold rounded border-2 border-black cursor-pointer text-sm shadow active:translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>RESTART THE CURRENT MAP</span>
            </button>

            {/* Switch Worlds quick grid */}
            <div className="pt-2 border-t border-gray-700 text-left">
              <span className="text-xs text-gray-400 font-bold block mb-2">TELEPORT TO ANOTHER MAP:</span>
              <div className="grid grid-cols-2 gap-2">
                {WORLDS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSwitchWorld(w.id);
                      onResume();
                    }}
                    className={`p-2 rounded text-xs text-left border cursor-pointer transition ${
                      currentWorld === w.id
                        ? 'bg-[#1e3a5f] border-[#f5cd2f] text-[#f5cd2f] font-bold'
                        : 'bg-[#1f2937] border-gray-700 hover:border-gray-500 text-gray-300'
                    }`}
                  >
                    <div className="truncate font-bold">{w.name}</div>
                    <div className="text-[10px] text-gray-400">{w.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onToggleMute}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
                <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
              </button>

              <button
                onClick={onReturnTitle}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>EXIT TO TITLE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
