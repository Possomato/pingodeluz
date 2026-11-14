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

O checkout é **transparente**: a pessoa paga sem sair da loja (ADR-4).

1. Na tela de pagamento ela escolhe Pix, cartão ou boleto e informa o CPF.
   No cartão, os campos seguros do provedor (iframes em `CardFields.tsx`)
   trocam os dados por um token no navegador — a loja nunca vê o número.
2. `createOrderAction` (`src/app/actions/checkout.ts`) calcula os totais **no
   servidor**, grava o pedido como `pendente` e chama
   `gateway.createPayment(...)`.
3. O resultado já vem no formato do webhook (`PaymentNotification`) e passa por
   `processPaymentNotification`: cartão aprovado vira `pago` e baixa estoque na
   hora; recusado vira `recusado` e devolve o cupom; Pix e boleto seguem
   `pendente` com as instruções de pagamento.
4. A confirmação e a página do pedido buscam o Pix/boleto com
   `gateway.getInstructions(...)` enquanto o pedido estiver pendente.
5. Quando o provedor confirma (Pix pago, boleto compensado, estorno), ele chama
   o webhook. A rota (`src/app/api/webhooks/mercadopago/route.ts`) é um wrapper
   fino: verifica a assinatura, traduz com `parseNotification` e entrega a
   `processPaymentNotification`.

## Trocar de provedor

1. Criar `src/lib/payments/<provedor>.ts` com uma classe que implemente
   `PaymentGateway`. As traduções obrigatórias são:
   - status do provedor → `NormalizedPaymentStatus`
   - meio de pagamento → `'pix' | 'credit_card' | 'boleto' | 'debit_card'`
   - verificação de assinatura do webhook
   - motivo de recusa → `PaymentRejection`
   - Pix/boleto em aberto → `PaymentInstructions`
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
