# Pingo de Luz

Loja de roupa infantil. Next.js 16 (App Router) + Supabase + Mercado Pago.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

A aplicação sobe em http://localhost:3000.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação de tipos sem emitir arquivos |
| `npm run test:unit` | Testes de lógica pura (preço, cupom, frete, gateway) |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) |
| `npm run lint` | ESLint |

## Banco de dados

O schema é versionado em `supabase/migrations/`. Para aplicar:

```bash
supabase db push
```

**Depois da primeira aplicação, promova o dono da loja a administrador** — sem
isso ninguém acessa `/admin`. No SQL editor do Supabase:

```sql
update users set is_admin = true where email = 'dono@exemplo.com';
```

## Estrutura

```
src/
  app/
    actions/        Server Actions — toda escrita passa por aqui
    admin/(painel)/ Painel administrativo (protegido no servidor)
    api/webhooks/   Recebimento de notificações de pagamento
  components/       Componentes de UI
  context/          Carrinho, usuário e estado do painel
  lib/
    payments/       Camada de pagamento desacoplada — ver README próprio
    data.ts         Leitura do catálogo
    money.ts        Dinheiro em centavos
    pricing.ts      Frete, descontos e totais
    coupon.ts       Regras de cupom
    admin-auth.ts   requireAdmin()
  proxy.ts          Sessão e proteção de rotas (era `middleware.ts`)
supabase/migrations/
docs/
  adr/              Decisões de arquitetura
  plans/            Planos de implementação
```

## Decisões que valem conhecer antes de mexer

- **Dinheiro é sempre `integer` em centavos.** Formatação só na borda da UI,
  por `lib/money.ts`. Ver [ADR-2](docs/adr/002-dinheiro-em-centavos.md).
- **O cliente nunca informa preço.** O checkout recebe id, tamanho e
  quantidade; o resto vem do banco. Ver [ADR-7](docs/adr/007-checkout-servidor.md).
- **Pagamento é acessado por trás de uma interface.** Nada fora de
  `src/lib/payments/` importa o SDK do provedor. Ver
  [ADR-1](docs/adr/001-pagamentos-ports-adapters.md).
- **`requireAdmin()` é a fronteira de segurança do painel**, não o proxy nem a
  UI. Ver [ADR-5](docs/adr/005-autorizacao-em-camadas.md).
- **Não existe catálogo de mentira no código.** Falha de dados vira erro
  visível. Ver [ADR-6](docs/adr/006-sem-dados-ficticios.md).

## Next.js 16

Esta versão tem mudanças que quebram compatibilidade com o que se costuma
assumir. A mais relevante aqui: **`middleware.ts` foi renomeado para
`proxy.ts`**. Antes de escrever código, consulte a documentação que acompanha a
instalação, em `node_modules/next/dist/docs/`.
