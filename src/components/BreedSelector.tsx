import { breeds, speciesLabels } from '../data/breeds';
import type { PetSpecies } from '../types/pet';
import { motion } from 'framer-motion';

const speciesOrder: PetSpecies[] = ['cat', 'dog', 'parrot', 'rabbit', 'pig'];

interface BreedSelectorProps {
  species: PetSpecies | null;
  breedId: string | null;
  onSpeciesChange: (s: PetSpecies) => void;
  onBreedChange: (id: string) => void;
}

export function BreedSelector({ species, breedId, onSpeciesChange, onBreedChange }: BreedSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-amber-900 mb-2">选择物种</label>
        <div className="flex flex-wrap gap-2">
          {speciesOrder.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeciesChange(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                species === s
                  ? 'bg-amber-500 text-white shadow'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {speciesLabels[s] || s}
            </button>
          ))}
        </div>
      </div>
      {species && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-amber-900">选择品种</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {breeds
              .filter((b) => b.species === species)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBreedChange(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    breedId === b.id
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/80 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
