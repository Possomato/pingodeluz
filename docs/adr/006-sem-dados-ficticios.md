# ADR-6 — Sem dados fictícios como reserva

**Situação:** aceito · 2026-08-04

## Contexto

Todos os leitores de dados terminavam em `.catch(() => HOME_PRODUCTS)`. Se o
banco caísse, a loja passava a exibir cinco produtos inventados — "Vestido
Margarida", "Macacão Explorador" — com preços que ninguém praticava. A pessoa
podia colocá-los no carrinho. Havia ainda pedidos, endereços e um usuário
fictícios usados para preencher a tela do perfil, e uma função que, ao não
encontrar um produto pelo id, devolvia o primeiro da lista fixa.

## Decisão

Nenhum dado de demonstração no código. Quando a leitura falha, o erro sobe e a
página trata: `error.tsx` para falha, estado vazio explícito para lista sem
resultado. Conteúdo editorial de verdade (textos das páginas de gênero,
depoimentos) ou é constante declarada como tal, ou vem do banco e é editável no
painel.

## Consequências

Uma loja fora do ar avisa que está fora do ar, em vez de vender o que não
existe. Ambientes novos começam vazios, o que exige cadastrar produtos antes de
ver a home povoada — comportamento correto para uma loja real.

Exceção consciente: `fetchHomepageConfig` e `fetchPaymentConfig` degradam para
um padrão razoável, porque a ausência de configuração não é um erro e não
inventa produto nenhum.
