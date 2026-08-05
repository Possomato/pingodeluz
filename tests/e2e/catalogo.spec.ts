import { test, expect } from '@playwright/test';

test.describe('catálogo', () => {
  test('a home carrega e leva a um produto', async ({ page }) => {
    await page.goto('/');

    // O título editorial da home.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const firstProduct = page.locator('.pdl-prod').first();

    // Loja recém-instalada pode não ter produtos; nesse caso não há o que testar.
    if ((await firstProduct.count()) === 0) test.skip();

    await firstProduct.click();
    await expect(page).toHaveURL(/\/produto\//);
    await expect(page.locator('.pdl-prodpage-price')).toBeVisible();
  });

  test('preços aparecem formatados em reais', async ({ page }) => {
    await page.goto('/');
    const price = page.locator('.pdl-prod-price').first();
    if ((await price.count()) === 0) test.skip();
    await expect(price).toHaveText(/^R\$ [\d.,]+$/);
  });

  test('a busca responde a um termo', async ({ page }) => {
    await page.goto('/busca?q=vestido');
    await expect(page).toHaveURL(/q=vestido/);
  });

  test('página inexistente mostra 404 da loja', async ({ page }) => {
    const res = await page.goto('/produto/nao-existe-mesmo');
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/perdeu/i)).toBeVisible();
  });
});
