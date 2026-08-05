# ADR-1 — Pagamentos por trás de uma interface

**Situação:** aceito · 2026-08-04

## Contexto

O provedor de pagamento é a peça mais provável de mudar num e-commerce:
taxas mudam, o provedor sai do ar, o lojista negocia melhores condições. Na
versão anterior, o SDK do Mercado Pago era importado direto na action de
checkout e na rota de webhook, e o vocabulário do provedor (`init_point`,
`external_reference`, `approved`) tinha vazado para o domínio e para o banco
(colunas `mp_payment_id`, `mp_payment_method`).

## Decisão

Todo acesso a provedor passa pela interface `PaymentGateway`
(`src/lib/payments/types.ts`), resolvida por `getPaymentGateway()`.

- `types.ts` define o contrato e não depende de nada.
- `mercadopago.ts` é o **único** arquivo do projeto que importa o SDK.
- `process-notification.ts` aplica os efeitos de domínio e recebe apenas
  tipos normalizados.
- As colunas do banco passaram a ser `payment_provider`,
  `payment_external_id` e `payment_method`.

Cada adaptador é obrigado a traduzir três coisas: status do provedor →
`NormalizedPaymentStatus`, meio de pagamento → vocabulário nosso, e a
verificação de assinatura do webhook.

## Consequências

Trocar de provedor exige: uma classe nova implementando a interface, um `case`
na factory, uma rota de webhook (wrapper de ~15 linhas) e a variável
`PAYMENT_PROVIDER`. Pedidos, estoque, checkout, painel e banco não mudam.

O custo é uma camada de indireção e a obrigação de manter a regra: se alguém
importar o SDK fora da pasta, o desacoplamento acaba. A verificação é simples:

```bash
grep -rn "from 'mercadopago'" src/
```

Deve retornar exatamente uma linha.
