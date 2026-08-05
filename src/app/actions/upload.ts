'use server';

import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Upload de imagem de produto. Só admin — antes desta verificação,
 * qualquer visitante podia encher o bucket da loja.
 */
export async function uploadImageAction(formData: FormData): Promise<string> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Nenhum arquivo enviado');
  }

  if (!ALLOWED.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG, WebP ou AVIF.');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('Imagem maior que 8 MB.');
  }

  // Extensão derivada do tipo declarado, não do nome do arquivo: o nome
  // vem do cliente e não deve influenciar o caminho gravado.
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `products/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
