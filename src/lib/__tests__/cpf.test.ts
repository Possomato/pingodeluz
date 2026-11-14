import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCPF, isValidCPF, onlyDigits } from '../cpf';

test('máscara acompanha a digitação', () => {
  assert.equal(formatCPF('123'), '123');
  assert.equal(formatCPF('1234'), '123.4');
  assert.equal(formatCPF('1234567'), '123.456.7');
  assert.equal(formatCPF('12345678909'), '123.456.789-09');
  assert.equal(formatCPF('123.456.789-09999'), '123.456.789-09');
});

test('CPF válido, com ou sem máscara', () => {
  assert.equal(isValidCPF('12345678909'), true);
  assert.equal(isValidCPF('123.456.789-09'), true);
  assert.equal(isValidCPF('191.191.191-00'), true);
});

test('CPF inválido', () => {
  assert.equal(isValidCPF('12345678900'), false);
  assert.equal(isValidCPF('111.111.111-11'), false);
  assert.equal(isValidCPF('1234567890'), false);
  assert.equal(isValidCPF(''), false);
});

test('onlyDigits', () => {
  assert.equal(onlyDigits('123.456.789-09'), '12345678909');
});
