/**
 * Login por código de verificação (OTP) enviado por e-mail.
 *
 * Só as partes puras moram aqui — normalizar entrada, validar e traduzir
 * o erro do Supabase para português. As chamadas de rede ficam no
 * componente, porque precisam do client do browser: é ele que grava a
 * sessão em cookie e dispara `onAuthStateChange`, exatamente como o
 * login do Google. Ver `components/LoginPanel.tsx`.
 */

/** Quantidade de dígitos do código. Casa com o padrão do Supabase. */
export const OTP_LENGTH = 6;

/**
 * Espera obrigatória antes de reenviar. Sem isso a pessoa martela o
 * botão, queima a cota do provedor de e-mail e ainda esbarra no rate
 * limit do Supabase — que responde com erro, não com outro e-mail.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Espaço no meio não é typo: teclado de celular cola um espaço junto
 * com a sugestão de autocomplete, e aí o e-mail chega inválido.
 */
export function normalizeEmail(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

/**
 * Checagem local, só para não gastar um envio à toa. A validação que
 * vale é a do Supabase; e-mail de verdade só se prova entregando.
 */
export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(email);
}

/**
 * Deixa passar só dígitos e trunca no tamanho do código, para que colar
 * "123 456" ou "123-456" direto do e-mail funcione.
 */
export function formatOtpCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
}

export function isCompleteOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/**
 * O Supabase responde em inglês e às vezes com detalhe técnico. Nada
 * disso vai para a tela: mapeamos para uma frase que diz o que fazer.
 * O texto original nunca é exibido — só o que reconhecemos.
 */
export function otpErrorMessage(error: { message?: string; status?: number } | null): string {
  const message = error?.message?.toLowerCase() ?? '';

  if (error?.status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }

  // "Error sending magic link email" / "Error sending confirmation email"
  // é SMTP quebrado — problema nosso. Precisa vir antes do bloco de
  // formato, senão a pessoa é mandada corrigir um endereço que estava
  // certo o tempo todo e o login nunca funciona.
  if (message.includes('error sending') || message.includes('smtp')) {
    return 'Não conseguimos enviar o código agora. Tente de novo em instantes.';
  }

  // Antes do bloco do código: "Unable to validate email address: invalid
  // format" contém "invalid" e cairia na mensagem errada.
  if (message.includes('email')) {
    return 'Não conseguimos usar esse e-mail. Confira se está escrito certo.';
  }

  if (message.includes('expired') || message.includes('invalid') || message.includes('token')) {
    // Códigos errados e expirados dão a mesma resposta de propósito:
    // distinguir os dois contaria a um atacante se o e-mail tem código
    // em aberto.
    return 'Código inválido ou expirado. Peça um novo código.';
  }

  return 'Algo deu errado. Tente de novo em instantes.';
}
