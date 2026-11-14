import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickFeatured, countSales } from '../featured';
import type { Product } from '../data';

const p = (id: string, stock: Record<string, number>): Product => ({
  id, name: id, nameParts: [id, ''], col: 'c', priceCentavos: 1000, tint: 'rose', label: '', stock, active: true,
});

test('destaque: a mais vendida com estoque', () => {
  const list = [p('a', { '2': 1 }), p('b', { '2': 3 }), p('c', { '2': 1 })];
  assert.equal(pickFeatured(list, { a: 2, b: 9, c: 5 })?.id, 'b');
});

test('destaque: a mais vendida esgotada cede lugar à próxima com estoque', () => {
  const list = [p('a', { '2': 1 }), p('b', { '2': 0 }), p('c', { '2': 1 })];
  assert.equal(pickFeatured(list, { a: 2, b: 9, c: 5 })?.id, 'c');
});

test('destaque: sem vendas, a primeira com estoque', () => {
  const list = [p('a', {}), p('b', { '4': 2 }), p('c', { '4': 2 })];
  assert.equal(pickFeatured(list, {})?.id, 'b');
});

test('destaque: tudo esgotado ainda devolve a mais vendida; catálogo vazio devolve null', () => {
  assert.equal(pickFeatured([p('a', {}), p('b', {})], { b: 3 })?.id, 'b');
  assert.equal(pickFeatured([], {}), null);
});

test('contagem de vendas soma quantidades e ignora itens malformados', () => {
  const sales = countSales([
    { items: [{ id: 'a', qty: 2 }, { id: 'b', qty: 1 }] },
    { items: [{ id: 'a' }, { qty: 3 }, null] },
    { items: 'lixo' },
  ]);
  assert.deepEqual(sales, { a: 3, b: 1 });
});
