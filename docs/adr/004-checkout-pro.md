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

## Atualização · 2026-11-14 (2) — Checkout Transparente

O redirect para o Mercado Pago foi substituído pelo pagamento dentro da
loja. Motivo: o público principal (mulheres mais velhas) se perdia ao sair
do site, a tela do provedor não mostrava Pix nem parcelas de forma clara e
não havia como guiar a pessoa passo a passo.

O princípio desta ADR continua valendo: **nenhum dado de cartão passa pela
aplicação**. Número, validade e CVV são digitados em iframes do Mercado
Pago ("campos seguros") e a loja recebe só um token de uso único. O escopo
PCI segue sendo o mais leve (SAQ-A).

O que mudou:

- `POST /v1/orders` em `processing_mode: automatic` cria e processa a
  cobrança. Cartão responde na hora; Pix e boleto devolvem o código.
- A loja pede o CPF de quem paga (exigido pelos três meios).
- Pix é a opção pré-selecionada. A confirmação mostra o copia-e-cola, o QR
  e passos numerados, e a página do pedido os mantém enquanto estiver
  pendente.
- As parcelas oferecidas vêm do Mercado Pago para o cartão digitado (é a
  conta da loja lá que define quantidade e juros), limitadas ao máximo do
  admin. Juros do parcelamento não contam como divergência de valor.
- Cartão recusado: o pedido vai para `recusado`, o cupom é devolvido e a
  tela diz o motivo em português e que nada foi cobrado.
- Cartão aprovado aplica os efeitos (status, estoque) na própria ação, pelo
  mesmo `processPaymentNotification` do webhook; o aviso que chega depois é
  reconhecido como repetido.
- Nova env `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.
