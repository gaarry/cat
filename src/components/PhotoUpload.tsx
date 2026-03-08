import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface PhotoUploadProps {
  value?: string;
  onChange: (file: File | null, dataUrl?: string) => void;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** 本地预览：选择文件后先显示，再同步到父组件，避免异步导致不刷新 */
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;
        setLocalPreview(dataUrl);
        onChange(file, dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onChange]
  );

  const displayUrl = value ?? localPreview;

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
      />
      {displayUrl ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-amber-200 shadow-lg"
        >
          <img src={displayUrl} alt="宠物照片" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="absolute bottom-2 right-2 p-2 rounded-full bg-white/90 shadow text-amber-800 hover:bg-white"
          >
            <Upload size={18} />
          </button>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-48 h-48 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center gap-2 text-amber-700 hover:bg-amber-100/50 hover:border-amber-400 transition-colors"
        >
          <ImageIcon size={40} className="opacity-70" />
          <span className="text-sm font-medium">上传宠物照片</span>
        </button>
      )}
      <p className="text-xs text-amber-800/70">用于生成专属形象</p>
    </div>
  );
}
