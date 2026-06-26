# Tabela de Tamanhos Meninas — Design

## Objetivo

Atualizar o sistema de tamanhos do site para o padrão real de manequins infantis (1m–14), exibindo uma tabela de medidas compacta e sempre visível na página de cada produto.

## Dados

Constante estática em `lib/data.ts` — não requer banco de dados:

```ts
export const TABELA_MEDIDAS = [
  { manequim: '1m',  torax: 40, cintura: 39, comprimento: 32 },
  { manequim: '3m',  torax: 44, cintura: 41, comprimento: 35 },
  { manequim: '6m',  torax: 46, cintura: 43, comprimento: 38 },
  { manequim: '9m',  torax: 48, cintura: 44, comprimento: 41 },
  { manequim: '1',   torax: 50, cintura: 48, comprimento: 44 },
  { manequim: '2',   torax: 53, cintura: 52, comprimento: 50 },
  { manequim: '4',   torax: 57, cintura: 56, comprimento: 60 },
  { manequim: '6',   torax: 61, cintura: 58, comprimento: 65 },
  { manequim: '8',   torax: 66, cintura: 60, comprimento: 70 },
  { manequim: '10',  torax: 70, cintura: 62, comprimento: 75 },
  { manequim: '12',  torax: 75, cintura: 64, comprimento: 80 },
  { manequim: '14',  torax: 78, cintura: 66, comprimento: 85 },
];

export const SIZES_MENINAS = TABELA_MEDIDAS.map(r => r.manequim);
// ['1m','3m','6m','9m','1','2','4','6','8','10','12','14']
```

## UI da tabela no produto

Sempre visível abaixo dos botões de tamanho. 4 colunas: tamanho, tórax, cintura, comprimento. Scroll horizontal em mobile. A linha do tamanho selecionado fica destacada com fundo no tint do produto. Nota de rodapé: "medidas em centímetros · peça já costurada".

## Arquivos alterados

| Arquivo | O que muda |
|---|---|
| `src/lib/data.ts` | Adiciona `TABELA_MEDIDAS` e `SIZES_MENINAS`; atualiza `sizes` dos produtos mock |
| `src/components/ProdutoClient.tsx` | Fallback de sizes → `SIZES_MENINAS`; adiciona tabela abaixo do seletor |
| `src/app/page.tsx` | Textos "1–12 anos" → "1m–14" nos cards de gênero |
| `src/components/GeneroClient.tsx` | Atualiza referências a faixas etárias |
| `src/app/globals.css` | Estilos da tabela de medidas |
