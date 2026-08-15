import { test, expect } from '@playwright/test';

/**
 * Cliente entra de dois jeitos, nenhum com senha: Google (OAuth) ou
 * código de 6 dígitos no e-mail (OTP). Os dois terminam na mesma sessão
 * do Supabase.
 *
 * Nem o Google nem a caixa de entrada dão para automatizar aqui, então
 * estes testes cobrem o que é nosso: os botões existem, a URL de
 * autorização é montada certa, o callback trata erro sem abrir redirect
 * externo, e o fluxo de OTP troca de passo, respeita o cooldown e
 * mostra erro em português quando o Supabase recusa.
 *
 * Todo `goto` usa `domcontentloaded` em vez do `load` padrão: a tela de
 * login dispara uma chamada de sessão ao Supabase, e esperar o `load` é
 * esperar essa requisição a um terceiro terminar. Com os workers em
 * paralelo ela às vezes fica pendurada e o teste estoura o timeout com a
 * página já renderizada na frente. Os `expect` têm espera automática.
 */
test.describe('login com Google', () => {
  test('visitante deslogado vê o botão "Entrar com Google"', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
  });

  test('clicar no botão leva para o authorize do Supabase pedindo o provider google', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });

    // O Supabase redireciona direto pro Google assim que a página de
    // authorize responde, então interceptamos a requisição em vez de
    // esperar a navegação terminar — evita depender da conta real do
    // Google carregar dentro do teste.
    let authorizeUrl: string | null = null;
    await page.route('**/auth/v1/authorize**', async (route) => {
      authorizeUrl = route.request().url();
      await route.abort();
    });

    await page.getByRole('button', { name: /entrar com google/i }).click();
    await expect.poll(() => authorizeUrl, { timeout: 10_000 }).toBeTruthy();

    const url = new URL(authorizeUrl!);
    expect(url.searchParams.get('provider')).toBe('google');

    const redirectTo = url.searchParams.get('redirect_to');
    expect(redirectTo).toBeTruthy();
    expect(new URL(redirectTo!).pathname).toBe('/auth/callback');
  });

  test('sem destino explícito, o login termina na home', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });

    let authorizeUrl: string | null = null;
    await page.route('**/auth/v1/authorize**', async (route) => {
      authorizeUrl = route.request().url();
      await route.abort();
    });

    await page.getByRole('button', { name: /entrar com google/i }).click();
    await expect.poll(() => authorizeUrl, { timeout: 10_000 }).toBeTruthy();

    const redirectTo = decodeURIComponent(
      new URL(authorizeUrl!).searchParams.get('redirect_to') ?? ''
    );
    expect(redirectTo).toContain('next=/');
    expect(redirectTo).not.toContain('next=/perfil');
  });

  test('o destino pós-login (redirect) chega até a URL de autorização', async ({ page }) => {
    // O checkout manda o visitante deslogado para /perfil?redirect=/checkout.
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/redirect=%2Fcheckout/);

    let authorizeUrl: string | null = null;
    await page.route('**/auth/v1/authorize**', async (route) => {
      authorizeUrl = route.request().url();
      await route.abort();
    });

    await page.getByRole('button', { name: /entrar com google/i }).click();
    await expect.poll(() => authorizeUrl, { timeout: 10_000 }).toBeTruthy();

    const url = new URL(authorizeUrl!);
    const redirectTo = decodeURIComponent(url.searchParams.get('redirect_to') ?? '');
    expect(redirectTo).toContain('next=/checkout');
  });

  test('callback sem código volta para o perfil com erro', async ({ page }) => {
    await page.goto('/auth/callback', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/perfil\?error=auth/);
  });

  test('callback com código inválido não derruba o site — volta para o perfil com erro', async ({ page }) => {
    await page.goto('/auth/callback?code=isso-nao-e-um-codigo-valido', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/perfil\?error=auth/);
  });

  test('callback não é um redirect aberto: next externo é ignorado', async ({ page }) => {
    // Sem `code`, o proxy nem chega a olhar o `next` — mas a rota já
    // recusa alvos fora do site antes disso, então isso não deve nunca
    // levar a origem para fora de pingodeluz.
    const res = await page.goto('/auth/callback?next=https://evil.example.com', { waitUntil: 'domcontentloaded' });
    expect(res?.url()).not.toContain('evil.example.com');
  });
});

test.describe('login com código no e-mail (OTP)', () => {
  /** Finge a resposta do endpoint de envio do Supabase. */
  const stubEnvio = (page: import('@playwright/test').Page, status: number, body: object = {}) =>
    page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    );

  /** Finge a resposta da verificação do código. */
  const stubVerificacao = (page: import('@playwright/test').Page, status: number, body: object) =>
    page.route('**/auth/v1/verify**', (route) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    );

  test('visitante deslogado vê as duas opções de entrada', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
    await expect(page.getByLabel(/entrar com e-mail/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /receber c[óo]digo/i })).toBeVisible();
  });

  test('e-mail inválido nem chega a pedir código ao Supabase', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });

    let chamou = false;
    await page.route('**/auth/v1/otp**', async (route) => {
      chamou = true;
      await route.abort();
    });

    await page.getByLabel(/entrar com e-mail/i).fill('nao-e-email');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();

    await expect(page.getByRole('status')).toContainText(/e-mail v[áa]lido/i);
    expect(chamou).toBe(false);
    // Continua no primeiro passo.
    await expect(page.getByLabel(/entrar com e-mail/i)).toBeVisible();
  });

  test('envio bem-sucedido troca para o passo do código e trava o reenvio', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 200);

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();

    await expect(page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i)).toBeVisible();
    await expect(page.getByText('ana@exemplo.com')).toBeVisible();

    // O botão de reenviar nasce em contagem regressiva — sem isso a
    // pessoa martela e queima a cota do provedor de e-mail.
    const reenviar = page.getByRole('button', { name: /reenviar/i });
    await expect(reenviar).toBeDisabled();
    await expect(reenviar).toHaveText(/reenviar em \d+s/i);
  });

  test('"trocar e-mail" volta para o primeiro passo', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 200);

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();
    await expect(page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i)).toBeVisible();

    await page.getByRole('button', { name: /trocar e-mail/i }).click();
    await expect(page.getByLabel(/entrar com e-mail/i)).toHaveValue('ana@exemplo.com');
  });

  test('o campo do código aceita só dígitos e para em 6', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 200);
    // Sem stub de verify, o auto-submit falharia na rede; travamos ele.
    await page.route('**/auth/v1/verify**', (route) => route.abort());

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();

    const campo = page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i);
    await campo.fill('12a3');
    await expect(campo).toHaveValue('123');
  });

  test('código recusado mostra erro em português e limpa o campo', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 200);
    await stubVerificacao(page, 403, {
      error_code: 'otp_expired',
      msg: 'Token has expired or is invalid',
      message: 'Token has expired or is invalid',
    });

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();

    const campo = page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i);
    await campo.fill('123456');

    await expect(page.getByRole('status')).toContainText(/inv[áa]lido ou expirado/i);
    await expect(campo).toHaveValue('');
    // A mensagem crua do Supabase nunca aparece na tela.
    await expect(page.locator('body')).not.toContainText(/Token has expired/i);
  });

  test('rate limit do Supabase vira pedido de espera, não erro técnico', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 429, {
      error_code: 'over_email_send_rate_limit',
      msg: 'Email rate limit exceeded',
      message: 'Email rate limit exceeded',
    });

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();

    await expect(page.getByRole('status')).toContainText(/aguarde/i);
    // Falhou o envio, então não avança para o passo do código.
    await expect(page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i)).toHaveCount(0);
  });

  test('código aceito leva para a home, não para o perfil', async ({ page }) => {
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await stubEnvio(page, 200);

    // Sessão de mentira, no formato que o supabase-js espera de volta do
    // /verify. Não precisa ser um JWT válido: o client só guarda o que
    // veio e dispara o onAuthStateChange, que é o que estamos testando.
    await stubVerificacao(page, 200, {
      access_token: 'token-de-teste',
      refresh_token: 'refresh-de-teste',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ana@exemplo.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
      },
    });

    await page.getByLabel(/entrar com e-mail/i).fill('ana@exemplo.com');
    await page.getByRole('button', { name: /receber c[óo]digo/i }).click();
    await page.getByLabel(/c[óo]digo de verifica[çc][ãa]o/i).fill('123456');

    // Auto-submit no 6º dígito → sessão → home.
    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveURL(/\/perfil/);
  });
});
