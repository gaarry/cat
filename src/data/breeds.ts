import type { Breed } from '../types/pet';

export const breeds: Breed[] = [
  // 猫咪
  { id: 'cat-british', name: '英国短毛猫', nameEn: 'British Shorthair', species: 'cat', description: '圆脸大眼，性格温顺' },
  { id: 'cat-american', name: '美国短毛猫', nameEn: 'American Shorthair', species: 'cat', description: '健壮友善' },
  { id: 'cat-persian', name: '波斯猫', nameEn: 'Persian', species: 'cat', description: '长毛优雅' },
  { id: 'cat-siamese', name: '暹罗猫', nameEn: 'Siamese', species: 'cat', description: '聪明爱叫' },
  { id: 'cat-maine', name: '缅因猫', nameEn: 'Maine Coon', species: 'cat', description: '体型大、亲人' },
  { id: 'cat-ragdoll', name: '布偶猫', nameEn: 'Ragdoll', species: 'cat', description: '温顺像布偶' },
  { id: 'cat-scottish', name: '苏格兰折耳猫', nameEn: 'Scottish Fold', species: 'cat', description: '圆耳可爱' },
  { id: 'cat-orange', name: '橘猫', nameEn: 'Orange Tabby', species: 'cat', description: '吃货代表' },
  { id: 'cat-calico', name: '三花猫', nameEn: 'Calico', species: 'cat', description: '花色独特' },
  // 狗狗
  { id: 'dog-golden', name: '金毛寻回犬', nameEn: 'Golden Retriever', species: 'dog', description: '温顺聪明' },
  { id: 'dog-husky', name: '哈士奇', nameEn: 'Siberian Husky', species: 'dog', description: '精力旺盛' },
  { id: 'dog-poodle', name: '贵宾犬', nameEn: 'Poodle', species: 'dog', description: '聪明不掉毛' },
  { id: 'dog-corgi', name: '柯基犬', nameEn: 'Corgi', species: 'dog', description: '小短腿大屁股' },
  { id: 'dog-shiba', name: '柴犬', nameEn: 'Shiba Inu', species: 'dog', description: '独立倔强' },
  { id: 'dog-samoyed', name: '萨摩耶', nameEn: 'Samoyed', species: 'dog', description: '微笑天使' },
  { id: 'dog-labrador', name: '拉布拉多', nameEn: 'Labrador', species: 'dog', description: '忠诚活泼' },
  { id: 'dog-chihuahua', name: '吉娃娃', nameEn: 'Chihuahua', species: 'dog', description: '小巧粘人' },
  { id: 'dog-bulldog', name: '法国斗牛犬', nameEn: 'French Bulldog', species: 'dog', description: '憨厚安静' },
  // 鹦鹉
  { id: 'parrot-budgerigar', name: '虎皮鹦鹉', nameEn: 'Budgerigar', species: 'parrot', description: '小巧爱叫' },
  { id: 'parrot-cockatiel', name: '玄凤鹦鹉', nameEn: 'Cockatiel', species: 'parrot', description: '凤头可爱' },
  { id: 'parrot-african', name: '非洲灰鹦鹉', nameEn: 'African Grey', species: 'parrot', description: '学话能力强' },
  { id: 'parrot-macaw', name: '金刚鹦鹉', nameEn: 'Macaw', species: 'parrot', description: '色彩艳丽' },
  { id: 'parrot-lovebird', name: '牡丹鹦鹉', nameEn: 'Lovebird', species: 'parrot', description: '成双成对' },
  // 兔子
  { id: 'rabbit-dwarf', name: '侏儒兔', nameEn: 'Dwarf', species: 'rabbit', description: '迷你可爱' },
  { id: 'rabbit-lop', name: '垂耳兔', nameEn: 'Lop', species: 'rabbit', description: '大耳朵下垂' },
  { id: 'rabbit-angora', name: '安哥拉兔', nameEn: 'Angora', species: 'rabbit', description: '长毛蓬松' },
  { id: 'rabbit-rex', name: '雷克斯兔', nameEn: 'Rex', species: 'rabbit', description: '丝绒质感' },
  // 小猪
  { id: 'pig-mini', name: '迷你猪', nameEn: 'Mini Pig', species: 'pig', description: '小巧聪明' },
  { id: 'pig-vietnamese', name: '越南大肚猪', nameEn: 'Vietnamese Pot-bellied', species: 'pig', description: '肚子圆滚滚' },
  { id: 'pig-kune', name: '库内库内猪', nameEn: 'Kune Kune', species: 'pig', description: '温顺友好' },
];

export const speciesLabels: Record<string, string> = {
  cat: '猫咪',
  dog: '狗狗',
  parrot: '鹦鹉',
  rabbit: '兔子',
  pig: '小猪',
};

export function getBreedsBySpecies(species: string): Breed[] {
  return breeds.filter((b) => b.species === species);
}
