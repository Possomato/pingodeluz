'use client';

import { useState, useEffect } from 'react';
import type { InstagramPost } from '@/lib/data';

export default function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instagram')
      .then(r => r.json())
      .then((data: InstagramPost[]) => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pdl-ig">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pdl-ig-item pdl-ig-skeleton" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="pdl-ig">
      {posts.map(post => {
        const src = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
        return (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="pdl-ig-item"
            aria-label="Ver no Instagram"
          >
            {src && (
              <img
                src={src}
                alt=""
                className="pdl-ig-img"
                loading="lazy"
              />
            )}
            {post.media_type === 'VIDEO' && (
              <div className="pdl-ig-play">▶</div>
            )}
          </a>
        );
      })}
    </div>
  );
}
