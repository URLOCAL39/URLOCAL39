import React, { useState } from 'react';
import { WORLDS, WorldId } from '../game/worlds';
import { AvatarCustomization } from '../game/avatar';
import { Volume2, VolumeX, Sparkles, User, Play, Compass } from 'lucide-react';
import { sounds } from '../game/audio';

interface TitleScreenProps {
  onStartGame: (worldId: WorldId) => void;
  onOpenCustomizer: () => void;
  customization: AvatarCustomization;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenCustomizer,
  customization,
  isMuted,
  onToggleMute,
}) => {
  const [selectedWorld, setSelectedWorld] = useState<WorldId>('crossroads');

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 pointer-events-none select-none">
      {/* Top Bar with Audio & Customizer */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3 bg-[#111827]/85 border-2 border-[#374151] px-4 py-2 rounded shadow-lg text-white font-mono text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f5cd2f]" />
          <span>DYNA-CORE BUILD v0.4.1 (2004 ALPHA)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCustomizer}
            className="flex items-center gap-2 bg-[#0d69ac] hover:bg-[#1282d4] text-white font-bold px-4 py-2 border-2 border-[#f5cd2f] rounded shadow cursor-pointer transition active:translate-y-0.5 text-sm"
          >
            <User className="w-4 h-4" />
            <span>Customize: {customization.name}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 bg-[#1f2937]/90 hover:bg-[#374151] text-white border border-[#4b5563] rounded shadow cursor-pointer transition active:scale-95"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece / Bespoke Inline SVG Title Lockup with 30-40% Negative Space */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-auto text-center">
        {/* Bespoke 3D DynaBlocks Logo Lockup */}
        <div className="mb-4 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]">
          <svg width="440" height="110" viewBox="0 0 440 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full">
            {/* 3D Isometric Studded Brick Logo Symbol */}
            <g transform="translate(10, 10)">
              {/* Brick Base */}
              <polygon points="40,20 80,0 80,35 40,55 0,35 0,0" fill="#c4281c" stroke="#8b1b13" strokeWidth="2" />
              <polygon points="40,20 80,0 40,-20 0,0" fill="#e64235" stroke="#ffffff" strokeWidth="1" />
              <polygon points="80,0 80,35 40,55 40,20" fill="#9e1f16" />
              {/* Stud on top */}
              <ellipse cx="40" cy="-2" rx="14" ry="7" fill="#f5cd2f" stroke="#c4281c" strokeWidth="2" />
              <ellipse cx="40" cy="-6" rx="14" ry="7" fill="#ffe266" />
              <text x="40" y="-3" fontSize="8" fontWeight="bold" fill="#8b1b13" textAnchor="middle" fontFamily="monospace">DYNA</text>
            </g>

            {/* Title Typographic Lockup */}
            <g transform="translate(115, 65)">
              {/* 3D Drop Shadow */}
              <text x="2" y="3" fontSize="56" fontWeight="900" fill="#000000" fontFamily="Chakra Petch, Impact, sans-serif" letterSpacing="1">
                DYNABLOCKS
              </text>
              <text x="0" y="0" fontSize="56" fontWeight="900" fill="#f5cd2f" stroke="#000000" strokeWidth="4" fontFamily="Chakra Petch, Impact, sans-serif" letterSpacing="1">
                DYNABLOCKS
              </text>
              {/* Subtitle banner */}
              <rect x="2" y="10" width="290" height="24" rx="4" fill="#0d69ac" stroke="#ffffff" strokeWidth="1.5" />
              <text x="147" y="27" fontSize="13" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Chakra Petch, sans-serif" letterSpacing="2">
                ORIGINAL 2004 PHYSICS SANDBOX
              </text>
            </g>
          </svg>
        </div>

        <p className="text-gray-200 text-sm md:text-base max-w-lg mb-6 font-mono drop-shadow bg-black/60 px-4 py-1.5 rounded border border-white/20">
          The physics simulation and brick-building pioneer. Stack studded bricks, fire rocket artillery, topple dominoes, and conquer vintage obbies.
        </p>

        {/* World Selection Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full mb-6">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setSelectedWorld(w.id);
                sounds.playEquip();
              }}
              className={`p-3 rounded border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                selectedWorld === w.id
                  ? 'bg-[#1e3a5f]/95 border-[#f5cd2f] shadow-lg translate-y-[-2px]'
                  : 'bg-[#111827]/85 border-[#374151] hover:border-[#6b7280]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold bg-[#c4281c] text-white">
                  {w.badge}
                </span>
                {selectedWorld === w.id && <Sparkles className="w-3.5 h-3.5 text-[#f5cd2f]" />}
              </div>
              <div className="font-bold text-white text-sm leading-tight mb-1">{w.name}</div>
              <div className="text-[11px] text-gray-300 font-mono leading-tight">{w.tagline}</div>
            </button>
          ))}
        </div>

        {/* Primary Start CTA */}
        <button
          onClick={() => {
            sounds.playSnap();
            onStartGame(selectedWorld);
          }}
          className="group relative inline-flex items-center gap-3 px-10 py-4 text-xl font-black text-black bg-[#f5cd2f] hover:bg-[#ffe366] border-4 border-black rounded shadow-[0_8px_0_#b89410] active:translate-y-2 active:shadow-none transition cursor-pointer"
        >
          <Play className="w-6 h-6 fill-black" />
          <span>ENTER GAME WORLD</span>
          <span className="text-xs font-mono font-bold bg-black text-[#f5cd2f] px-2 py-0.5 rounded ml-2">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Flat Single Control-Hint Line */}
      <div className="w-full flex items-center justify-center pointer-events-auto">
        <div className="bg-[#111827]/90 border border-[#374151] px-6 py-2 rounded-full text-gray-300 font-mono text-xs md:text-sm shadow-md">
          <span className="text-[#f5cd2f] font-bold">WASD</span> Move · <span className="text-[#f5cd2f] font-bold">Space</span> Jump · <span className="text-[#f5cd2f] font-bold">Drag Mouse / L</span> Look · <span className="text-[#f5cd2f] font-bold">1-7</span> Tools · <span className="text-[#f5cd2f] font-bold">Backspace</span> Respawn · <span className="text-[#f5cd2f] font-bold">Esc</span> Pause
        </div>
      </div>
    </div>
  );
};
