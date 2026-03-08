import { voiceStyles } from '../data/voices';
import { Mic } from 'lucide-react';

interface VoiceStyleSelectorProps {
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function VoiceStyleSelector({ selectedId, onChange }: VoiceStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {voiceStyles.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
            selectedId === v.id
              ? 'bg-amber-500 text-white shadow'
              : 'bg-white/80 border border-amber-200 text-amber-900 hover:bg-amber-50'
          }`}
        >
          <Mic size={18} />
          <span className="text-sm font-medium">{v.name}</span>
        </button>
      ))}
    </div>
  );
}
