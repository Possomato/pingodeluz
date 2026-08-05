# ADR-5 — Autorização em camadas

**Situação:** aceito · 2026-08-04

## Contexto

O painel era protegido por uma constante no bundle do cliente
(`ADMIN_PASSWORD = 'pingo2024'`) comparada no navegador, com o resultado
guardado no localStorage. Qualquer visitante lia a senha no código-fonte
servido e qualquer visitante podia gravar a chave à mão. Pior: as Server
Actions do painel usavam o service role — que ignora RLS — **sem verificar
quem chamou**. Não era preciso nem passar pela tela de login para alterar o
catálogo.

## Decisão

Três camadas, com papéis distintos:

1. **Proxy** (`src/proxy.ts`) — verifica apenas se existe sessão. É barato,
   roda em toda requisição e pode ser executado na CDN. Não consulta o banco.
2. **`requireAdmin()`** (`src/lib/admin-auth.ts`) — consulta `users.is_admin`.
   É chamado no layout de servidor do painel e na **primeira linha de toda
   Server Action** que usa o service role. É a fronteira de segurança real.
3. **RLS** — última linha de defesa, caso algo escape das duas anteriores.

A UI (`checkIsAdminAction`) existe só para decidir o que mostrar e para onde
navegar. Não protege nada.

## Consequências

Uma Server Action nova que use o service role e esqueça o `requireAdmin()` é
uma porta aberta. Por isso a regra está escrita no topo de
`src/app/actions/admin.ts` e o teste e2e cobre o caso de não-admin.

A tabela `users` ganhou um trigger (`users_block_self_promotion`) que impede
alguém de se autopromover no mesmo update em que edita o próprio nome.
