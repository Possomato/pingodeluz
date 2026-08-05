'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFavoriteAction } from '@/app/actions/favorites';

interface HeartButtonProps {
  productId: string;
  initialFavorited: boolean;
  onToggle?: (newState: boolean) => void;
}

export default function HeartButton({ productId, initialFavorited, onToggle }: HeartButtonProps) {
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
      onToggle?.(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'NAO_AUTENTICADO') {
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
        padding: '4px',
        opacity: isLoading ? 0.6 : 1,
        transition: 'opacity 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={isFavorited ? 'var(--terra, #c08660)' : 'none'}
        stroke="var(--terra, #c08660)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'all 0.2s ease',
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
