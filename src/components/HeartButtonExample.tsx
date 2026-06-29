// EXAMPLE: How to integrate HeartButton into your product components
// This file shows the pattern to use in your product cards/pages

'use client';

import HeartButton from './HeartButton';
import { useEffect, useState } from 'react';
import { isFavoritedAction } from '@/app/actions/favorites';

interface ProductCardExampleProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

// Example 1: Client Component with async data
export function ProductCardExample({ product }: ProductCardExampleProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFavorite = async () => {
      const result = await isFavoritedAction(product.id);
      setIsFavorited(result);
      setLoading(false);
    };
    checkFavorite();
  }, [product.id]);

  return (
    <div style={{ position: 'relative', border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        {!loading && <HeartButton productId={product.id} initialFavorited={isFavorited} />}
      </div>

      <img src={product.image} alt={product.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 4 }} />
      <h3 style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{product.name}</h3>
      <p style={{ color: '#666', fontSize: 13 }}>R$ {product.price.toFixed(2)}</p>
    </div>
  );
}

// Example 2: Server Component with async server actions
export async function ProductCardServer({ product }: ProductCardExampleProps) {
  const isFavorited = await isFavoritedAction(product.id);

  return (
    <div style={{ position: 'relative', border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <HeartButton productId={product.id} initialFavorited={isFavorited} />
      </div>

      <img src={product.image} alt={product.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 4 }} />
      <h3 style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{product.name}</h3>
      <p style={{ color: '#666', fontSize: 13 }}>R$ {product.price.toFixed(2)}</p>
    </div>
  );
}
