# ADR-4 — Checkout com redirect, sem coletar cartão

**Situação:** aceito · 2026-08-04

## Contexto

A tela de checkout tinha campos de número de cartão, validade e CVV. Eles eram
preenchidos, guardados no estado do React — e nunca usados: o fluxo real
sempre foi redirecionar para o Mercado Pago. Era um formulário que pedia dado
sensível sem propósito.

## Decisão

Usar Checkout Pro (redirect). A etapa de pagamento na nossa loja passa a ser
informativa; a escolha do meio e os dados do cartão acontecem no ambiente do
provedor.

## Consequências

Nenhum dado de cartão passa pela aplicação, o que mantém a conformidade PCI
fora do escopo do projeto. O custo é menos controle sobre a aparência dessa
etapa.

O desconto de Pix, que existia como número fixo de 5% aplicado no cliente, foi
removido do cálculo: o meio de pagamento só é conhecido depois do redirect,
então não havia como aplicá-lo honestamente antes. O campo
`shipping_config.pix_discount_percent` segue no banco para quando for
configurado no próprio provedor.
