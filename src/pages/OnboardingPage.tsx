import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoUpload } from '../components/PhotoUpload';
import { breeds, speciesLabels } from '../data/breeds';
import { usePetStore } from '../store/usePetStore';
import type { PetSpecies, PetProfile, ImageStyle } from '../types/pet';
import { generatePetImageQwen } from '../api/qwenImage';
import { identifyPetFromImage } from '../api/identifyPet';
import { Heart, ChevronRight, Loader2, Sparkles, Settings, Check } from 'lucide-react';

// 图像生成模型选项
export const IMAGE_GEN_MODELS = [
  { id: 'qwen-image-2.0-pro', name: 'Qwen Image 2.0 Pro', desc: '最新最强生成' },
  { id: 'qwen-image-2.0', name: 'Qwen Image 2.0', desc: '平衡性价比' },
  { id: 'qwen-image-max', name: 'Qwen Image Max', desc: '最高质量' },
];

// 视觉识别模型选项  
export const VISION_MODELS = [
  { id: 'qwen2.5-vl-32b-instruct', name: 'Qwen2.5 VL 32B', desc: '视觉理解强' },
  { id: 'qwen-plus', name: 'Qwen Plus', desc: '综合能力强' },
];

// 风格选项
const STYLE_OPTIONS: { id: ImageStyle; name: string; desc: string }[] = [
  { id: 'realistic', name: '写实风格', desc: '专业摄影效果' },
  { id: 'ghibli', name: '宫崎骏风格', desc: '吉卜力动画风格' },
  { id: 'anime', name: '二次元风格', desc: '日本动漫风格' },
  { id: 'emoji', name: 'Emoji 风格', desc: '3D 立体头像' },
  { id: 'simple', name: '淳朴画风', desc: '童趣手绘风格' },
];

// 步骤
const STEPS = ['photo', 'identify', 'style', 'generate', 'name'] as const;

// 从英文名匹配品种
function matchBreed(englishName: string, species: string): { id: string; name: string } | null {
  const lower = englishName.toLowerCase();
  const speciesBreeds = breeds.filter(b => b.species === species);
  
  const exact = speciesBreeds.find(b => b.nameEn?.toLowerCase() === lower);
  if (exact) return { id: exact.id, name: exact.name };
  
  const partial = speciesBreeds.find(b => 
    b.nameEn?.toLowerCase().includes(lower) || 
    lower.includes(b.nameEn?.toLowerCase() || '')
  );
  if (partial) return { id: partial.id, name: partial.name };
  
  return null;
}

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  const setGeneratingImage = usePetStore((s) => s.setGeneratingImage);
  
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  
  // 模型选择
  const [imageModel, setImageModel] = useState('qwen-image-2.0-pro');
  const [visionModel, setVisionModel] = useState('qwen2.5-vl-32b-instruct');
  const [showSettings, setShowSettings] = useState(false);
  
  // 照片
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  // 识别状态
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedInfo, setIdentifiedInfo] = useState<{
    species: string;
    breed: string;
    breedName: string;
    color: string;
    features: string;
  } | null>(null);
  
  // 宠物信息
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [breedId, setBreedId] = useState<string | null>(null);
  const [breedName, setBreedName] = useState<string>('');
  const [personalityIds] = useState<string[]>(['gentle']);
  const [styleId, setStyleId] = useState<ImageStyle>('realistic');
  const [voiceStyleId] = useState<string | null>('female-gentle');
  
  // 生成的图像
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  // 名字
  const [petName, setPetName] = useState('');
  
  const breed = breedId ? breeds.find((b) => b.id === breedId) : null;

  const handlePhotoChange = useCallback((_file: File | null, url?: string) => {
    setPhotoDataUrl(url ?? null);
    setIdentifiedInfo(null);
    setGeneratedImageUrl(null);
    setBreedId(null);
    setBreedName('');
  }, []);

  // AI 识别
  const handleIdentify = async () => {
    if (!photoDataUrl) return;
    setIsIdentifying(true);
    
    try {
      const result = await identifyPetFromImage(photoDataUrl, visionModel);
      
      if (result) {
        const petSpecies = result.species.toLowerCase();
        let mappedSpecies: PetSpecies | null = null;
        
        if (petSpecies.includes('cat') || petSpecies.includes('猫')) mappedSpecies = 'cat';
        else if (petSpecies.includes('dog') || petSpecies.includes('狗')) mappedSpecies = 'dog';
        else if (petSpecies.includes('rabbit') || petSpecies.includes('兔')) mappedSpecies = 'rabbit';
        else if (petSpecies.includes('parrot') || petSpecies.includes('鹦鹉')) mappedSpecies = 'parrot';
        else if (petSpecies.includes('pig') || petSpecies.includes('猪')) mappedSpecies = 'pig';
        
        if (mappedSpecies) {
          setSpecies(mappedSpecies);
          
          const matched = matchBreed(result.breed, mappedSpecies);
          let finalBreedName = result.breed;
          
          if (matched) {
            setBreedId(matched.id);
            setBreedName(matched.name);
            finalBreedName = matched.name;
          } else {
            const defaultBreed = breeds.find(b => b.species === mappedSpecies);
            if (defaultBreed) {
              setBreedId(defaultBreed.id);
              setBreedName(defaultBreed.name);
              finalBreedName = defaultBreed.name;
            }
          }
          
          setIdentifiedInfo({
            species: speciesLabels[mappedSpecies] || result.species,
            breed: result.breed,
            breedName: finalBreedName,
            color: result.color,
            features: result.features,
          });
          
          setStepIndex(2);
        }
      }
    } catch (e) {
      console.error('识别失败:', e);
    } finally {
      setIsIdentifying(false);
    }
  };

  // 生成图像
  const handleGenerateImage = async () => {
    if (!species || !breedId) return;
    setGeneratingImage(true);
    
    try {
      const breedObj = breeds.find(b => b.id === breedId);
      if (!breedObj) return;
      
      const imageUrl = await generatePetImageQwen({
        breedName: breedObj.name,
        species,
        style: styleId,
        color: identifiedInfo?.color,
        features: identifiedInfo?.features,
        model: imageModel,
      });
      
      setGeneratedImageUrl(imageUrl || photoDataUrl);
      setStepIndex(4);
    } catch (e) {
      console.error('生成失败:', e);
      setGeneratedImageUrl(photoDataUrl);
      setStepIndex(4);
    } finally {
      setGeneratingImage(false);
    }
  };

  // 完成
  const handleFinish = () => {
    if (!species || !breedId) return;
    
    const breedObj = breeds.find(b => b.id === breedId);
    
    const pet: PetProfile = {
      id: crypto.randomUUID(),
      species,
      breedId,
      breedName: breedObj?.name || breedName || petName,
      personalityIds,
      style: styleId,
      voiceStyleId: voiceStyleId!,
      photoUrl: photoDataUrl || undefined,
      generatedImageUrl: generatedImageUrl || undefined,
      name: petName.trim() || breedObj?.name || breedName || '小可爱',
      createdAt: Date.now(),
    };
    setPet(pet);
  };

  const canIdentify = photoDataUrl && !isIdentifying;
  const canFinish = petName.trim() || breedName || breed?.name;

  // 进入生成步骤时自动触发
  useEffect(() => {
    if (step === 'generate' && !generatedImageUrl) {
      handleGenerateImage();
    }
  }, [step]);

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
                        imageModel === m.id ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200 text-gray-700'
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
                        visionModel === m.id ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200 text-gray-700'
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
                <div className="mt-6 w-full">
                  <button
                    onClick={handleIdentify}
                    disabled={!canIdentify}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    {isIdentifying ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        AI 智能识别中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        AI 智能识别
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 步骤2: 识别结果确认 */}
          {step === 'identify' && identifiedInfo && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-center space-y-4"
            >
              <div>
                <Sparkles className="text-purple-500 mx-auto mb-2" size={40} />
                <h3 className="text-lg font-medium text-purple-700">已识别到你的宠物</h3>
              </div>
              
              <div className="bg-purple-50 rounded-xl py-6 px-4">
                <div className="text-3xl mb-2">{
                  identifiedInfo.species === '猫咪' ? '🐱' : 
                  identifiedInfo.species === '狗狗' ? '🐕' : 
                  identifiedInfo.species === '鹦鹉' ? '🦜' : 
                  identifiedInfo.species === '兔子' ? '🐰' : '🐷'
                }</div>
                <div className="text-xl font-bold text-purple-800">{identifiedInfo.breedName}</div>
                <div className="text-sm text-purple-600 mt-1">一只可爱的{identifiedInfo.species}</div>
              </div>
              
              <button
                onClick={() => setStepIndex(2)}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 flex items-center justify-center gap-2"
              >
                下一步 <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {/* 步骤3: 选择风格 */}
          {step === 'style' && (
            <motion.div
              key="style"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-medium text-center text-amber-900">选择生成风格</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {STYLE_OPTIONS.map(style => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setStyleId(style.id);
                      handleGenerateImage();
                    }}
                    className="p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
                  >
                    <div className="font-medium text-amber-900">{style.name}</div>
                    <div className="text-sm text-amber-600">{style.desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* 步骤4: 生成中 */}
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
              <p className="text-sm text-gray-500 mt-2">
                风格: {STYLE_OPTIONS.find(s => s.id === styleId)?.name}
              </p>
            </motion.div>
          )}

          {/* 步骤5: 名字 */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="bg-purple-50 rounded-xl p-4 text-sm">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <Sparkles size={16} />
                  <span>已识别: {identifiedInfo?.species} · {identifiedInfo?.breedName}</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check size={16} />
                  <span>风格: {STYLE_OPTIONS.find(s => s.id === styleId)?.name}</span>
                </div>
              </div>
              
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
                  placeholder={breed?.name || breedName || '小可爱'}
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-center text-lg"
                />
              </div>
              
              <button
                onClick={handleFinish}
                disabled={!canFinish}
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
