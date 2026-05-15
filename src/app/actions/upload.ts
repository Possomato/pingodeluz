'use server';

import { createServiceClient } from '@/lib/supabase';

export async function uploadImageAction(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) throw new Error('No file');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `products/${Date.now()}.${ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
