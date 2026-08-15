import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  isValidEmail,
  formatOtpCode,
  isCompleteOtpCode,
  otpErrorMessage,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} from '../otp';

// ─── normalizeEmail ──────────────────────────────────────────

test('remove espaços nas pontas', () => {
  assert.equal(normalizeEmail('  ana@exemplo.com  '), 'ana@exemplo.com');
});

test('baixa a caixa do e-mail', () => {
  assert.equal(normalizeEmail('Ana@Exemplo.COM'), 'ana@exemplo.com');
});

test('remove espaços internos coladinhos pelo autocomplete do teclado', () => {
  assert.equal(normalizeEmail('ana @exemplo.com'), 'ana@exemplo.com');
});

// ─── isValidEmail ────────────────────────────────────────────

test('aceita e-mails comuns', () => {
  assert.equal(isValidEmail('ana@exemplo.com'), true);
  assert.equal(isValidEmail('ana.maria+loja@sub.exemplo.com.br'), true);
});

test('recusa e-mail sem arroba, sem domínio ou sem TLD', () => {
  assert.equal(isValidEmail('anaexemplo.com'), false);
  assert.equal(isValidEmail('ana@'), false);
  assert.equal(isValidEmail('ana@exemplo'), false);
});

test('recusa string vazia ou só espaços', () => {
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('   '), false);
});

test('valida depois de normalizar, então maiúsculas e espaços passam', () => {
  assert.equal(isValidEmail('  Ana@Exemplo.com '), true);
});

// ─── formatOtpCode ───────────────────────────────────────────

test('mantém apenas dígitos', () => {
  assert.equal(formatOtpCode('12a3b4'), '1234');
});

test('descarta espaços e traços de um código colado do e-mail', () => {
  assert.equal(formatOtpCode('123 456'), '123456');
  assert.equal(formatOtpCode('123-456'), '123456');
});

test('trunca no comprimento do código', () => {
  assert.equal(formatOtpCode('1234567890'), '123456');
  assert.equal(formatOtpCode('1234567890').length, OTP_LENGTH);
});

test('string sem nenhum dígito vira vazia', () => {
  assert.equal(formatOtpCode('abc'), '');
});

// ─── isCompleteOtpCode ───────────────────────────────────────

test('código completo tem exatamente OTP_LENGTH dígitos', () => {
  assert.equal(isCompleteOtpCode('123456'), true);
});

test('código curto ainda não está completo', () => {
  assert.equal(isCompleteOtpCode('12345'), false);
  assert.equal(isCompleteOtpCode(''), false);
});

test('código com letra não conta como completo', () => {
  assert.equal(isCompleteOtpCode('12345a'), false);
});

// ─── otpErrorMessage ─────────────────────────────────────────

test('traduz código inválido ou expirado', () => {
  assert.match(
    otpErrorMessage({ message: 'Token has expired or is invalid' }),
    /inv[áa]lido ou expirado/i
  );
});

test('traduz excesso de tentativas em pedido de espera', () => {
  assert.match(
    otpErrorMessage({ message: 'Email rate limit exceeded', status: 429 }),
    /aguarde/i
  );
});

test('status 429 vira pedido de espera mesmo com mensagem desconhecida', () => {
  assert.match(otpErrorMessage({ message: 'whatever', status: 429 }), /aguarde/i);
});

// Falha de SMTP é problema nosso, não do e-mail que a pessoa digitou.
// Mandar ela "conferir se escreveu certo" faz reescrever um endereço que
// já estava certo e nunca funcionar.
test('falha de envio no servidor não culpa o e-mail da pessoa', () => {
  const msg = otpErrorMessage({ message: 'Error sending magic link email', status: 500 });
  assert.match(msg, /enviar/i);
  assert.doesNotMatch(msg, /escrito certo/i);
});

test('falha de envio no cadastro novo também vira mensagem de envio', () => {
  // O Supabase usa outro texto quando o template é o de signup.
  const msg = otpErrorMessage({ message: 'Error sending confirmation email', status: 500 });
  assert.match(msg, /enviar/i);
  assert.doesNotMatch(msg, /escrito certo/i);
});

test('erro de SMTP explícito vira mensagem de envio', () => {
  assert.match(otpErrorMessage({ message: 'smtp: invalid credentials' }), /enviar/i);
});

test('erro de assinatura de e-mail inválido vira mensagem sobre o e-mail', () => {
  assert.match(
    otpErrorMessage({ message: 'Unable to validate email address: invalid format' }),
    /e-mail/i
  );
});

test('erro desconhecido cai numa mensagem genérica em português', () => {
  const msg = otpErrorMessage({ message: 'kaboom' });
  assert.match(msg, /tente/i);
  assert.doesNotMatch(msg, /kaboom/);
});

test('erro nulo também produz mensagem genérica', () => {
  assert.equal(typeof otpErrorMessage(null), 'string');
  assert.ok(otpErrorMessage(null).length > 0);
});

// ─── constantes ──────────────────────────────────────────────

test('o código tem 6 dígitos e o reenvio espera 60 segundos', () => {
  assert.equal(OTP_LENGTH, 6);
  assert.equal(RESEND_COOLDOWN_SECONDS, 60);
});
