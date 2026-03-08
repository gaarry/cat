import { create } from 'zustand';
import type { PetProfile, ChatMessage } from '../types/pet';

interface PetState {
  /** 当前宠物档案，未创建则为 null */
  pet: PetProfile | null;
  /** 是否已完成创建向导（有宠物即视为完成） */
  isOnboarded: boolean;
  /** 聊天消息列表 */
  messages: ChatMessage[];
  /** 是否正在语音通话 */
  isVoiceCallActive: boolean;
  /** 是否正在生成图像 */
  isGeneratingImage: boolean;

  setPet: (pet: PetProfile | null) => void;
  setOnboarded: (v: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setMessagePlaying: (id: string, playing: boolean) => void;
  setVoiceCallActive: (v: boolean) => void;
  setGeneratingImage: (v: boolean) => void;
  reset: () => void;
}

export const usePetStore = create<PetState>((set) => ({
  pet: null,
  isOnboarded: false,
  messages: [],
  isVoiceCallActive: false,
  isGeneratingImage: false,

  setPet: (pet) => set({ pet, isOnboarded: !!pet }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setMessagePlaying: (id, playing) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, isPlaying: playing } : m)),
    })),
  setVoiceCallActive: (isVoiceCallActive) => set({ isVoiceCallActive }),
  setGeneratingImage: (isGeneratingImage) => set({ isGeneratingImage }),
  reset: () =>
    set({
      pet: null,
      isOnboarded: false,
      messages: [],
      isVoiceCallActive: false,
      isGeneratingImage: false,
    }),
}));
