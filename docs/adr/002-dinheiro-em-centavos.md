# ADR-2 — Dinheiro em centavos

**Situação:** aceito · 2026-08-04

## Contexto

O preço era a string `"R$ 189"`, gravada assim no banco. Existiam três
funções `parsePrice` diferentes no código, com semânticas divergentes: uma
descartava os centavos (`replace(/[^\d]/g)`), outra os preservava. O total do
carrinho e o total enviado ao provedor podiam discordar.

## Decisão

Dinheiro é sempre `integer` em centavos — no banco, nas Server Actions, nos
contexts e nos props. A conversão para texto acontece só na borda da UI, por
`formatCentavos()` em `src/lib/money.ts`, que é o único lugar autorizado a
transformar número em texto e texto em número.

## Consequências

Aritmética exata, sem erro de ponto flutuante e sem parser ambíguo. A migração
`20260804000003` converteu os dados existentes e a coluna `price` de texto
segue no banco apenas como histórico.

O preço no formulário do admin continua sendo digitado como texto ("189,90") e
é convertido no envio — a conversão a cada tecla atrapalhava a digitação.
