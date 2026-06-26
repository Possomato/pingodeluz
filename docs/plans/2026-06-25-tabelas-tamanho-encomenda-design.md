# Design: Tabelas de Tamanho + Modelo de Encomenda

**Data:** 2026-06-25
**Status:** validado

## Contexto

O e-commerce muda de estoque para encomenda (made-to-order). A produção é rápida o suficiente para que isso seja invisível ao cliente. O que muda é a configuração de produtos no admin: substituição do controle de estoque por tabelas de tamanho configuráveis.

## Modelo de dados

### SizeTable

```ts
interface SizeTable {
  id: string;
  name: string;           // ex: "Vestido meninas"
  columns: string[];      // ex: ["tórax", "cintura", "comprimento"]
  rows: {
    size: string;         // ex: "1m", "3m", "1", "2"
    values: Record<string, number>; // coluna → valor em cm
  }[];
}
```

Supabase: tabela `size_tables` com colunas `id (text PK)`, `name (text)`, `columns (jsonb)`, `rows (jsonb)`.
Fallback local: `localStorage['pdl_size_tables']`.

### Product — mudanças

Remover: `stock: Record<string, number>`, `unavail: string[]`

Adicionar: `sizeTableId?: string` — aponta para uma `SizeTable`

Manter: `sizes: string[]` — quais tamanhos do produto estão ativos (subconjunto dos tamanhos da tabela vinculada)

## Admin: `/admin/tabelas`

### Listagem

Tabela simples com nome, nº de colunas, nº de tamanhos. Ações: editar, excluir, nova tabela.

### Formulário de tabela

1. **Nome** — campo de texto livre
2. **Colunas** — lista editável de strings; botão `+ coluna`, botão × para remover
3. **Linhas** — tabela editável; cada linha tem o nome do tamanho + uma célula por coluna (input numérico); botão `+ tamanho` adiciona linha; ordem de inserção define a ordem de exibição

```
Tamanho │ tórax │ cintura │ comprimento
1m      │  40   │   39    │    32
3m      │  44   │   41    │    35
[+ tamanho]
```

Salva via `upsertSizeTableAction` (Server Action → Supabase) com fallback localStorage.

## Admin: formulário de produto — mudanças

Substituir os checkboxes de tamanho fixos (`SIZES = ['1','2','4','6','8']`) por:

1. **Select "Tabela de tamanhos"** — lista as tabelas cadastradas; ao selecionar, os tamanhos da tabela aparecem abaixo
2. **Checkboxes de tamanhos ativos** — gerados dinamicamente a partir da tabela selecionada; admin marca quais estão disponíveis para esse produto
3. **Remover** campos de estoque (`stock`, `unavail`)

## Produto para o cliente — sem mudanças visíveis

- **Botões de tamanho**: renderizados a partir de `product.sizes[]` (tamanhos ativos); sem lógica de esgotado
- **Tabela de medidas**: busca a `SizeTable` vinculada e renderiza colunas + linhas dinamicamente; mesma apresentação visual atual
- **Fluxo de compra**: idêntico; cliente não vê referência a encomenda

## Fluxo de dados na página de produto

```
ProdutoPage (Server Component)
  ├── fetchProductById(id) → Product
  ├── fetchSizeTable(product.sizeTableId) → SizeTable
  └── <ProdutoClient product={p} sizeTable={st} />
```

## O que NÃO muda

- Preço, parcelamento, descrição, imagem, tint, gênero, tipo, coleção
- Carrinho, checkout, perfil
- Apresentação visual ao cliente
- Lógica de busca (usa `sizes[]` como antes)
