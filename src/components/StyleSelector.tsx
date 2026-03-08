import { Check } from 'lucide-react';

export interface PetStyle {
  id: string;
  name: string;
  description: string;
}

export const PET_STYLES: PetStyle[] = [
  {
    id: 'ghibli',
    name: '宫崎骏风格',
    description: '吉卜力动画风格，柔和水彩纹理，梦幻温暖',
  },
  {
    id: 'emoji',
    name: 'Emoji 风格',
    description: '3D 立体头像，苹果 Memoji 风格活泼可爱',
  },
  {
    id: 'realistic',
    name: '写实风格',
    description: '专业摄影效果，真实毛发纹理，高清质感',
  },
  {
    id: 'anime',
    name: '二次元风格',
    description: '日本动漫风格，大眼睛精致细节，鲜明色彩',
  },
  {
    id: 'simple',
    name: '淳朴画风',
    description: '简笔画风格，童趣手绘，温暖亲切',
  },
];

interface StyleSelectorProps {
  selectedStyleId: string;
  onSelect: (styleId: string) => void;
}

export function StyleSelector({ selectedStyleId, onSelect }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {PET_STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onSelect(style.id)}
          className={`flex items-center p-4 rounded-xl border-2 transition-all ${
            selectedStyleId === style.id
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300 bg-white'
          }`}
        >
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-800">{style.name}</div>
            <div className="text-sm text-gray-500">{style.description}</div>
          </div>
          {selectedStyleId === style.id && (
            <Check className="w-5 h-5 text-purple-500" />
          )}
        </button>
      ))}
    </div>
  );
}
