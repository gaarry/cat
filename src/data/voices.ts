import type { VoiceStyle } from '../types/pet';

/** 语音风格：结合性别与动物/性格特质，供用户选择 */
export const voiceStyles: VoiceStyle[] = [
  { id: 'female-soft', name: '温柔女声', gender: 'female', trait: '温柔', description: '柔和、治愈' },
  { id: 'female-lively', name: '活泼女声', gender: 'female', trait: '活泼', description: '明亮、元气' },
  { id: 'female-cool', name: '清冷女声', gender: 'female', trait: '高冷', description: '干净、少语' },
  { id: 'female-sweet', name: '甜美女声', gender: 'female', trait: '粘人', description: '撒娇、可爱' },
  { id: 'male-warm', name: '温暖男声', gender: 'male', trait: '温柔', description: '沉稳、安心' },
  { id: 'male-lively', name: '阳光男声', gender: 'male', trait: '活泼', description: '开朗、有活力' },
  { id: 'male-lazy', name: '慵懒男声', gender: 'male', trait: '慵懒', description: '慢悠悠、放松' },
  { id: 'male-cool', name: '磁性男声', gender: 'male', trait: '高冷', description: '低音、酷' },
];
