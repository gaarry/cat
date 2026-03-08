import { useState, useCallback, useEffect } from 'react';
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
import { Heart, ChevronRight, Loader2, Sparkles, Zap } from 'lucide-react';

// 简化的步骤：photo -> quick (识别+生成) / full (完整流程) -> name
const STEPS = ['photo', 'generate', 'name'] as const;

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  const setGeneratingImage = usePetStore((s) => s.setGeneratingImage);
  const isGeneratingImage = usePetStore((s) => s.isGeneratingImage);
  
  // 步骤
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  
  // 照片
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  // 识别状态
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedInfo, setIdentifiedInfo] = useState<{
    species: string;
    breed: string;
    color: string;
    features: string;
  } | null>(null);
  
  // 宠物信息（使用默认值）
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [breedId, setBreedId] = useState<string | null>(null);
  const [personalityIds] = useState<string[]>(['gentle']);
  const [styleId] = useState<ImageStyle>('realistic');
  const [voiceStyleId] = useState<string | null>('female-gentle');
  
  // 生成的图像
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageFromApi, setImageFromApi] = useState(false);
  
  // 名字
  const [petName, setPetName] = useState('');
  
  const breed = breedId ? breeds.find((b) => b.id === breedId) : null;

  // 自动检测品种
  const mapSpeciesToPetSpecies = (s: string): PetSpecies | null => {
    const lower = s.toLowerCase();
    if (lower.includes('cat') || lower.includes('猫')) return 'cat';
    if (lower.includes('dog') || lower.includes('狗')) return 'dog';
    if (lower.includes('rabbit') || lower.includes('兔')) return 'rabbit';
    if (lower.includes('parrot') || lower.includes('鹦鹉')) return 'parrot';
    if (lower.includes('pig') || lower.includes('猪')) return 'pig';
    return null;
  };

  const findBreedId = (breedName: string, petSpecies: PetSpecies): string | null => {
    const lower = breedName.toLowerCase();
    const speciesBreeds = breeds.filter(b => b.species === petSpecies);
    const exact = speciesBreeds.find(b => b.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const partial = speciesBreeds.find(b => b.name.toLowerCase().includes(lower) || lower.includes(b.name.toLowerCase()));
    return partial?.id || null;
  };

  // 一键识别 + 生成
  const handleQuickCreate = async () => {
    if (!photoDataUrl) return;
    setIsIdentifying(true);
    setGeneratingImage(true);
    
    try {
      // 1. 识别宠物
      const identifyResult = await identifyPetFromImage(photoDataUrl);
      
      let finalSpecies: PetSpecies | null = species;
      let finalBreedId: string | null = breedId;
      let finalColor = '';
      let finalFeatures = '';
      
      if (identifyResult) {
        setIdentifiedInfo({
          species: identifyResult.species,
          breed: identifyResult.breed,
          color: identifyResult.color,
          features: identifyResult.features,
        });
        finalColor = identifyResult.color;
        finalFeatures = identifyResult.features;
        
        // 自动选择品种
        const detectedSpecies = mapSpeciesToPetSpecies(identifyResult.species);
        if (detectedSpecies) {
          finalSpecies = detectedSpecies;
          setSpecies(detectedSpecies);
          const detectedBreedId = findBreedId(identifyResult.breed, detectedSpecies);
          if (detectedBreedId) {
            finalBreedId = detectedBreedId;
            setBreedId(detectedBreedId);
          }
        }
      }
      
      // 如果没有识别成功，使用默认值
      if (!finalSpecies) finalSpecies = 'cat';
      if (!finalBreedId) finalBreedId = breeds.find(b => b.species === finalSpecies)?.id || null;
      
      // 2. 生成图像
      const breedObj = breeds.find(b => b.id === finalBreedId);
      if (breedObj) {
        const imageUrl = await generatePetImageQwen({
          breedName: breedObj.name,
          species: finalSpecies,
          style: styleId,
          color: finalColor,
          features: finalFeatures,
        });
        
        if (imageUrl) {
          setGeneratedImageUrl(imageUrl);
          setImageFromApi(true);
        } else {
          setGeneratedImageUrl(photoDataUrl);
          setImageFromApi(false);
        }
      }
    } catch (e) {
      console.error('创建失败:', e);
      setGeneratedImageUrl(photoDataUrl);
      setImageFromApi(false);
    } finally {
      setIsIdentifying(false);
      setGeneratingImage(false);
      setStepIndex(2); // 跳到名字步骤
    }
  };

  // 手动选择流程
  const handleManualCreate = async () => {
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

  // 完成
  const handleFinish = () => {
    if (!species || !breed) return;
    
    const pet: PetProfile = {
      id: crypto.randomUUID(),
      species,
      breedId: breed.id,
      breedName: breed.name,
      personalityIds,
      style: styleId,
      voiceStyleId: voiceStyleId!,
      photoUrl: photoDataUrl || undefined,
      generatedImageUrl: generatedImageUrl || undefined,
      name: petName.trim() || breed.name,
      createdAt: Date.now(),
    };
    setPet(pet);
  };

  const handlePhotoChange = useCallback((_file: File | null, url?: string) => {
    setPhotoDataUrl(url ?? null);
    setIdentifiedInfo(null);
  }, []);

  const canQuickCreate = photoDataUrl && !isIdentifying && !isGeneratingImage;
  const canManualCreate = species && breed && !isGeneratingImage;

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

        {/* 进度条 */}
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
          {/* 步骤1: 上传照片 */}
          {step === 'photo' && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center"
            >
              <PhotoUpload value={photoDataUrl ?? undefined} onChange={handlePhotoChange} />
              
              {photoDataUrl && (
                <div className="mt-6 w-full space-y-3">
                  {/* 一键创建按钮 */}
                  <button
                    onClick={handleQuickCreate}
                    disabled={!canQuickCreate}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    {isIdentifying || isGeneratingImage ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {isIdentifying ? 'AI 识别中...' : '生成形象中...'}
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        一键创建（AI 识别 + 生成）
                      </>
                    )}
                  </button>
                  
                  {/* 手动选择按钮 */}
                  <button
                    onClick={handleManualCreate}
                    disabled={!canManualCreate}
                    className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 hover:bg-amber-600 transition-colors"
                  >
                    手动选择（更多选项）
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 步骤2: 生成中 */}
          {step === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center py-12"
            >
              <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
              <p className="text-amber-800">正在生成专属形象…</p>
              {identifiedInfo && (
                <p className="text-sm text-gray-500 mt-2">
                  已识别: {identifiedInfo.breed} · {identifiedInfo.color}
                </p>
              )}
            </motion.div>
          )}

          {/* 步骤3: 名字 */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              {/* 宠物信息摘要 */}
              {identifiedInfo && (
                <div className="bg-purple-50 rounded-xl p-4 text-sm">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <Sparkles size={16} />
                    <span>AI 已识别</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600">
                    <span>种类: {identifiedInfo.species}</span>
                    <span>品种: {identifiedInfo.breed}</span>
                    {identifiedInfo.color && <span>毛色: {identifiedInfo.color}</span>}
                    {identifiedInfo.features && <span>特征: {identifiedInfo.features}</span>}
                  </div>
                </div>
              )}
              
              {/* 生成的图像 */}
              <div className="flex flex-col items-center">
                {generatedImageUrl && (
                  <img
                    src={generatedImageUrl}
                    alt="专属形象"
                    className="w-40 h-40 rounded-2xl object-cover border-4 border-amber-200 shadow-lg mb-4"
                  />
                )}
                {!imageFromApi && (
                  <p className="text-xs text-amber-700/80 mb-4">
                    已使用上传照片（AI 生成失败时使用）
                  </p>
                )}
              </div>
              
              {/* 名字输入 */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  给你的宠物起个名字
                </label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder={breed?.name || '小可爱'}
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-center text-lg"
                />
              </div>
              
              <button
                onClick={handleFinish}
                disabled={!petName.trim() && !breed}
                className="w-full py-4 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 hover:bg-amber-600 flex items-center justify-center gap-2 text-lg"
              >
                开始陪伴 <ChevronRight size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
