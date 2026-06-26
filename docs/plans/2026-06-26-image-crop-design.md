# Design: Upload de Imagens com Crop por Seção

**Data:** 2026-06-26
**Status:** validado

## Contexto

O admin precisa de uma tela de crop ao subir imagens, garantindo que cada seção do site receba a foto na proporção correta. Sem crop, fotos fora de proporção ficam distorcidas ou mal enquadradas no layout.

## Proporções por Seção

| Seção | Proporção | Razão |
|---|---|---|
| Produto (card, galeria, carrinho) | 3:4 | Retrato padrão de moda, já em uso no CSS |
| Card de gênero (meninas/meninos) | 7:11 | Retrato alto, metade da tela em mobile |
| Card de coleção | 7:9 | Retrato editorial, próximo ao 4:5 do Instagram |
| Hero da página de coleção | 16:9 | Landscape para banners ambientais |

Instagram fica fora — imagens vêm da API, sem upload pelo admin.

## Comportamento especial

- **Card de gênero solo:** quando só um gênero está ativo, o card ocupa 100% da largura. A imagem 7:11 com `object-fit: cover` absorve o cambio — sem crop separado necessário.

## Fluxo de Upload com Crop

1. Admin clica em "subir foto" em qualquer seção
2. Seleciona arquivo (JPEG/PNG/WEBP)
3. Abre modal de crop com a moldura na proporção correta da seção
4. Admin arrasta e dá zoom para posicionar o sujeito
5. Confirma — imagem é recortada no browser (canvas), enviada ao Supabase Storage
6. URL é salva no campo correspondente

## Componente `ImageCropUploader`

Componente reutilizável com prop `aspect: number` (ex: `3/4 = 0.75`, `16/9 ≈ 1.778`).

```tsx
<ImageCropUploader
  aspect={3/4}
  currentUrl={form.imageUrl}
  onUpload={(url) => set('imageUrl', url)}
/>
```

### Interface do modal

- Área de preview com a imagem em tamanho grande
- Moldura com a proporção correta sobreposta (overlay escuro fora da área)
- Gesto de arrastar para reposicionar
- Slider ou pinch para zoom
- Botões: "Cancelar" e "Confirmar"

## Supabase Storage

- Bucket: `images` (público)
- Path: `/{secao}/{id}-{timestamp}.jpg`
- Imagem é enviada como JPEG com qualidade 0.85 (canvas `toBlob`)
- Substituição: upload novo + delete do arquivo antigo (ou sobrescreve pelo path)

## O que NÃO muda

- URLs existentes de produtos/coleções — retrocompatível
- Fluxo de salvar produto/coleção — `imageUrl` continua sendo uma string
- Layout e CSS das seções — as proporções já estão corretas
