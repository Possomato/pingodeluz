import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCEP, isValidCEP, extractAddressFromCEP, type ViaCEPResponse } from '../cep';

// ─── formatCEP ───────────────────────────────────────────────

test('formata dígitos crus como 00000-000', () => {
  assert.equal(formatCEP('01310100'), '01310-100');
});

test('formata parcialmente enquanto o usuário digita', () => {
  assert.equal(formatCEP('0131'), '0131');
  assert.equal(formatCEP('01310'), '01310');
  assert.equal(formatCEP('013101'), '01310-1');
});

test('ignora caracteres não numéricos', () => {
  assert.equal(formatCEP('01310-100'), '01310-100');
  assert.equal(formatCEP('01.310-100abc'), '01310-100');
});

test('trunca além de 8 dígitos', () => {
  assert.equal(formatCEP('013101009999'), '01310-100');
});

// ─── isValidCEP ──────────────────────────────────────────────

test('CEP com 8 dígitos é válido', () => {
  assert.equal(isValidCEP('01310-100'), true);
  assert.equal(isValidCEP('01310100'), true);
});

test('CEP incompleto é inválido', () => {
  assert.equal(isValidCEP('01310'), false);
  assert.equal(isValidCEP(''), false);
});

test('CEP 00000000 é rejeitado mesmo com 8 dígitos', () => {
  assert.equal(isValidCEP('00000-000'), false);
});

// ─── extractAddressFromCEP ───────────────────────────────────

test('extrai os campos de endereço usados no formulário', () => {
  const data: ViaCEPResponse = {
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    complemento: '',
    bairro: 'Bela Vista',
    localidade: 'São Paulo',
    uf: 'SP',
    ibge: '3550308',
    gia: '1004',
    ddd: '11',
    siafi: '7107',
  };

  assert.deepEqual(extractAddressFromCEP(data), {
    street: 'Avenida Paulista',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  });
});
