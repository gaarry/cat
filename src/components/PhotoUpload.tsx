import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  compressImageFile,
  formatSize,
  MAX_UPLOAD_MB,
  type CompressResult,
} from '../utils/compressImage';

interface PhotoUploadProps {
  value?: string;
  onChange: (file: File | null, dataUrl?: string) => void;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<{ original: number; current: number; compressed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (value === undefined) {
      setLocalPreview(null);
      setSizeInfo(null);
      setError(null);
    }
  }, [value]);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;

      setError(null);
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        setError(`图片不能超过 ${MAX_UPLOAD_MB} MB，请重新选择或压缩后上传`);
        return;
      }

      setCompressing(true);
      compressImageFile(file)
        .then((result: CompressResult | null) => {
          setCompressing(false);
          if (!result) {
            setError('图片处理失败，请重试');
            return;
          }
          setLocalPreview(result.dataUrl);
          setSizeInfo({
            original: result.originalSizeBytes,
            current: result.sizeBytes,
            compressed: result.compressed,
          });
          onChange(file, result.dataUrl);
        })
        .catch((e: unknown) => {
          setCompressing(false);
          setError(e instanceof Error ? e.message : '图片处理失败，请重试');
        });
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
          disabled={disabled || compressing}
          className="w-48 h-48 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center gap-2 text-amber-700 hover:bg-amber-100/50 hover:border-amber-400 transition-colors disabled:opacity-60"
        >
          {compressing ? (
            <Loader2 size={40} className="animate-spin text-amber-600" />
          ) : (
            <ImageIcon size={40} className="opacity-70" />
          )}
          <span className="text-sm font-medium">
            {compressing ? '正在压缩…' : '上传宠物照片'}
          </span>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 text-center max-w-[16rem]">{error}</p>
      )}

      {sizeInfo && !error && (
        <p className="text-xs text-amber-800/80">
          {sizeInfo.compressed ? (
            <>原 {formatSize(sizeInfo.original)}，已压缩至 {formatSize(sizeInfo.current)}</>
          ) : (
            <>图片大小：{formatSize(sizeInfo.current)}</>
          )}
        </p>
      )}

      {!displayUrl && !error && (
        <p className="text-xs text-amber-800/70">用于生成专属形象，限 {MAX_UPLOAD_MB} MB 内，将自动压缩以加快识别</p>
      )}
    </div>
  );
}
