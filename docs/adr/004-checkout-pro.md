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

## Atualização · 2026-11-14 — Checkout Pro sobre a API de Orders

O Mercado Pago passou a recomendar a API de Orders para o Checkout Pro e
sinaliza a descontinuação da API de Preferences. O adaptador agora cria a
cobrança com `POST /v1/orders` (`type: online`, `processing_mode: manual`)
e redireciona para o `checkout_url`.

Diferenças que afetam a operação:

- O webhook não é mais enviado por requisição (`notification_url` não
  existe). Ele é configurado no painel do MP, no evento **Order (Mercado
  Pago)**, apontando para `/api/webhooks/mercadopago`.
- A order exige que a soma dos itens seja igual ao total e não tem campo de
  cupom. Com desconto, a cobrança vai como uma linha única com o valor final.
- `external_reference` aceita só letras e números: o UUID do pedido vai sem
  hífens e é reconstruído no webhook.
- Notificações `type: payment` continuam aceitas para pedidos criados antes
  da migração.
