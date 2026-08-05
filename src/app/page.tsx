import { fetchCatalog, fetchCollections, fetchHomepageConfig, fetchTestimonials } from '@/lib/data';
import HomeClient from '@/components/HomeClient';

export default async function HomePage() {
  const [hpConfig, products, collections, testimonials] = await Promise.all([
    fetchHomepageConfig(),
    fetchCatalog(),
    fetchCollections(),
    fetchTestimonials(),
  ]);

  return (
    <HomeClient
      hpConfig={hpConfig}
      products={products}
      collections={collections}
      testimonials={testimonials}
    />
  );
}
