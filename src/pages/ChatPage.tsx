import { usePetStore } from '../store/usePetStore';
import { PetAvatar } from '../components/PetAvatar';
import { ChatPanel } from '../components/ChatPanel';
import { motion } from 'framer-motion';
import { Settings2 } from 'lucide-react';

export function ChatPage() {
  const pet = usePetStore((s) => s.pet);
  const reset = usePetStore((s) => s.reset);
  const messages = usePetStore((s) => s.messages);
  const isVoiceCallActive = usePetStore((s) => s.isVoiceCallActive);

  const isTalking = messages.some((m) => m.role === 'assistant' && m.isPlaying) || isVoiceCallActive;

  if (!pet) return null;

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <button
        type="button"
        onClick={() => reset()}
        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-white/90 shadow border border-amber-200 text-amber-700 hover:bg-amber-50"
        title="重新创建宠物"
      >
        <Settings2 size={20} />
      </button>
      {/* 左侧：立体宠物形象 */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full sm:w-2/5 lg:w-1/3 min-h-[280px] sm:min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-amber-50/50 to-transparent"
      >
        <PetAvatar pet={pet} isTalking={isTalking} />
      </motion.aside>

      {/* 右侧：聊天区域 */}
      <main className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <ChatPanel />
        </motion.div>
      </main>
    </div>
  );
}
