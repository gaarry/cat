import { motion } from 'framer-motion';
import type { PetProfile } from '../types/pet';

interface PetAvatarProps {
  pet: PetProfile;
  isTalking?: boolean;
  className?: string;
}

/**
 * 立体宠物形象：3D 立牌效果（透视 + 厚度 + 地面阴影 + 浮动动画）
 */
export function PetAvatar({ pet, isTalking, className = '' }: PetAvatarProps) {
  const imageUrl = pet.generatedImageUrl || pet.photoUrl || '/vite.svg';

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ perspective: '1200px' }}
    >
      {/* 立体立牌容器：整体 3D 空间 */}
      <motion.div
        className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          y: isTalking ? [0, -10, 0] : [0, -8, 0],
          rotateY: isTalking ? [-3, 3, -3] : 0,
          rotateX: 4,
        }}
        transition={{
          y: { duration: isTalking ? 0.7 : 3.5, repeat: Infinity, ease: 'easeInOut' },
          rotateY: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          rotateX: { duration: 0 },
        }}
      >
        {/* 背面层（立体厚度感） */}
        <div
          className="absolute inset-0 rounded-3xl bg-amber-300/30"
          style={{
            transform: 'translateZ(-14px) scale(0.98)',
            boxShadow: '0 15px 35px -10px rgba(0,0,0,0.2)',
          }}
        />
        {/* 正面：主图 + 边框 */}
        <motion.div
          className="relative w-full h-full rounded-3xl overflow-hidden border-4 border-amber-200/90 bg-amber-50"
          style={{
            transform: 'translateZ(0)',
            boxShadow: [
              '0 0 0 1px rgba(255,252,248,0.6)',
              '0 20px 40px -15px rgba(139, 90, 43, 0.35)',
              '0 35px 60px -20px rgba(0,0,0,0.2)',
              'inset 0 1px 0 rgba(255,255,255,0.4)',
            ].join(', '),
          }}
        >
          <img
            src={imageUrl}
            alt={pet.name || pet.breedName}
            className="w-full h-full object-cover"
          />
          {isTalking && (
            <motion.div
              className="absolute inset-0 bg-amber-400/25 pointer-events-none"
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* 地面投影（椭圆，模拟光照） */}
      <div
        className="absolute left-1/2 w-40 h-6 rounded-full bg-amber-900/20 blur-xl -translate-x-1/2"
        style={{
          top: 'calc(100% + 8px)',
          transform: 'translateX(-50%) scaleY(0.4) rotateX(75deg)',
          transformOrigin: 'center top',
        }}
      />
      <div
        className="absolute left-1/2 w-36 h-4 rounded-full bg-amber-950/25 blur-lg -translate-x-1/2"
        style={{
          top: 'calc(100% + 12px)',
          transform: 'translateX(-50%) scaleY(0.3) rotateX(80deg)',
          transformOrigin: 'center top',
        }}
      />

      <p className="mt-8 text-lg font-medium text-amber-900 drop-shadow-sm">
        {pet.name || pet.breedName}
      </p>
    </motion.div>
  );
}
