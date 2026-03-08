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
import { generatePetImageQwen } from '../api/qwenImage';
import { identifyPetFromImage } from '../api/identifyPet';
import { Heart, ChevronRight, Loader2, Sparkles } from 'lucide-react';

const STEPS = ['photo', 'identify', 'breed', 'personality', 'style', 'voice', 'generate', 'name'] as const;

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  const setGeneratingImage = usePetStore((s) => s.setGeneratingImage);
  const isGeneratingImage = usePetStore((s) => s.isGeneratingImage);
  const [stepIndex, setStepIndex] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedInfo, setIdentifiedInfo] = useState<{
    species: string;
    breed: string;
    color: string;
    features: string;
  } | null>(null);
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
    // Reset identification when photo changes
    setIdentifiedInfo(null);
  }, []);

  // Auto-detect species from identified info
  const mapSpeciesToPetSpecies = (s: string): PetSpecies | null => {
    const lower = s.toLowerCase();
    if (lower.includes('cat') || lower.includes('猫')) return 'cat';
    if (lower.includes('dog') || lower.includes('狗')) return 'dog';
    if (lower.includes('rabbit') || lower.includes('兔')) return 'rabbit';
    if (lower.includes('parrot') || lower.includes('鹦鹉')) return 'parrot';
    if (lower.includes('pig') || lower.includes('猪')) return 'pig';
    return null;
  };

  // Auto-find breed from identified breed name
  const findBreedId = (breedName: string, petSpecies: PetSpecies): string | null => {
    const lower = breedName.toLowerCase();
    const speciesBreeds = breeds.filter(b => b.species === petSpecies);
    // Try exact match first
    const exact = speciesBreeds.find(b => b.name.toLowerCase() === lower);
    if (exact) return exact.id;
    // Try partial match
    const partial = speciesBreeds.find(b => b.name.toLowerCase().includes(lower) || lower.includes(b.name.toLowerCase()));
    return partial?.id || null;
  };

  const handleIdentify = async () => {
    if (!photoDataUrl) return;
    setIsIdentifying(true);
    try {
      const result = await identifyPetFromImage(photoDataUrl);
      if (result) {
        setIdentifiedInfo({
          species: result.species,
          breed: result.breed,
          color: result.color,
          features: result.features,
        });
        // Auto-select species if confident
        const detectedSpecies = mapSpeciesToPetSpecies(result.species);
        if (detectedSpecies) {
          setSpecies(detectedSpecies);
          // Auto-select breed if confident
          const detectedBreedId = findBreedId(result.breed, detectedSpecies);
          if (detectedBreedId) {
            setBreedId(detectedBreedId);
          }
        }
      }
    } catch (e) {
      console.error('识别失败:', e);
    } finally {
      setIsIdentifying(false);
    }
  };

  const canNext =
    (step === 'photo' && photoDataUrl) ||
    (step === 'identify' && identifiedInfo) ||
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
      const url = await generatePetImageQwen({
        breedName: breed.name,
        species,
        style: styleId,
        color: identifiedInfo?.color,
        features: identifiedInfo?.features,
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

          {step === 'identify' && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center py-4"
            >
              {isIdentifying ? (
                <>
                  <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
                  <p className="text-purple-700 mb-2">AI 正在识别宠物...</p>
                  <p className="text-sm text-gray-500">分析品种和特征</p>
                </>
              ) : identifiedInfo ? (
                <>
                  <Sparkles className="text-purple-500 mb-4" size={48} />
                  <p className="text-purple-700 font-medium mb-3">识别完成！</p>
                  <div className="bg-purple-50 rounded-xl p-4 w-full text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">种类</span>
                      <span className="font-medium">{identifiedInfo.species}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">品种</span>
                      <span className="font-medium">{identifiedInfo.breed}</span>
                    </div>
                    {identifiedInfo.color && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">毛色</span>
                        <span className="font-medium">{identifiedInfo.color}</span>
                      </div>
                    )}
                    {identifiedInfo.features && (
                      <div className="pt-2 border-t border-purple-200">
                        <span className="text-gray-600 text-sm">特征</span>
                        <p className="text-gray-800">{identifiedInfo.features}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">已自动填充品种信息，你也可以手动修改</p>
                </>
              ) : (
                <>
                  <p className="text-purple-700 mb-4">上传照片后，AI 可以自动识别宠物品种和特征</p>
                  <button
                    type="button"
                    onClick={handleIdentify}
                    disabled={!photoDataUrl}
                    className="px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Sparkles size={18} />
                    AI 智能识别
                  </button>
                </>
              )}
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

        {step !== 'generate' && step !== 'name' && step !== 'identify' && (
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

        {step === 'identify' && identifiedInfo && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))}
              className="px-5 py-2 rounded-xl bg-amber-500 text-white font-medium flex items-center gap-1"
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
