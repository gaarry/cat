import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoUpload } from '../components/PhotoUpload';
import { breeds } from '../data/breeds';
import { usePetStore } from '../store/usePetStore';
import type { PetSpecies, PetProfile, ImageStyle } from '../types/pet';
import { generatePetImageQwen } from '../api/qwenImage';
import { identifyPetFromImage } from '../api/identifyPet';
import { Heart, ChevronRight, Loader2, Sparkles, Settings, RefreshCw } from 'lucide-react';

// 图像生成模型选项
export const IMAGE_GEN_MODELS = [
  // Qwen 模型
  { id: 'qwen-image-2.0-pro', name: 'Qwen Image 2.0 Pro', desc: '最新最强生成', provider: 'qwen' },
  { id: 'qwen-image-2.0', name: 'Qwen Image 2.0', desc: '平衡性价比', provider: 'qwen' },
  { id: 'qwen-image-max', name: 'Qwen Image Max', desc: '最高质量', provider: 'qwen' },
  // burn.hair 模型 (DALL-E 3)
  { id: 'dall-e-3', name: 'DALL-E 3', desc: 'OpenAI DALL-E 3', provider: 'burnhair' },
];

// 视觉识别模型选项
export const VISION_MODELS = [
  // Qwen 模型（默认）
  { id: 'qwen2.5-vl-32b-instruct', name: 'Qwen2.5 VL 32B', desc: '视觉理解强，推荐识别', provider: 'qwen' },
  { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus', desc: '新一代多模态', provider: 'qwen' },
  { id: 'qwen-plus', name: 'Qwen Plus', desc: '综合能力强', provider: 'qwen' },
  // burn.hair 模型 (GPT-4o)
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'OpenAI 视觉模型', provider: 'burnhair' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: '更快更便宜', provider: 'burnhair' },
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
const STEPS = ['photo', 'identify', 'generate', 'name'] as const;

function mapSpeciesFromModel(rawSpecies: string): PetSpecies {
  const s = rawSpecies.trim().toLowerCase();
  if (s.includes('cat') || s.includes('猫')) return 'cat';
  if (s.includes('dog') || s.includes('犬') || s.includes('狗')) return 'dog';
  if (s.includes('rabbit') || s.includes('bunny') || s.includes('兔')) return 'rabbit';
  if (s.includes('parrot') || s.includes('bird') || s.includes('鹦鹉') || s.includes('鸟')) return 'parrot';
  if (s.includes('pig') || s.includes('猪')) return 'pig';
  return 'other';
}

// 从品种名匹配（支持中文名或英文名）
function matchBreed(breedName: string, species: string): { id: string; name: string } | null {
  const trim = breedName.trim();
  if (!trim) return null;
  const lower = trim.toLowerCase();
  const speciesBreeds = breeds.filter(b => b.species === species);

  const exactEn = speciesBreeds.find(b => b.nameEn?.toLowerCase() === lower);
  if (exactEn) return { id: exactEn.id, name: exactEn.name };
  const exactCn = speciesBreeds.find(b => b.name === trim);
  if (exactCn) return { id: exactCn.id, name: exactCn.name };

  const partialEn = speciesBreeds.find(b =>
    b.nameEn?.toLowerCase().includes(lower) || lower.includes(b.nameEn?.toLowerCase() || '')
  );
  if (partialEn) return { id: partialEn.id, name: partialEn.name };
  const partialCn = speciesBreeds.find(b =>
    b.name.includes(trim) || trim.includes(b.name)
  );
  if (partialCn) return { id: partialCn.id, name: partialCn.name };

  return null;
}

export function OnboardingPage() {
  const setPet = usePetStore((s) => s.setPet);
  
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  
  // 模型选择（默认千问：图像生成 Qwen Image 2.0 Pro，识别 Qwen 3.5 Plus）
  const [imageModel, setImageModel] = useState('qwen-image-2.0-pro');
  const [visionModel, setVisionModel] = useState('qwen3.5-plus');
  const [showSettings, setShowSettings] = useState(false);
  
  // 照片
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  // 识别状态
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 错误提示
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  // 可编辑的宠物信息
  const [species, setSpecies] = useState<PetSpecies>('cat');
  const [speciesRaw, setSpeciesRaw] = useState<string>('猫');
  const [breedId, setBreedId] = useState<string>('cat-british');
  const [breedName, setBreedName] = useState<string>('英国短毛猫');
  const [color, setColor] = useState<string>('');
  const [features, setFeatures] = useState<string>('');
  const [styleId, setStyleId] = useState<ImageStyle>('realistic');
  const [personalityIds] = useState<string[]>(['gentle']);
  const [voiceStyleId] = useState<string | null>('female-gentle');
  
  // 生成的图像
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  // 名字
  const [petName, setPetName] = useState('');

  const breed = breeds.find((b) => b.id === breedId);
  const suggestedBreeds = species === 'other' ? breeds : breeds.filter((b) => b.species === species);

  const handlePhotoChange = useCallback((_file: File | null, url?: string) => {
    setPhotoDataUrl(url ?? null);
    setGeneratedImageUrl(null);
  }, []);

  // AI 识别：先切步骤再批量更新状态，减少界面等待感
  const handleIdentify = async () => {
    if (!photoDataUrl) return;
    setIsIdentifying(true);
    setIdentifyError(null);

    try {
      // 获取 provider
      const visionProvider = VISION_MODELS.find(m => m.id === visionModel)?.provider || 'qwen';
      const result = await identifyPetFromImage(photoDataUrl, visionModel, visionProvider);

      if (result) {
        const speciesRawNext = result.species?.trim() || '未知物种';
        const mappedSpecies = mapSpeciesFromModel(result.species);
        const matched = mappedSpecies === 'other' ? null : matchBreed(result.breed, mappedSpecies);
        const fallbackBreedName = result.breed?.trim() || breedName || '未知品种';
        const breedIdNext = matched?.id || `${mappedSpecies}-custom`;
        const breedNameNext = fallbackBreedName;

        setStepIndex(1);
        setSpeciesRaw(speciesRawNext);
        setSpecies(mappedSpecies);
        setBreedId(breedIdNext);
        setBreedName(breedNameNext);
        setColor(result.color || '');
        setFeatures(result.features || '');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '识别失败，请重试';
      console.error('识别失败:', msg);
      setIdentifyError(msg);
    } finally {
      setIsIdentifying(false);
    }
  };

  // 生成图像
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedImageUrl(null);
    
    try {
      const breedNameForGen = breedName || breed?.name || '未知品种';
      
      const imageProvider = IMAGE_GEN_MODELS.find(m => m.id === imageModel)?.provider || 'qwen';
      const speciesForGen = speciesRaw?.trim() || species || 'pet';
      const imageUrl = await generatePetImageQwen({
        breedName: breedNameForGen,
        species: speciesForGen,
        style: styleId,
        color: color || undefined,
        features: features || undefined,
        model: imageModel,
        referenceImage: photoDataUrl || undefined, // 上传的宠物照片，供生成时参考
        provider: imageProvider,
      });
      
      setGeneratedImageUrl(imageUrl || photoDataUrl);
      setStepIndex(3); // 直接进入「起名」步骤展示结果，避免停在加载页
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败';
      console.error('生成失败:', msg);
      setGenerateError(`生成失败: ${msg}，将使用原图`);
      setGeneratedImageUrl(photoDataUrl);
      setStepIndex(3);
    } finally {
      setIsGenerating(false);
    }
  };

  // 完成
  const handleFinish = () => {
    const breedObj = breeds.find(b => b.id === breedId);
    const matched = species === 'other' ? null : matchBreed(breedName, species);
    const breedIdForSave = matched?.id || breedId || `${species}-custom`;
    const breedNameForSave = breedName || matched?.name || breedObj?.name || '未知品种';
    
    const pet: PetProfile = {
      id: crypto.randomUUID(),
      species,
      speciesRaw: speciesRaw || undefined,
      breedId: breedIdForSave,
      breedName: breedNameForSave,
      breedRaw: breedName || undefined,
      personalityIds,
      style: styleId,
      voiceStyleId: voiceStyleId!,
      photoUrl: photoDataUrl || undefined,
      generatedImageUrl: generatedImageUrl || undefined,
      name: petName.trim() || breedNameForSave || '小可爱',
      createdAt: Date.now(),
    };
    setPet(pet);
  };

  const canIdentify = photoDataUrl && !isIdentifying;
  const canFinish = petName.trim() || breedName || breed?.name;

  // 获取当前物种的emoji
  const getSpeciesEmoji = () => {
    switch (species) {
      case 'cat': return '🐱';
      case 'dog': return '🐕';
      case 'parrot': return '🦜';
      case 'rabbit': return '🐰';
      case 'pig': return '🐷';
      case 'other': return '🐾';
      default: return '🐾';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--card-bg)] rounded-3xl shadow-xl border border-amber-200/60 p-6"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="text-amber-500" size={24} />
          <h1 className="text-lg font-bold text-amber-900">创建专属宠物伙伴</h1>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* 模型设置面板 */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 bg-gray-50 rounded-xl p-3 overflow-hidden text-sm"
            >
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-600 mb-1 block">图像生成模型</label>
                <div className="grid grid-cols-3 gap-1">
                  {IMAGE_GEN_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setImageModel(m.id)}
                      className={`p-1.5 rounded text-xs ${
                        imageModel === m.id ? 'bg-purple-500 text-white' : 'bg-white border text-gray-600'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">视觉识别模型</label>
                <div className="grid grid-cols-2 gap-1">
                  {VISION_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setVisionModel(m.id)}
                      className={`p-1.5 rounded text-xs ${
                        visionModel === m.id ? 'bg-purple-500 text-white' : 'bg-white border text-gray-600'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 进度条 */}
        <div className="flex gap-1 mb-4">
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
                <div className="mt-4 w-full">
                  <button
                    onClick={handleIdentify}
                    disabled={!canIdentify}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isIdentifying ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        AI 智能识别中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        AI 智能识别
                      </>
                    )}
                  </button>
                  
                  {/* 识别错误提示 */}
                  {identifyError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                      {identifyError}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* 步骤2: 确认信息 + 选择风格 + 生成 */}
          {step === 'identify' && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="text-center">
                <Sparkles className="text-purple-500 mx-auto mb-1" size={28} />
                <h3 className="text-base font-medium text-purple-700">确认宠物信息</h3>
              </div>
              
              {/* 可编辑的信息表单 */}
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                {/* 种类（默认使用模型识别结果，可手动调整；下拉仅提供建议） */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-12">种类</span>
                  <input
                    type="text"
                    list="species-options"
                    value={speciesRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const mapped = mapSpeciesFromModel(raw);
                      setSpeciesRaw(raw);
                      setSpecies(mapped);
                      setBreedId(`${mapped}-custom`);
                      if (!breedName.trim()) setBreedName('未知品种');
                    }}
                    placeholder="默认采用模型识别结果，可手动修改"
                    className="flex-1 text-sm px-2 py-1 rounded border"
                  />
                  <datalist id="species-options">
                    <option value="猫" />
                    <option value="狗" />
                    <option value="鹦鹉" />
                    <option value="兔子" />
                    <option value="猪" />
                    <option value="狐狸" />
                    <option value="马" />
                    <option value="仓鼠" />
                    <option value="乌龟" />
                  </datalist>
                </div>
                
                {/* 品种（默认使用模型识别结果，可手动调整） */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-12">品种</span>
                  <input
                    type="text"
                    list="breed-options"
                    value={breedName}
                    onChange={(e) => {
                      setBreedId(`${species}-custom`);
                      setBreedName(e.target.value);
                    }}
                    placeholder="默认采用模型识别结果，可手动修改"
                    className="flex-1 text-sm px-2 py-1 rounded border"
                  />
                  <datalist id="breed-options">
                    {suggestedBreeds.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                </div>
                
                {/* 毛色 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-12">毛色</span>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="如：蓝色、虎斑色"
                    className="flex-1 text-sm px-2 py-1 rounded border"
                  />
                </div>
                
                {/* 特征 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-12">特征</span>
                  <input
                    type="text"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder="如：圆脸、大眼睛"
                    className="flex-1 text-sm px-2 py-1 rounded border"
                  />
                </div>
              </div>
              
              {/* 风格选择 */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">选择生成风格</label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setStyleId(style.id)}
                      className={`p-2 rounded-lg text-xs ${
                        styleId === style.id 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    正在生成...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    生成专属形象
                  </>
                )}
              </button>
              
              {/* 生成错误提示 */}
              {generateError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                  {generateError}
                </div>
              )}
            </motion.div>
          )}

          {/* 步骤3: 生成中 */}
          {step === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center py-8"
            >
              <Loader2 className="animate-spin text-amber-500 mb-3" size={40} />
              <p className="text-amber-800">正在生成专属形象…</p>
              <p className="text-sm text-gray-500 mt-1">
                风格: {STYLE_OPTIONS.find(s => s.id === styleId)?.name}
              </p>
            </motion.div>
          )}

          {/* 步骤4: 名字 */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {/* 宠物信息 */}
              <div className="bg-purple-50 rounded-xl p-3 text-sm">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  {getSpeciesEmoji()}
                  <span>{breedName}</span>
                  <span className="text-purple-500">·</span>
                  <span>{STYLE_OPTIONS.find(s => s.id === styleId)?.name}</span>
                </div>
              </div>
              
              {/* 生成的图像 */}
              <div className="flex justify-center">
                {generatedImageUrl && (
                  <img
                    src={generatedImageUrl}
                    alt="专属形象"
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-amber-200 shadow-lg"
                  />
                )}
              </div>
              
              {/* 重新生成按钮 */}
              <button
                onClick={() => {
                  setStepIndex(1);
                }}
                className="w-full py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-50"
              >
                重新选择风格生成
              </button>
              
              {/* 名字输入 */}
              <div>
                <label className="text-sm font-medium text-amber-900 mb-1 block">
                  给你的宠物起个名字
                </label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder={breed?.name || '小可爱'}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-center"
                />
              </div>
              
              <button
                onClick={handleFinish}
                disabled={!canFinish}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                开始陪伴 <ChevronRight size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
