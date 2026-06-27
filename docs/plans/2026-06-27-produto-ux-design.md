# Melhorias UX/UI — Página de Produto

**Data:** 2026-06-27  
**Objetivo:** Aumentar conversão na página de produto com base em análise comparativa com concorrente validado.

---

## Arquivos alterados

- `src/components/ProdutoClient.tsx` — hierarquia, CTA, lightbox, breadcrumb, galeria vertical, "Combina com"
- `src/app/produto/[id]/page.tsx` — `generateMetadata` para title tags dinâmicas
- `src/components/PdlFooter.tsx` — rodapé expandido
- `src/app/globals.css` — estilos novos

---

## 1. Nova hierarquia de elementos

Ordem aplicada em mobile e desktop:

1. Galeria de fotos
2. Eyebrow (label da coleção)
3. Nome do produto (H1)
4. Preço + parcelamento
5. Seletor de tamanho (chips)
6. **Botão CTA** ← imediatamente após chips
7. Descrição do produto
8. Accordion: Composição e cuidado
9. Accordion: Feito à mão por
10. Accordion: Envio e trocas
11. Accordion: Medidas (tabela colapsável — fechado por padrão)
12. Histórias da coleção
13. Combina com

---

## 2. CTA dois estados

| Estado | Condição | Visual | Texto |
|--------|----------|--------|-------|
| Neutro | sem tamanho selecionado | `bg: var(--border)`, `color: var(--muted)`, `cursor: not-allowed` | "escolha um tamanho" |
| Ativo | tamanho selecionado | `bg: var(--ink)`, `color: var(--cream-warm)`, `cursor: pointer` | "Comprar · Tam. X" |

Transição via `transition: background 0.2s, color 0.2s`. Aplicado no botão desktop e no botão sticky mobile.

---

## 3. Galeria desktop (≥ 1024px)

- Thumbnails verticais à esquerda (72px de largura), foto hero à direita
- Implementação: CSS grid com `grid-template-columns: 72px 1fr` no breakpoint desktop
- Em mobile: layout atual mantido (foto full-width + dots)
- Dots de navegação ocultados em desktop via media query

---

## 4. Lightbox (desktop only)

- Clique na foto hero em desktop abre modal `position: fixed; inset: 0; z-index: 1000`
- Fundo escuro semitransparente (`rgba(0,0,0,0.85)`)
- Imagem centralizada (max 90vh)
- Setas esquerda/direita para navegar entre fotos do produto
- Botão `×` para fechar; também fecha ao clicar no fundo ou pressionar `Escape`
- Estado: `lightboxOpen: boolean`, herda `galleryIdx` atual ao abrir
- Em mobile: clique na foto não abre lightbox (comportamento atual mantido)

---

## 5. "Combina com" — desktop

- Estado `relIdx` controla índice inicial
- Exibe `related.slice(relIdx, relIdx + 2)` em desktop — 2 cards por vez
- Botões `‹` / `›` para navegar
- Em mobile: mantém scroll horizontal atual (todos os cards visíveis)

---

## 6. Breadcrumb

- Posição: abaixo do header, acima da galeria
- Formato: `Pingo de Luz > Jardim Encantado > Vestido Margarida`
- "Pingo de Luz" → link para `/`
- Nome da coleção → link para `/colecao/[slug]` (slug derivado de `p.col`)
- Nome do produto → texto puro (item ativo)
- Estilo: `font-size: 11px`, `color: var(--muted)`, `letter-spacing: 0.08em`

Mapa de coleção → slug:
```ts
const COL_SLUG: Record<string, string> = {
  'Jardim Encantado': 'jardim',
  'Doce Aventura': 'doce',
};
```

---

## 7. Title tags dinâmicas

Em `page.tsx`:

```ts
export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  return { title: `${p.name} · ${p.col} | Pingo de Luz` };
}
```

Exemplo: `Vestido Margarida · Jardim Encantado | Pingo de Luz`

---

## 8. Rodapé expandido

Sem newsletter. 3 colunas de conteúdo + base:

| Coluna | Conteúdo |
|--------|----------|
| Navegação | Coleções principais + categorias (Meninas, Meninos) |
| Institucional | Nossa história, Como fazemos, Guia de tamanhos, Trocas e devoluções |
| Contato | E-mail de atendimento, WhatsApp, Instagram |

Base do rodapé: logos de pagamento (Pix, Visa, Mastercard, Elo) + CNPJ + copyright.

Em mobile: colunas colapsam em accordions.
