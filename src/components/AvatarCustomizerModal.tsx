import React, { useState } from 'react';
import { AvatarCustomization } from '../game/avatar';
import { CLASSIC_COLORS } from '../game/textures';
import { X, Check } from 'lucide-react';
import { sounds } from '../game/audio';

interface AvatarCustomizerModalProps {
  customization: AvatarCustomization;
  onSave: (customization: AvatarCustomization) => void;
  onClose: () => void;
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  customization,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<AvatarCustomization>({ ...customization });

  const handleSave = () => {
    sounds.playSnap();
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-[#111827] border-4 border-[#0d69ac] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-white font-mono">
        {/* Header */}
        <div className="bg-[#0d69ac] px-4 py-3 flex items-center justify-between border-b-2 border-[#f5cd2f]">
          <h2 className="text-lg font-bold tracking-wide flex items-center gap-2">
            <span>AVATAR WARDROBE (2004 VINTAGE)</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/30 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Player Name */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">PLAYER NAME</label>
            <input
              type="text"
              maxLength={16}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full bg-black/60 border border-gray-600 rounded px-3 py-1.5 text-sm text-[#f5cd2f] font-bold focus:outline-none focus:border-[#f5cd2f]"
            />
          </div>

          {/* Face Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">FACE DECAL</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'smile', label: 'Classic :]' },
                { id: 'oof', label: 'Shocked O_O' },
                { id: 'smirk', label: 'Smirk :>' },
                { id: 'robot', label: 'Robot 🤖' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setDraft({ ...draft, face: f.id as AvatarCustomization['face'] });
                    sounds.playEquip();
                  }}
                  className={`p-2 rounded border text-xs font-bold cursor-pointer transition ${
                    draft.face === f.id
                      ? 'bg-[#f5cd2f] text-black border-white'
                      : 'bg-[#1f2937] text-gray-300 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hat Accessory */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">RETRO HEADWEAR</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'helmet', label: 'Hardhat' },
                { id: 'cap', label: 'Red Cap' },
                { id: 'tophat', label: 'Top Hat' },
                { id: 'none', label: 'None' },
              ].map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setDraft({ ...draft, hat: h.id as AvatarCustomization['hat'] });
                    sounds.playEquip();
                  }}
                  className={`p-2 rounded border text-xs font-bold cursor-pointer transition ${
                    draft.hat === h.id
                      ? 'bg-[#0d69ac] text-white border-[#f5cd2f]'
                      : 'bg-[#1f2937] text-gray-300 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Colors Palette Grid */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">TORSO SHIRT COLOR</label>
            <div className="flex flex-wrap gap-1.5">
              {CLASSIC_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setDraft({ ...draft, torsoColor: c.hex });
                    sounds.playSnap();
                  }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded border cursor-pointer transition ${
                    draft.torsoColor === c.hex ? 'border-white scale-115 ring-2 ring-[#f5cd2f]' : 'border-black/50'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">LEGS / PANTS COLOR</label>
            <div className="flex flex-wrap gap-1.5">
              {CLASSIC_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setDraft({ ...draft, legsColor: c.hex });
                    sounds.playSnap();
                  }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded border cursor-pointer transition ${
                    draft.legsColor === c.hex ? 'border-white scale-115 ring-2 ring-[#f5cd2f]' : 'border-black/50'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">HEAD & SKIN TINT</label>
            <div className="flex flex-wrap gap-1.5">
              {CLASSIC_COLORS.slice(0, 7).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setDraft({ ...draft, headColor: c.hex, leftArmColor: c.hex, rightArmColor: c.hex });
                    sounds.playSnap();
                  }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded border cursor-pointer transition ${
                    draft.headColor === c.hex ? 'border-white scale-115 ring-2 ring-[#f5cd2f]' : 'border-black/50'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1f2937] px-4 py-3 flex items-center justify-end gap-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold bg-transparent hover:bg-white/10 text-gray-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded text-xs font-bold bg-[#f5cd2f] hover:bg-[#ffe366] text-black cursor-pointer shadow border-2 border-black active:translate-y-0.5"
          >
            <Check className="w-4 h-4" />
            <span>APPLY OUTFIT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
