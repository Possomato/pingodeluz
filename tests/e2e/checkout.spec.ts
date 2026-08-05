import { test, expect } from '@playwright/test';

test.describe('checkout', () => {
  test('exige sessão', async ({ page }) => {
    await page.goto('/checkout');
    // Sem login, o proxy manda para o perfil com o destino guardado.
    await expect(page).toHaveURL(/\/perfil/);
    await expect(page).toHaveURL(/redirect=%2Fcheckout/);
  });

  test('confirmação sem pedido volta para a home', async ({ page }) => {
    await page.goto('/confirmacao');
    await expect(page).toHaveURL(/\/(perfil)?$|\/perfil/);
  });
});
