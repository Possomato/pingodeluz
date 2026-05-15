import GeneroClient from '@/components/GeneroClient';
import { fetchCollections, GENDER_DATA } from '@/lib/data';

export default async function GeneroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const g = GENDER_DATA[id as keyof typeof GENDER_DATA] ?? GENDER_DATA[Object.keys(GENDER_DATA)[0] as keyof typeof GENDER_DATA];
  return <GeneroClient g={g} collections={collections} />;
}
