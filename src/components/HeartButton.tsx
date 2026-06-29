'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFavoriteAction } from '@/app/actions/favorites';

interface HeartButtonProps {
  productId: string;
  initialFavorited: boolean;
}

export default function HeartButton({ productId, initialFavorited }: HeartButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await toggleFavoriteAction(productId);
      setIsFavorited(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Not authenticated') {
        router.push('/perfil');
      } else {
        console.error('Error toggling favorite:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        background: 'none',
        border: 'none',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: 24,
        opacity: isLoading ? 0.6 : 1,
        transition: 'opacity 0.2s',
        padding: 0,
      }}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
}
