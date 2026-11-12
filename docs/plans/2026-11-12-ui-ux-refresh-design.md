# Revisão de UI/UX da loja — design

**Data:** 2026-11-12
**Objetivo:** deixar a loja mais fluida, natural e elegante (UI) e encurtar o caminho produto → sacola → checkout (UX), sem mexer em regras de negócio, pagamentos ou admin.

## Diagnóstico

UI
- Primitivos inconsistentes: raios 2/3/4/6/8/14px, três visuais de input (checkout, login, perfil), botões primários repetidos inline com tamanhos diferentes.
- Header pesado (logo de 72–80px), cards de produto com elevação + sombra que destoam do tom editorial.
- Drawer com links mortos ("por idade" todos para meninas, "Arquivo de coleções", institucional sem destino, coleções com slug fixo).
- Hero de coleção com "N.º 12" fixo.
- Sacola, checkout, confirmação, pedido e páginas institucionais **sem header no desktop** (a `pdl-back-bar` some em ≥768px e essas telas não renderizam `PdlHeader`).

UX
- CTA do produto desabilitado sem explicar o que falta; "comprar" navega direto para a sacola.
- Cupom aplicado na sacola se perde no checkout.
- Checkout em 3 passos onde "pagamento" é só um texto; resumo do pedido só aparece no passo 3.
- Login no meio do fluxo sem contexto ("Bem-vinda de volta" mesmo vindo do checkout).

## Decisões

### Sistema visual (globals.css)
- Tokens novos: `--r-sm/md/lg/pill`, `--shadow-1/2`, `--ease`, `--ring`, `--gutter`.
- Primitivos compartilhados: `.pdl-btn` (`--primary`, `--outline`, `--ghost`, `--lg`, `--block`), `.pdl-field` para todo input, `.pdl-card`, `.pdl-note`.
- Base 15px, `focus-visible` em tudo que é clicável, `prefers-reduced-motion` respeitado.
- Header mais leve (logo 52/60px), fundo translúcido com blur, borda só ao rolar.
- Card de produto: imagem com raio 10, zoom sutil no hover, sem sombra/elevação.
- CSS do admin extraído para `src/app/admin/admin.css`, importado só pelo layout do admin.

### Caminho de compra
1. **Produto**: chips de tamanho em pílula (44px), link "guia de medidas" que abre a tabela; CTA sempre clicável — sem tamanho ele rola até os chips e mostra a dica "escolha um tamanho"; texto "Adicionar à sacola · R$ X".
2. **Mini-sacola** (`BagDrawer`): ao adicionar, abre um painel lateral/bottom-sheet com os itens, quantidade, subtotal, barra de frete grátis, "finalizar compra" (→ /checkout) e "ver sacola". A pessoa não é tirada da página.
3. **Sacola**: duas colunas no desktop (itens + resumo fixo), barra de progresso do frete grátis, cupom persistido no `CartContext` (localStorage) e reutilizado no checkout.
4. **Checkout**: 2 passos (Entrega → Revisão e pagamento), resumo do pedido sempre visível (coluna no desktop, bloco recolhível no mobile), header enxuto com cadeado, CTA "ir para o pagamento seguro · R$ X".
5. **Login**: quando `redirect` começa com `/checkout`, o título vira "Falta pouco" com subtítulo explicando que é só para acompanhar o pedido.
6. Shell consistente: `PageWrapper` (header + drawer) nas páginas que não tinham header no desktop.

### Fora de escopo
Admin, regras de preço/frete/cupom, pagamentos, SEO, conteúdo editorial pendente.

## Testes
- `tests/e2e/carrinho.spec.ts` passa a seguir o fluxo novo (mini-sacola → "ver sacola").
- `npm run typecheck`, `npm run lint`, `npm run build`.
