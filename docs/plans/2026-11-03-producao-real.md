# Prontidão para produção real — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Goal:** Fechar os bloqueantes e itens importantes levantados na análise de 2026-11-03 para abrir a loja a clientes reais.

**Architecture:** Mudanças pequenas e independentes sobre a base existente (Next 16 + Supabase + Mercado Pago). Tudo que é código/migration entra aqui; tudo que é configuração externa (Vercel, Mercado Pago, Supabase Dashboard, DNS) vai para a seção "Ações manuais".

**Tech Stack:** Next.js 16.2.6, Supabase (SQL migrations), `node:test` via tsx, Playwright.

---

## Parte A — Código e migrations (feito por Claude)

| # | Tarefa | Arquivos |
|---|--------|----------|
| A1 | Limpar workspace: remover scripts `_tmp-*` (quebram o build), commitar polling da confirmação | `src/scripts/_tmp-*`, `ConfirmacaoClient.tsx`, `confirmacao/page.tsx` |
| A2 | **Revogar EXECUTE** das funções `security definer` para `anon`/`authenticated` | `supabase/migrations/20261103000001_revoke_rpc_execute.sql` |
| A3 | Rodapé: corrigir e-mail com typo; CNPJ/razão social só aparecem se configurados por env (nunca mais `00.000.000/0001-00`) | `PdlFooter.tsx`, `.env.example` |
| A4 | Mensagem de erro quando o pagamento falha (`/checkout?error=pagamento`) | `CheckoutClient.tsx` |
| A5 | `metadataBase` + headers de segurança (`X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`) | `layout.tsx`, `next.config.ts` |
| A6 | Webhook confere valor pago × `total_centavos`; divergência marca `needs_attention` (TDD) | `types.ts`, `mercadopago.ts`, `process-notification.ts`, teste |
| A7 | Expirar pedidos pendentes (>3 dias) e devolver o cupom; rota de cron protegida por `CRON_SECRET` | migration `20261103000002_expire_pending_orders.sql`, `api/cron/expire-orders/route.ts`, `vercel.json` |
| A8 | Limites do bucket `product-images` (tamanho/mime) versionados | migration `20261103000003_storage_limits.sql` |
| A9 | Verificação final: typecheck, lint, unit, build | — |

## Parte B — Ações manuais (checklist para o dono)

**Vercel** — `NEXT_PUBLIC_SITE_URL=https://pingodeluz.com`, `MERCADOPAGO_ACCESS_TOKEN` (`APP_USR-…`), `MERCADOPAGO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `CRON_SECRET`, `NEXT_PUBLIC_STORE_LEGAL_NAME`, `NEXT_PUBLIC_STORE_CNPJ`; redeploy da `main`.

**Mercado Pago** — webhook de produção → `https://pingodeluz.com/api/webhooks/mercadopago`, evento "Pagamentos".

**Supabase** — `supabase db push`; SMTP Resend; templates `{{ .Token }}` em Confirm signup e Magic Link; OTP expiry 600; Site URL/Redirect URLs; Google OAuth em produção; considerar plano Pro (backup).

**Dados** — cadastrar estoque dos produtos; remover duplicatas (`caminho-das-rosas-1782513103492`, `petala-de-seda-1782585150649`); promover admin (`update users set is_admin = true where email = '…'`); apagar usuário `teste.pagamento+…@pingodeluz.test`.

**DNS/E-mail** — registro MX (caixa `atendimento@`), DMARC (`_dmarc` TXT `v=DMARC1; p=none; rua=mailto:…`).

**Conteúdo** — página de termos de uso; revisar `/trocas` e `/privacidade`.

**Teste final** — compra real de valor baixo via Pix + estorno.

## Fora de escopo (decisão de negócio)

Desconto Pix de 5% (configurado, nunca aplicado), frete por região, e-mails transacionais, Sentry.
