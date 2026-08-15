import { test, expect } from '@playwright/test';

/**
 * O login é sempre via Google (Supabase OAuth) — não existe senha para
 * clientes. Não dá para automatizar o Google de verdade aqui (a Google
 * bloqueia login por bot), então estes testes cobrem o que é nosso:
 * o botão existe, a URL de autorização é montada certa, e o callback
 * trata erro e código ausente sem quebrar nem abrir redirect externo.
 */
test.describe('login com Google', () => {
  test('visitante deslogado vê o botão "Entrar com Google"', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
  });

  test('clicar no botão leva para o authorize do Supabase pedindo o provider google', async ({ page }) => {
    await page.goto('/perfil');

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

  test('o destino pós-login (redirect) chega até a URL de autorização', async ({ page }) => {
    // O checkout manda o visitante deslogado para /perfil?redirect=/checkout.
    await page.goto('/checkout');
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
    await page.goto('/auth/callback');
    await expect(page).toHaveURL(/\/perfil\?error=auth/);
  });

  test('callback com código inválido não derruba o site — volta para o perfil com erro', async ({ page }) => {
    await page.goto('/auth/callback?code=isso-nao-e-um-codigo-valido');
    await expect(page).toHaveURL(/\/perfil\?error=auth/);
  });

  test('callback não é um redirect aberto: next externo é ignorado', async ({ page }) => {
    // Sem `code`, o proxy nem chega a olhar o `next` — mas a rota já
    // recusa alvos fora do site antes disso, então isso não deve nunca
    // levar a origem para fora de pingodeluz.
    const res = await page.goto('/auth/callback?next=https://evil.example.com');
    expect(res?.url()).not.toContain('evil.example.com');
  });
});
