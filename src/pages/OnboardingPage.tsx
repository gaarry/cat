import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoUpload } from '../components/PhotoUpload';
import { breeds } from '../data/breeds';
import { usePetStore } from '../store/usePetStore';
import type { PetSpecies, PetProfile, ImageStyle } from '../types/pet';
import { generatePetImageQwen } from '../api/qwenImage';
import { identifyPetFromImage } from '../api/identifyPet';
import { Heart, ChevronRight, Loader2, Sparkles, Zap, Settings } from 'lucide-react';

// 图像生成模型选项
export const IMAGE_GEN_MODELS = [
  { id: 'qwen-image-2.0-pro', name: 'Qwen Image 2.0 Pro', desc: '最新最强生成', price: '¥0.5/张' },
  { id: 'qwen-image-2.0', name: 'Qwen Image 2.0', desc: '平衡性价比', price: '¥0.2/张' },
  { id: 'qwen-image-max', name: 'Qwen Image Max', desc: '最高质量', price: '¥0.5/张' },
];

// 视觉识别模型选项  
export const VISION_MODELS = [
  { id: 'qwen2.5-vl-32b-instruct', name: 'Qwen2.5 VL 32B', desc: '视觉理解强' },
  { id: 'qwen-plus', name: 'Qwen Plus', desc: '综合能力强' },
];

const STEPS = ['photo', 'generate', 'name'] as const;

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  const setGeneratingImage = usePetStore((s) => s.setGeneratingImage);
  const isGeneratingImage = usePetStore((s) => s.isGeneratingImage);
  
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  
  // 模型选择
  const [imageModel, setImageModel] = useState('qwen-image-2.0-pro');
  const [visionModel, setVisionModel] = useState('qwen2.5-vl-32b-instruct');
  const [showSettings, setShowSettings] = useState(false);
  
  // 照片
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  // 识别
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedInfo, setIdentifiedInfo] = useState<{
    species: string;
    breed: string;
    color: string;
    features: string;
  } | null>(null);
  
  // 宠物信息
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

  const handleQuickCreate = async () => {
    if (!photoDataUrl) return;
    setIsIdentifying(true);
    setGeneratingImage(true);
    
    try {
      const identifyResult = await identifyPetFromImage(photoDataUrl, visionModel);
      
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
      
      if (!finalSpecies) finalSpecies = 'cat';
      if (!finalBreedId) finalBreedId = breeds.find(b => b.species === finalSpecies)?.id || null;
      
      const breedObj = breeds.find(b => b.id === finalBreedId);
      if (breedObj) {
        const imageUrl = await generatePetImageQwen({
          breedName: breedObj.name,
          species: finalSpecies,
          style: styleId,
          color: finalColor,
          features: finalFeatures,
          model: imageModel,
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
      setStepIndex(2);
    }
  };

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
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* 模型设置面板 */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 bg-gray-50 rounded-xl p-4 overflow-hidden"
            >
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">图像生成模型</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_GEN_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setImageModel(m.id)}
                      className={`p-2 rounded-lg text-left text-sm ${
                        imageModel === m.id 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs opacity-80">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">视觉识别模型</label>
                <div className="grid grid-cols-2 gap-2">
                  {VISION_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setVisionModel(m.id)}
                      className={`p-2 rounded-lg text-left text-sm ${
                        visionModel === m.id 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs opacity-80">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              
              {photoDataUrl && (
                <div className="mt-6 w-full space-y-3">
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
                </div>
              )}
            </motion.div>
          )}

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

          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
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
              
              <div className="flex flex-col items-center">
                {generatedImageUrl && (
                  <img
                    src={generatedImageUrl}
                    alt="专属形象"
                    className="w-40 h-40 rounded-2xl object-cover border-4 border-amber-200 shadow-lg mb-4"
                  />
                )}
              </div>
              
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
