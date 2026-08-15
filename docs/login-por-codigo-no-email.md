# Login por código no e-mail (OTP)

Cliente entra de dois jeitos, nenhum com senha: **Google** ou **código de
6 dígitos enviado por e-mail**. Os dois terminam na mesma sessão do
Supabase — mesmo cookie, mesmo refresh, mesmo `auth.users`. Depois de
autenticar o sistema não sabe (nem precisa saber) por onde a pessoa
entrou.

## Como funciona no código

| Arquivo | Papel |
|---|---|
| [`src/lib/otp.ts`](../src/lib/otp.ts) | Partes puras: normalizar e-mail, validar, traduzir erro do Supabase |
| [`src/components/LoginPanel.tsx`](../src/components/LoginPanel.tsx) | A tela inteira de login — Google e OTP |
| [`src/lib/supabase.ts`](../src/lib/supabase.ts) | `createClient()` memoizado (ver abaixo) |
| [`src/app/perfil/page.tsx`](../src/app/perfil/page.tsx) | Renderiza `<LoginPanel>` quando não há sessão |

### Para onde vai depois de entrar

Login bem-sucedido termina na **home** (`/`). Quem foi mandado para o
login por causa de uma tela protegida volta para ela — o `/checkout`
redireciona para `/perfil?redirect=/checkout` e o login respeita esse
destino. Vale para os dois métodos: o OTP navega direto, e o Google
carrega o mesmo destino no `next` do `/auth/callback`. Só destinos
internos são aceitos, senão viraria redirect aberto.

O fluxo são duas chamadas do próprio Supabase:

```ts
supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
supabase.auth.verifyOtp({ email, token, type: 'email' })
```

Não existe tabela de código, nem envio de e-mail nosso, nem endpoint
nosso. Quem gera, guarda, expira e valida o código é o Supabase.

### Por que no client e não numa Server Action

O `createBrowserClient` do `@supabase/ssr` grava a sessão em **cookie**,
não em localStorage — então o servidor enxerga a sessão igualzinho. E ele
dispara `onAuthStateChange`, que faz a tela trocar sozinha. Numa Server
Action o cookie seria gravado, mas o React não ficaria sabendo, e a
pessoa veria o formulário parado depois de acertar o código.

### Por que `createClient()` é memoizado

Cada chamada a `createBrowserClient` cria um `GoTrueClient` novo, e dois
deles na mesma página não conversam: o `onAuthStateChange` de um não
dispara quando o outro faz login. Como o `LoginPanel` e o
`UserContext` vivem na mesma tela, precisam ser literalmente o mesmo
client — daí o singleton em `lib/supabase.ts`.

### Perfil de quem se cadastra por e-mail

Nada a fazer. O trigger `on_auth_user_created`
([migration 20260804000006](../supabase/migrations/20260804000006_admin_role_and_tracking.sql))
já cai em `split_part(email, '@', 1)` quando não vem `full_name`, e
aceita avatar nulo. Mesmo caminho do Google.

Se a mesma pessoa entra com Google e depois com o mesmo e-mail via
código, o Supabase reconhece **a mesma conta** — não duplica. O
`on conflict (id) do update` do trigger preserva o nome e o avatar que
vieram do Google.

---

## Configuração no Supabase (obrigatória)

Sem estes três passos o login por e-mail **não funciona em produção**.

### 1. SMTP do Resend

O SMTP embutido do Supabase envia **2 e-mails por hora e só para membros
do projeto**. Serve para você testar, não para atender cliente.

1. Crie a conta em [resend.com](https://resend.com) — plano gratuito:
   3.000 e-mails/mês, 100/dia.
2. Em **Domains**, adicione o domínio da loja e publique os registros
   DNS (SPF, DKIM). Sem domínio verificado o e-mail cai em spam.
3. Em **API Keys**, gere uma chave.
4. No Supabase: **Authentication → Emails → SMTP Settings**, ligue
   *Enable Custom SMTP* e preencha:

   | Campo | Valor |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | a API key do Resend |
   | Sender email | `nao-responda@seudominio.com.br` |
   | Sender name | `Pingo de Luz` |

### 2. Template de e-mail com `{{ .Token }}` — nos **dois** templates

**Este é o passo que todo mundo erra**, inclusive na primeira versão
deste documento. Por padrão os templates mandam um *link*, não um
código — e a pessoa fica olhando para um e-mail sem número para digitar.

O detalhe que engana: o `signInWithOtp` não usa sempre o mesmo template.
Quem decide é o estado do usuário.

| Situação | Template que o Supabase usa |
|---|---|
| E-mail **novo** (nunca entrou) | **Confirm signup** |
| E-mail **que já existe** | **Magic Link** |

Como `shouldCreateUser: true` deixa cliente novo se cadastrar por aqui,
os dois casos acontecem em produção. Editar só o Magic Link faz o login
funcionar para quem já tem conta e quebrar para todo mundo novo — o
pior tipo de bug, porque não aparece nos seus testes se você sempre usa
o mesmo e-mail.

Em **Authentication → Emails → Templates**, use este corpo **tanto em
`Confirm signup` quanto em `Magic Link`**:

```html
<h2>Seu código de acesso</h2>
<p>Use este código para entrar na Pingo de Luz:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:sans-serif">{{ .Token }}</p>
<p>Ele vale por 10 minutos. Se você não pediu, pode ignorar este e-mail.</p>
```

Subject nos dois: `Seu código de acesso — Pingo de Luz`

O que faz o Supabase mandar código em vez de link é a presença de
`{{ .Token }}` no corpo. Se sobrar algum `{{ .ConfirmationURL }}`,
remova: a pessoa recebe as duas coisas e clica no link em vez de digitar.

### Como saber se o SMTP do Resend está mesmo ativo

Olhe o **remetente** do e-mail que chegou:

- `noreply@mail.app.supabase.io` → SMTP customizado **desligado**. Você
  está no SMTP embutido: 2 e-mails por hora e só para membros do
  projeto. Nenhum cliente receberia.
- `nao-responda@pingodeluz.com` → Resend ativo. É o que queremos.

### 3. Validade do código

Em **Authentication → Providers → Email**, ajuste **Email OTP Expiration**
para `600` (10 minutos). O padrão é 1 hora — tempo demais para um código
de 6 dígitos ficar valendo.

Confira também, em **Authentication → Rate Limits**, o limite de envio de
e-mail. O padrão costuma bastar; o cooldown de 60s no botão de reenviar
existe justamente para não encostar nele.

---

## Testes

```bash
npm run test:unit     # lib/otp.ts
npm run test:e2e      # tests/e2e/auth.spec.ts
```

Os testes e2e cobrem troca de passo, cooldown, filtro de dígitos e as
mensagens de erro, com a rede do Supabase mockada. O envio real de
e-mail e o login do Google não dão para automatizar — valide os dois na
mão depois de configurar o SMTP.

### Checklist manual antes de abrir para cliente

- [ ] Conferir o remetente do e-mail: tem que ser do domínio da loja, não
      `@mail.app.supabase.io`
- [ ] Pedir código com um e-mail **novo** → chega **código**, não link
      (é o template `Confirm signup`), código entra, e aparece uma linha
      em `public.users`
- [ ] Pedir código de novo com **esse mesmo e-mail**, agora já cadastrado
      → chega código outra vez (agora é o template `Magic Link`). Os dois
      caminhos precisam ser testados, são templates diferentes
- [ ] Pedir código com o e-mail de uma conta que já entrou pelo Google →
      entra na **mesma** conta, nome e avatar do Google preservados
- [ ] Digitar código errado → mensagem em português, campo limpa
- [ ] Esperar o código expirar e usar → mesma mensagem
- [ ] Reenviar → botão fica travado 60s
- [ ] Entrar por e-mail direto em `/perfil` → cai na **home**
- [ ] Entrar por e-mail vindo de `/checkout` → volta para o checkout
