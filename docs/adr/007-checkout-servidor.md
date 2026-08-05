# ADR-7 — O cliente nunca informa preço

**Situação:** aceito · 2026-08-04

## Contexto

`createOrderAction` recebia os itens do carrinho com **preço incluído** e
usava esse valor para calcular o total e montar a cobrança. Alterar o payload
da requisição comprava qualquer peça por qualquer valor. Frete e desconto de
Pix eram calculados no componente do cliente e recalculados na action com
constantes duplicadas, que podiam divergir.

## Decisão

O cliente envia apenas `{ id, size, qty }`. O servidor busca preço, verifica se
o produto está ativo, confere estoque, carrega a configuração de frete, valida
o cupom e calcula os totais — tudo em `resolveCart` + `computeTotals`.

A mesma função (`quoteCheckoutAction`) alimenta o que a tela exibe, então o
valor mostrado é, por construção, o valor cobrado.

## Consequências

Manipular o payload não muda o preço: no máximo compra outro produto, pelo
preço real dele. O cupom é consumido atomicamente (`consume_coupon`) antes de
gravar o pedido; se estourou o limite entre a cotação e a gravação, o desconto
é desfeito em vez de concedido de graça.

Custo: uma ida ao servidor a cada mudança de carrinho ou cupom na tela de
checkout.
