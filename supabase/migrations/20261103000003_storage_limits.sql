-- Limites do bucket de imagens de produto, antes só valendo no código
-- (upload.ts). Aqui valem também para quem falar direto com o Storage.
update storage.buckets
   set file_size_limit    = 8388608,  -- 8 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'product-images';
