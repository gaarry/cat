/** 宠物物种 */
export type PetSpecies = 'cat' | 'dog' | 'parrot' | 'rabbit' | 'pig';

/** 品种信息 */
export interface Breed {
  id: string;
  name: string;
  nameEn?: string;
  species: PetSpecies;
  description?: string;
}

/** 性格标签 */
export interface PersonalityOption {
  id: string;
  label: string;
  description?: string;
}

/** 语音风格：性别 + 动物特质 */
export interface VoiceStyle {
  id: string;
  name: string;
  gender: 'male' | 'female';
  trait: string; // 如：温柔、活泼、慵懒、俏皮
  description?: string;
}

/** 用户创建的宠物档案 */
export interface PetProfile {
  id: string;
  species: PetSpecies;
  breedId: string;
  breedName: string;
  personalityIds: string[];
  voiceStyleId: string;
  /** 用户上传的原始照片 URL（本地或上传后） */
  photoUrl?: string;
  /** 生成后的宫崎骏风格头像/立绘 URL */
  generatedImageUrl?: string;
  name?: string;
  createdAt: number;
}

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** 是否正在播放 TTS */
  isPlaying?: boolean;
}
