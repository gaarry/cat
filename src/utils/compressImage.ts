/**
 * 浏览器端图片压缩：限制上传大小，并压缩到约 targetKB，加快识别/生成接口响应。
 * 支持 HEIC（iPhone 默认格式）自动转为 JPEG 后再压缩。
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const TARGET_BYTES = 100 * 1024;          // 约 100KB
const MAX_DIMENSION = 1024;                // 最长边像素

export const MAX_UPLOAD_MB = 5;

/** 是否为 HEIC/HEIF（iPhone 相册常见格式） */
function isHeic(file: File): boolean {
  const t = file.type?.toLowerCase() ?? '';
  const n = file.name?.toLowerCase() ?? '';
  return t === 'image/heic' || t === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif');
}

const HEIC_UNSUPPORTED_MSG =
  '此 HEIC 格式暂无法转换。请在相册中「复制」后选「存储到文件」再选 JPEG，或使用其他照片上传。';

/** 使用 heic-to 将 HEIC 转为 JPEG/PNG（对 test/test_compress.heic 等文件可成功解析） */
async function heicToJpegFile(file: File): Promise<File> {
  const blob =
    file.size > 0 && file.size <= MAX_UPLOAD_BYTES
      ? new Blob([await file.arrayBuffer()], { type: file.type || 'image/heic' })
      : file;

  const { heicTo } = await import('heic-to');
  let outBlob: Blob | null = null;
  for (const type of ['image/jpeg', 'image/png'] as const) {
    try {
      const out = await heicTo({ blob, type, quality: 0.9 });
      if (out) {
        outBlob = out;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!outBlob) throw new Error(HEIC_UNSUPPORTED_MSG);

  const ext = outBlob.type === 'image/png' ? '.png' : '.jpg';
  const name = file.name.replace(/\.heic$/i, ext).replace(/\.heif$/i, ext);
  return new File([outBlob], name, { type: outBlob.type });
}

/** 格式化为可读大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface CompressResult {
  dataUrl: string;
  sizeBytes: number;
  originalSizeBytes: number;
  compressed: boolean;
}

/** 用 FileReader 把 file 转成 dataURL，不压缩 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * 若原图超过 5MB 返回 null；否则若为 HEIC 先转 JPEG，再按需压缩到约 100KB。
 * 图片无法用 Canvas 压缩时会回退为原图 dataURL。
 */
export function compressImageFile(file: File): Promise<CompressResult | null> {
  if (file.size > MAX_UPLOAD_BYTES) return Promise.resolve(null);

  const originalSize = file.size;

  const run = (effectiveFile: File) => {
    const needCompress = effectiveFile.size > TARGET_BYTES;
    return new Promise<CompressResult | null>((resolve) => {
      const resolveAsIs = (dataUrl: string) => {
        resolve({
          dataUrl,
          sizeBytes: effectiveFile.size,
          originalSizeBytes: originalSize,
          compressed: false,
        });
      };

      const img = new Image();
      const url = URL.createObjectURL(effectiveFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (!needCompress) {
          fileToDataUrl(effectiveFile).then(resolveAsIs).catch(() => resolve(null));
          return;
        }
        compressToTarget(img, TARGET_BYTES)
          .then(({ dataUrl, sizeBytes }) =>
            resolve({
              dataUrl,
              sizeBytes,
              originalSizeBytes: originalSize,
              compressed: true,
            })
          )
          .catch(() => {
            fileToDataUrl(effectiveFile).then(resolveAsIs).catch(() => resolve(null));
          });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        fileToDataUrl(effectiveFile).then(resolveAsIs).catch(() => resolve(null));
      };
      img.src = url;
    });
  };

  if (isHeic(file)) {
    return heicToJpegFile(file).then(run).catch((e) => Promise.reject(e));
  }
  return run(file);
}

function compressToTarget(
  img: HTMLImageElement,
  targetBytes: number
): Promise<{ dataUrl: string; sizeBytes: number }> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return Promise.reject(new Error('Invalid image dimensions'));
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No canvas context'));
  try {
    ctx.drawImage(img, 0, 0, cw, ch);
  } catch {
    return Promise.reject(new Error('drawImage failed'));
  }

  const tryQuality = (quality: number): Promise<Blob> =>
    new Promise((res, rej) => {
      canvas.toBlob(
        (blob) => (blob ? res(blob) : rej(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      );
    });

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });

  const qualities = [0.7, 0.5, 0.4, 0.3, 0.25, 0.2];
  let lastBlob: Blob | null = null;

  const run = (i: number): Promise<{ dataUrl: string; sizeBytes: number }> => {
    if (i >= qualities.length) {
      if (lastBlob) return blobToDataUrl(lastBlob).then((dataUrl) => ({ dataUrl, sizeBytes: lastBlob!.size }));
      return blobToDataUrl(
        new Blob([], { type: 'image/jpeg' })
      ).then((dataUrl) => ({ dataUrl, sizeBytes: 0 }));
    }
    return tryQuality(qualities[i]).then((blob) => {
      lastBlob = blob;
      if (blob.size <= targetBytes * 1.2) {
        return blobToDataUrl(blob).then((dataUrl) => ({ dataUrl, sizeBytes: blob.size }));
      }
      return run(i + 1);
    });
  };

  return run(0);
}

export { MAX_UPLOAD_BYTES, TARGET_BYTES };
