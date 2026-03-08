import { useState, useRef, useEffect } from 'react';
import { Send, Phone, PhoneOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { usePetStore } from '../store/usePetStore';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithMiniMax } from '../api/minimax';

/** 无 API 或请求失败时的兜底回复 */
function getFallbackReply(): string {
  const lines = [
    '喵～主人今天怎么样呀？',
    '汪！想你了～',
    '今天天气不错，要一起玩吗？',
    '嘿嘿，我又饿了…',
    '再摸摸头好不好？',
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function ChatPanel() {
  const { pet, messages, addMessage, setMessagePlaying, setMessages, isVoiceCallActive, setVoiceCallActive } =
    usePetStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !pet) return;
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });
    setInput('');
    setLoading(true);
    const assistantMsgId = crypto.randomUUID();
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '…',
      timestamp: Date.now(),
    });

    // 只传真实对话历史，排除占位内容
    const history = messages
      .filter((m) => m.content !== '…')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const reply = await chatWithMiniMax(pet, history, text);
      setMessages(
        usePetStore.getState().messages.map((m) =>
          m.id === assistantMsgId ? { ...m, content: reply } : m
        )
      );
    } catch (e) {
      console.error('MiniMax 请求失败:', e);
      const fallback = getFallbackReply();
      setMessages(
        usePetStore.getState().messages.map((m) =>
          m.id === assistantMsgId ? { ...m, content: fallback } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string, msgId: string) => {
    if (!synth) return;
    synth.cancel();
    setMessagePlaying(msgId, true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.95;
    u.onend = () => setMessagePlaying(msgId, false);
    synth.speak(u);
  };

  const stopSpeak = () => {
    if (synth) synth.cancel();
    usePetStore.getState().messages.forEach((m) => usePetStore.getState().setMessagePlaying(m.id, false));
  };

  return (
    <div className="flex flex-col h-full bg-white/70 rounded-2xl border border-amber-200/60 overflow-hidden">
      {/* 标题栏 + 语音通话 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/60 bg-amber-50/50">
        <h2 className="font-semibold text-amber-900">与 {pet?.name || pet?.breedName} 聊天</h2>
        <button
          type="button"
          onClick={() => setVoiceCallActive(!isVoiceCallActive)}
          className={`p-2 rounded-full transition-colors ${
            isVoiceCallActive ? 'bg-red-500 text-white' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
          }`}
          title={isVoiceCallActive ? '结束语音通话' : '开始语音通话'}
        >
          {isVoiceCallActive ? <PhoneOff size={20} /> : <Phone size={20} />}
        </button>
      </div>

      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-center text-amber-700/70 text-sm py-8">发一句消息，和 TA 打个招呼吧～</p>
        )}
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-white rounded-br-md'
                    : 'bg-amber-100 text-amber-900 rounded-bl-md'
                }`}
              >
                {m.role === 'assistant' && m.content === '…' && loading ? (
                  <p className="text-sm flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> 思考中…
                  </p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
                {m.role === 'assistant' && m.content !== '…' && (
                  <button
                    type="button"
                    onClick={() => (m.isPlaying ? stopSpeak() : speak(m.content, m.id))}
                    className="mt-1.5 flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                  >
                    {m.isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {m.isPlaying ? '停止' : '朗读'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 输入区 */}
      <div className="p-3 border-t border-amber-200/60 bg-amber-50/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="输入想说的话…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-400 outline-none text-amber-900 placeholder:text-amber-500"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="p-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
          >
            <Send size={20} />
          </button>
        </div>
        {isVoiceCallActive && (
          <p className="text-xs text-amber-700 mt-2">语音通话已开启（可接入实时语音 API 实现流畅对话）</p>
        )}
      </div>
    </div>
  );
}
