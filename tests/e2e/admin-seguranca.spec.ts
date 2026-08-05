import { test, expect } from '@playwright/test';

/**
 * O painel era protegido por uma senha embutida no bundle do cliente.
 * Estes testes cobrem a direção que importa: quem não é administrador
 * não entra e não escreve.
 */
test.describe('segurança do painel', () => {
  test('visitante deslogado é mandado para o login', async ({ page }) => {
    await page.goto('/admin/produtos');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('as demais rotas do painel também exigem sessão', async ({ page }) => {
    for (const path of ['/admin/pedidos', '/admin/clientes', '/admin/cupons', '/admin/estoque']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test('a senha antiga não aparece em lugar nenhum do bundle', async ({ page }) => {
    const bodies: string[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/_next/static/') && res.url().endsWith('.js')) {
        bodies.push(await res.text().catch(() => ''));
      }
    });

    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    expect(bodies.join('')).not.toContain('pingo2024');
  });

  test('a tela de login pede e-mail e senha, não só uma senha', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('#adm-email')).toBeVisible();
    await expect(page.locator('#adm-pass')).toBeVisible();
  });
});
