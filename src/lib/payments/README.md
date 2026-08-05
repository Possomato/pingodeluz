# Camada de pagamentos

Isola o restante do sistema de qualquer provedor de pagamento específico.
Hoje o provedor é o Mercado Pago; a troca por outro não deve exigir mudanças
fora desta pasta.

## Regra que sustenta tudo

> Nenhum arquivo fora de `src/lib/payments/` importa o SDK de um provedor
> nem conhece seus tipos, status ou nomes de campo.

Se essa regra for quebrada, o desacoplamento deixa de existir. Para verificar:

```bash
grep -rn "from 'mercadopago'" src/ --include="*.ts" --include="*.tsx"
```

O resultado esperado é uma única linha: `src/lib/payments/mercadopago.ts`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `types.ts` | O contrato: `PaymentGateway` e os tipos do domínio. Não depende de nada. |
| `mercadopago.ts` | Adaptador do Mercado Pago. O único lugar que importa o SDK. |
| `index.ts` | Factory `getPaymentGateway()`, resolvida pela env `PAYMENT_PROVIDER`. |
| `process-notification.ts` | Efeitos de domínio de uma notificação (status do pedido, estoque). Independente de provedor. |

## Como funciona um pagamento

1. `createOrderAction` (`src/app/actions/checkout.ts`) calcula os totais **no
   servidor**, grava o pedido como `pendente` e chama
   `gateway.createCheckout(...)`.
2. O cliente é redirecionado para o `redirectUrl` do provedor e paga lá — nenhum
   dado de cartão passa pela nossa aplicação (ADR-4).
3. O provedor chama nosso webhook. A rota
   (`src/app/api/webhooks/mercadopago/route.ts`) é um wrapper fino: verifica a
   assinatura, traduz o corpo com `parseNotification` e entrega o resultado
   normalizado a `processPaymentNotification`.
4. `processPaymentNotification` aplica os efeitos: grava o evento (idempotência),
   avança o status do pedido e baixa ou repõe estoque.

## Trocar de provedor

1. Criar `src/lib/payments/<provedor>.ts` com uma classe que implemente
   `PaymentGateway`. As traduções obrigatórias são:
   - status do provedor → `NormalizedPaymentStatus`
   - meio de pagamento → `'pix' | 'credit_card' | 'boleto' | 'debit_card'`
   - verificação de assinatura do webhook
2. Registrar o `case` novo em `index.ts`.
3. Criar a rota de webhook do provedor (copiar a existente; ela tem ~15 linhas e
   nenhuma lógica própria).
4. Trocar `PAYMENT_PROVIDER` no ambiente.

Não é preciso tocar em pedidos, estoque, checkout, admin ou banco de dados.

## Idempotência

`PaymentNotification.eventId` inclui o status (`<id do pagamento>:<status>`).
Ele vira a chave primária em `payment_events`, então:

- reentrega do mesmo evento → conflito de chave → ignorado;
- transição real (`pending` → `approved`) → chave nova → processada.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `PAYMENT_PROVIDER` | Opcional; padrão `mercadopago`. |
| `MERCADOPAGO_ACCESS_TOKEN` | Credenciais → Access token. Use as de teste em desenvolvimento. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Webhooks → Assinatura secreta. Sem ela, todo webhook é recusado. |
| `NEXT_PUBLIC_SITE_URL` | Base das URLs de retorno e de notificação. |

## Testar o webhook localmente

O provedor precisa alcançar sua máquina — exponha a porta com um túnel
(`ngrok http 3000`) e configure a URL no painel do provedor. Para testar sem
depender do provedor, use o simulador do projeto:

```bash
npx tsx src/scripts/simulate-webhook.ts
```

Ele monta um payload com assinatura HMAC válida, envia ao endpoint local e
confere que o pedido mudou de status, que o estoque baixou e que o reenvio do
mesmo evento não duplica nada.
