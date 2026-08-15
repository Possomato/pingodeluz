'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { IconGoogle } from '@/components/Icons';
import {
  normalizeEmail,
  isValidEmail,
  formatOtpCode,
  isCompleteOtpCode,
  otpErrorMessage,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} from '@/lib/otp';

/**
 * Tela de login — Google e código por e-mail.
 *
 * Os dois caminhos terminam na mesma sessão do Supabase: mesmo cookie,
 * mesmo refresh, mesmo `onAuthStateChange`. Depois de autenticar não
 * existe "usuário de e-mail" e "usuário de Google", existe `auth.users`.
 *
 * O OTP roda no client de propósito. `verifyOtp` pelo client do browser
 * grava a sessão em cookie (o servidor enxerga igual) *e* dispara o
 * `onAuthStateChange`, então a tela troca sozinha. Numa Server Action o
 * cookie até seria gravado, mas o React não ficaria sabendo.
 */

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ animation: 'pdl-spin 0.8s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray="44"
        strokeDashoffset="22"
      />
    </svg>
  );
}

export default function LoginPanel({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);
  // Guarda contra o auto-submit disparar duas vezes: o onChange que
  // completa o código e um re-render logo em seguida chamariam ambos.
  const verifiedCodeRef = useRef<string | null>(null);

  // Só caminhos internos — um `redirectTo` absoluto viraria redirect
  // aberto, mesma trava do /auth/callback.
  const safeRedirect =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'codigo') codeInputRef.current?.focus();
  }, [step]);

  // ─── Google ────────────────────────────────────────────────

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${safeRedirect}`,
      },
    });
    // Em caso de sucesso a página navega para o Google e nada abaixo
    // roda; só chegamos aqui se o redirect nem começou.
    if (err) {
      setError(otpErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  // ─── Envio do código ───────────────────────────────────────

  const sendCode = async (target: string) => {
    setSending(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        // Quem nunca comprou se cadastra por aqui mesmo. O perfil em
        // public.users nasce do trigger em auth.users, igual ao Google.
        shouldCreateUser: true,
      },
    });

    setSending(false);

    if (err) {
      setError(otpErrorMessage(err));
      return false;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeEmail(email);

    if (!isValidEmail(target)) {
      setError('Digite um e-mail válido, como ana@exemplo.com.');
      return;
    }

    setEmail(target);
    if (await sendCode(target)) {
      setCode('');
      verifiedCodeRef.current = null;
      setStep('codigo');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setCode('');
    verifiedCodeRef.current = null;
    if (await sendCode(email)) codeInputRef.current?.focus();
  };

  // ─── Verificação ───────────────────────────────────────────

  const verify = useCallback(
    async (value: string) => {
      if (verifiedCodeRef.current === value) return;
      verifiedCodeRef.current = value;

      setVerifying(true);
      setError(null);

      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: value,
        type: 'email',
      });

      if (err) {
        setVerifying(false);
        setError(otpErrorMessage(err));
        setCode('');
        codeInputRef.current?.focus();
        return;
      }

      // A sessão já está no cookie e o onAuthStateChange já avisou o
      // resto da árvore. `refresh` é para os Server Components lerem a
      // sessão nova; seguimos com `verifying` ligado até a navegação
      // acontecer, para não piscar o formulário vazio.
      router.replace(safeRedirect);
      router.refresh();
    },
    [email, router, safeRedirect, supabase]
  );

  const handleCodeChange = (raw: string) => {
    const next = formatOtpCode(raw);
    setCode(next);
    if (error) setError(null);
    if (isCompleteOtpCode(next)) verify(next);
  };

  const busy = sending || verifying;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="pdl-login">
      <div style={{ maxWidth: '200px', margin: '0 auto 6px', width: '100%' }}>
        <Image
          src="/logo-transparente.png"
          alt="Pingo de Luz"
          width={200}
          height={100}
          priority
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {step === 'email' ? (
        <>
          <h2 className="pdl-login-welcome">
            Bem-vinda <em>de volta.</em>
          </h2>
          <div className="pdl-login-sub">
            Entre para ver seus pedidos, salvar endereços e acompanhar as peças favoritas.
          </div>

          <button
            className="pdl-google-btn"
            onClick={handleGoogle}
            disabled={googleLoading || busy}
          >
            {googleLoading ? (
              <>
                <Spinner />
                entrando…
              </>
            ) : (
              <>
                <IconGoogle size={18} />
                Entrar com Google
              </>
            )}
          </button>

          <div className="pdl-login-divider">
            <span>ou</span>
          </div>

          <form className="pdl-login-form" onSubmit={handleSubmitEmail} noValidate>
            <label className="pdl-field-label" htmlFor="pdl-login-email">
              Entrar com e-mail
            </label>
            <input
              id="pdl-login-email"
              className="pdl-field"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy || googleLoading}
              aria-describedby="pdl-login-status"
            />
            {/* Não desabilitamos com o campo vazio de propósito: um botão
                apagado não explica o que falta. Clicar mostra o motivo. */}
            <button type="submit" className="pdl-btn-outline" disabled={busy || googleLoading}>
              {sending ? (
                <>
                  <Spinner />
                  enviando…
                </>
              ) : (
                'Receber código'
              )}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="pdl-login-welcome">
            Confira seu <em>e-mail.</em>
          </h2>
          <div className="pdl-login-sub">
            Enviamos um código de {OTP_LENGTH} dígitos para <strong>{email}</strong>. Ele vale por
            poucos minutos.
          </div>

          <form className="pdl-login-form" onSubmit={(e) => e.preventDefault()}>
            <label className="pdl-field-label" htmlFor="pdl-login-code">
              Código de verificação
            </label>
            <input
              id="pdl-login-code"
              ref={codeInputRef}
              className="pdl-otp-input"
              type="text"
              name="one-time-code"
              inputMode="numeric"
              // Deixa o iOS/Android oferecerem o código direto do app de
              // e-mail, sem a pessoa precisar sair da tela.
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              placeholder="······"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              disabled={verifying}
              aria-describedby="pdl-login-status"
            />

            <div className="pdl-otp-actions">
              <button
                type="button"
                className="pdl-link-btn"
                onClick={handleResend}
                disabled={cooldown > 0 || busy}
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
              </button>
              <span className="pdl-otp-sep" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className="pdl-link-btn"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                  verifiedCodeRef.current = null;
                }}
                disabled={verifying}
              >
                Trocar e-mail
              </button>
            </div>
          </form>
        </>
      )}

      {/* Uma única região viva para erro e progresso: leitores de tela
          anunciam a mudança sem precisar de foco. */}
      <p id="pdl-login-status" className="pdl-login-status" role="status" aria-live="polite">
        {error ? (
          <span className="pdl-login-error">{error}</span>
        ) : verifying ? (
          'Verificando código…'
        ) : (
          ''
        )}
      </p>

      <div className="pdl-login-foot">
        Ao continuar, você concorda com os <a href="/trocas">Termos</a> e nossa{' '}
        <a href="/privacidade">Política de privacidade</a>. Não criamos senha — você entra com o
        Google ou com um código enviado para seu e-mail.
      </div>
    </div>
  );
}
