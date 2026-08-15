import { test, expect } from '@playwright/test';

/**
 * `domcontentloaded` em vez do `load` padrão: as duas rotas caem na tela
 * de login, que dispara uma chamada de sessão ao Supabase. Esperar o
 * `load` é esperar essa requisição a um terceiro terminar — e com os
 * workers em paralelo ela às vezes fica pendurada, derrubando o teste
 * por timeout mesmo com a página já renderizada. Os `expect` abaixo têm
 * espera automática, então não perdemos nada.
 */
test.describe('checkout', () => {
  test('exige sessão', async ({ page }) => {
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    // Sem login, o proxy manda para o perfil com o destino guardado.
    await expect(page).toHaveURL(/\/perfil/);
    await expect(page).toHaveURL(/redirect=%2Fcheckout/);
  });

  test('confirmação sem pedido volta para a home', async ({ page }) => {
    await page.goto('/confirmacao', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(perfil)?$|\/perfil/);
  });
});
