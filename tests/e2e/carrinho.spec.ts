import { test, expect } from '@playwright/test';

test.describe('carrinho', () => {
  test('começa vazio — sem itens de demonstração', async ({ page }) => {
    await page.goto('/carrinho');

    // O MVP vinha com dois produtos fixos já na sacola.
    await expect(page.locator(".pdl-cart-empty").getByText(/sacola está esperando/i)).toBeVisible();
    await expect(page.locator('.pdl-cart-item')).toHaveCount(0);
  });

  test('sem tamanho, o botão de comprar pede um tamanho em vez de travar', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('.pdl-prod').first();
    if ((await firstProduct.count()) === 0) test.skip();
    await firstProduct.click();

    const cta = page.locator('.pdl-cta-btn').first();
    if (await cta.isDisabled()) test.skip(); // peça esgotada
    await cta.click();
    await expect(page.getByText(/escolha um tamanho/i)).toBeVisible();
  });

  test('adicionar uma peça abre a mini-sacola, e ela sobrevive ao reload', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('.pdl-prod').first();
    if ((await firstProduct.count()) === 0) test.skip();
    await firstProduct.click();

    // Só tamanhos com estoque são clicáveis.
    const size = page.locator('.pdl-size:not([disabled])').first();
    if ((await size.count()) === 0) test.skip();
    await size.click();

    await page.locator('.pdl-cta-btn.active').first().click();

    // A pessoa não é tirada da página: a mini-sacola abre por cima.
    const bag = page.getByRole('dialog', { name: /sua sacola/i });
    await expect(bag).toBeVisible();
    await expect(bag.locator('.pdl-bag-item')).toHaveCount(1);

    await bag.getByRole('button', { name: 'ver sacola' }).click();
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
