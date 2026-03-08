import { personalities } from '../data/personalities';
import { motion } from 'framer-motion';

interface PersonalitySelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

export function PersonalitySelector({ selectedIds, onChange, max = 3 }: PersonalitySelectorProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-amber-800/80">最多选 {max} 个性格标签</p>
      <div className="flex flex-wrap gap-2">
        {personalities.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedIds.includes(p.id)
                ? 'bg-amber-500 text-white shadow'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
            title={p.description}
          >
            {p.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
