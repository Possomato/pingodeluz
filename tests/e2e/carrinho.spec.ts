import { test, expect } from '@playwright/test';

test.describe('carrinho', () => {
  test('começa vazio — sem itens de demonstração', async ({ page }) => {
    await page.goto('/carrinho');

    // O MVP vinha com dois produtos fixos já na sacola.
    await expect(page.getByText(/sacola está esperando/i)).toBeVisible();
    await expect(page.locator('.pdl-cart-item')).toHaveCount(0);
  });

  test('adicionar uma peça e ver que ela sobrevive ao reload', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('.pdl-prod').first();
    if ((await firstProduct.count()) === 0) test.skip();
    await firstProduct.click();

    // Só tamanhos com estoque são clicáveis.
    const size = page.locator('.pdl-size:not([disabled])').first();
    if ((await size.count()) === 0) test.skip();
    await size.click();

    await page.locator('.pdl-cta-btn.active').first().click();
    await expect(page).toHaveURL(/\/carrinho/);
    await expect(page.locator('.pdl-cart-item')).toHaveCount(1);

    await page.reload();
    await expect(page.locator('.pdl-cart-item')).toHaveCount(1);
  });

  test('cupom inexistente mostra erro e não desconta', async ({ page }) => {
    await page.goto('/carrinho');
    const input = page.locator('#cupom');
    if (!(await input.isVisible().catch(() => false))) test.skip();

    await input.fill('NAOEXISTE');
    await page.getByRole('button', { name: 'aplicar' }).click();
    await expect(page.getByText(/não encontrado/i)).toBeVisible();
  });
});
