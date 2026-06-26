import { NextResponse } from 'next/server';
import { fetchInstagramFeed } from '@/lib/data';

export const revalidate = 3600;

export async function GET() {
  const posts = await fetchInstagramFeed();
  return NextResponse.json(posts);
}
