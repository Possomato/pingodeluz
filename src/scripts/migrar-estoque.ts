/**
 * Migra a disponibilidade do modelo antigo para o controle de estoque.
 *
 *   npx tsx src/scripts/migrar-estoque.ts <quantidade> [--aplicar]
 *
 * Antes, um tamanho estava disponível se NÃO aparecesse em `unavail`;
 * não existia quantidade. Agora a loja controla estoque de verdade, e
 * `stock` vazio significa esgotado — ou seja, sem esta migração os
 * produtos existentes não podem ser comprados.
 *
 * A quantidade é um argumento obrigatório porque é decisão do lojista:
 * ninguém além dele sabe quantas peças existem. Sem `--aplicar` o
 * script apenas mostra o que faria.
 *
 * Exemplo — dar 5 unidades a cada tamanho antes indisponível:
 *   npx tsx src/scripts/migrar-estoque.ts 5 --aplicar
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, ''),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const qty = Number(process.argv[2]);
const apply = process.argv.includes('--aplicar');

if (!Number.isInteger(qty) || qty < 0) {
  console.error('uso: npx tsx src/scripts/migrar-estoque.ts <quantidade> [--aplicar]');
  process.exit(1);
}

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, sizes, unavail, stock');

  if (error) {
    console.error('Falha ao ler produtos:', error.message);
    process.exit(1);
  }

  let changed = 0;

  for (const p of products ?? []) {
    const sizes: string[] = p.sizes ?? [];
    const unavail: string[] = p.unavail ?? [];
    const current: Record<string, number> = p.stock ?? {};

    // Só preenche tamanho ainda sem registro — nunca sobrescreve estoque real.
    const next = { ...current };
    let touched = false;

    for (const size of sizes) {
      if (size in current) continue;
      next[size] = unavail.includes(size) ? 0 : qty;
      touched = true;
    }

    if (!touched) continue;
    changed++;

    console.log(`${apply ? '→' : '·'} ${p.name}: ${JSON.stringify(next)}`);

    if (apply) {
      const { error: upErr } = await supabase
        .from('products')
        .update({ stock: next })
        .eq('id', p.id);
      if (upErr) console.error(`  falhou: ${upErr.message}`);
    }
  }

  console.log(
    changed === 0
      ? '\nNada a fazer: todos os tamanhos já têm estoque registrado.'
      : apply
        ? `\n${changed} produto(s) atualizado(s). Revise em /admin/estoque.`
        : `\n${changed} produto(s) seriam atualizados. Rode de novo com --aplicar.`
  );

}

main();
