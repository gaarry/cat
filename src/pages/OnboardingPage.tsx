import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoUpload } from '../components/PhotoUpload';
import { BreedSelector } from '../components/BreedSelector';
import { PersonalitySelector } from '../components/PersonalitySelector';
import { VoiceStyleSelector } from '../components/VoiceStyleSelector';
import { StyleSelector } from '../components/StyleSelector';
import { breeds } from '../data/breeds';
import { usePetStore } from '../store/usePetStore';
import type { PetSpecies, PetProfile, ImageStyle } from '../types/pet';
import { generatePetImageBurnHair } from '../api/burnHairImage';
import { Heart, ChevronRight, Loader2 } from 'lucide-react';

const STEPS = ['photo', 'breed', 'personality', 'style', 'voice', 'generate', 'name'] as const;

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  const setGeneratingImage = usePetStore((s) => s.setGeneratingImage);
  const isGeneratingImage = usePetStore((s) => s.isGeneratingImage);
  const [stepIndex, setStepIndex] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [breedId, setBreedId] = useState<string | null>(null);
  const [personalityIds, setPersonalityIds] = useState<string[]>([]);
  const [styleId, setStyleId] = useState<ImageStyle>('realistic');
  const [voiceStyleId, setVoiceStyleId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageFromApi, setImageFromApi] = useState(false);
  const [petName, setPetName] = useState('');

  const step = STEPS[stepIndex];
  const breed = breedId ? breeds.find((b) => b.id === breedId) : null;

  const handlePhotoChange = useCallback((_file: File | null, url?: string) => {
    setPhotoDataUrl(url ?? null);
  }, []);

  const canNext =
    (step === 'photo' && photoDataUrl) ||
    (step === 'breed' && species && breedId) ||
    (step === 'personality' && personalityIds.length > 0) ||
    (step === 'style' && styleId) ||
    (step === 'voice' && voiceStyleId) ||
    step === 'generate' ||
    (step === 'name' && petName.trim());

  const handleGenerate = async () => {
    if (!species || !breed) return;
    setGeneratingImage(true);
    try {
      const url = await generatePetImageBurnHair({
        breedName: breed.name,
        species,
        style: styleId,
      });
      if (url) {
        setGeneratedImageUrl(url);
        setImageFromApi(true);
      } else {
        setGeneratedImageUrl(photoDataUrl || '/vite.svg');
        setImageFromApi(false);
      }
    } catch (e) {
      console.error('图像生成失败:', e);
      setGeneratedImageUrl(photoDataUrl || '/vite.svg');
      setImageFromApi(false);
    } finally {
      setGeneratingImage(false);
      setStepIndex((i) => i + 1);
    }
  };

  const handleFinish = () => {
    const pet: PetProfile = {
      id: crypto.randomUUID(),
      species: species!,
      breedId: breedId!,
      breedName: breed!.name,
      personalityIds,
      style: styleId,
      voiceStyleId: voiceStyleId!,
      photoUrl: photoDataUrl || undefined,
      generatedImageUrl: generatedImageUrl || undefined,
      name: petName.trim() || breed?.name,
      createdAt: Date.now(),
    };
    setPet(pet);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--card-bg)] rounded-3xl shadow-xl border border-amber-200/60 p-8"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Heart className="text-amber-500" size={28} />
          <h1 className="text-xl font-bold text-amber-900">创建专属宠物伙伴</h1>
        </div>

        <div className="flex gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? 'bg-amber-500' : 'bg-amber-200'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'photo' && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center"
            >
              <PhotoUpload value={photoDataUrl ?? undefined} onChange={handlePhotoChange} />
            </motion.div>
          )}
          {step === 'breed' && (
            <motion.div
              key="breed"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <BreedSelector
                species={species}
                breedId={breedId}
                onSpeciesChange={setSpecies}
                onBreedChange={setBreedId}
              />
            </motion.div>
          )}
          {step === 'personality' && (
            <motion.div
              key="personality"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <PersonalitySelector selectedIds={personalityIds} onChange={setPersonalityIds} />
            </motion.div>
          )}
          {step === 'style' && (
            <motion.div
              key="style"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <p className="text-sm text-amber-800 mb-3">选择生成图像的风格</p>
              <StyleSelector selectedStyleId={styleId} onSelect={setStyleId} />
            </motion.div>
          )}
          {step === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <p className="text-sm text-amber-800 mb-3">选择宠物的语音风格（聊天与语音通话时使用）</p>
              <VoiceStyleSelector selectedId={voiceStyleId} onChange={setVoiceStyleId} />
            </motion.div>
          )}
          {step === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center py-6"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
                  <p className="text-amber-800">正在生成专属形象…</p>
                </>
              ) : (
                <>
                  <p className="text-amber-800 mb-4">点击下方按钮生成专属形象</p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!breed}
                    className="px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
                  >
                    生成形象
                  </button>
                </>
              )}
            </motion.div>
          )}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {generatedImageUrl && (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={generatedImageUrl}
                    alt="专属形象"
                    className="w-32 h-32 rounded-2xl object-cover border-2 border-amber-200 shadow"
                  />
                  {!imageFromApi && (
                    <p className="text-xs text-amber-700/80">
                      已使用上传照片作为形象（图像生成失败时可正常使用）
                    </p>
                  )}
                </div>
              )}
              <label className="block text-sm font-medium text-amber-900">给 TA 起个名字（可选）</label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder={breed?.name || '小可爱'}
                className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 flex items-center justify-center gap-2"
              >
                开始陪伴 <ChevronRight size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 'generate' && step !== 'name' && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))}
              disabled={!canNext}
              className="px-5 py-2 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center gap-1"
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
