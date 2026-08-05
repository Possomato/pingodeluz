'use server';

import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';
import { computeDiscount, normalizeCouponCode, validateCoupon, type Coupon } from '@/lib/coupon';

function rowToCoupon(row: Record<string, unknown>): Coupon {
  return {
    code: row.code as string,
    kind: row.kind as 'percent' | 'fixed',
    value: row.value as number,
    minSubtotalCentavos: row.min_subtotal_centavos as number,
    maxUses: (row.max_uses as number | null) ?? null,
    usedCount: row.used_count as number,
    expiresAt: (row.expires_at as string | null) ?? null,
    active: row.active as boolean,
  };
}

// ─── Cliente ─────────────────────────────────────────────────

export type CouponCheck =
  | { ok: true; code: string; discountCentavos: number }
  | { ok: false; message: string };

/**
 * Confere um cupom para exibir o desconto no checkout.
 *
 * Não devolve os dados do cupom, só o resultado — assim a página não
 * fica sabendo regra nenhuma, e não há como enumerar códigos existentes
 * pela resposta.
 */
export async function checkCouponAction(
  code: string,
  subtotalCentavos: number
): Promise<CouponCheck> {
  if (!code.trim()) return { ok: false, message: 'Informe um cupom.' };

  const service = createServiceClient();
  const normalized = normalizeCouponCode(code);

  const { data } = await service
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (!data) return { ok: false, message: 'Cupom não encontrado.' };

  const coupon = rowToCoupon(data);
  const validation = validateCoupon(coupon, subtotalCentavos);
  if (!validation.ok) return { ok: false, message: validation.message };

  return {
    ok: true,
    code: coupon.code,
    discountCentavos: computeDiscount(coupon, subtotalCentavos),
  };
}

// ─── Admin ───────────────────────────────────────────────────

export interface CouponInput {
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotalCentavos: number;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
}

export async function listCouponsAction() {
  await requireAdmin();
  const service = createServiceClient();

  const { data, error } = await service
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...rowToCoupon(row),
    createdAt: row.created_at as string,
  }));
}

export async function upsertCouponAction(input: CouponInput) {
  await requireAdmin();
  const service = createServiceClient();

  const code = normalizeCouponCode(input.code);
  if (!code) throw new Error('Informe o código do cupom.');
  if (input.value <= 0) throw new Error('O valor do desconto precisa ser maior que zero.');
  if (input.kind === 'percent' && input.value > 100) {
    throw new Error('Um desconto percentual não pode passar de 100%.');
  }

  const { error } = await service.from('coupons').upsert({
    code,
    kind: input.kind,
    value: input.value,
    min_subtotal_centavos: input.minSubtotalCentavos,
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
    active: input.active,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/cupons');
}

export async function setCouponActiveAction(code: string, active: boolean) {
  await requireAdmin();
  const service = createServiceClient();

  const { error } = await service.from('coupons').update({ active }).eq('code', code);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cupons');
}

export async function deleteCouponAction(code: string) {
  await requireAdmin();
  const service = createServiceClient();

  const { error } = await service.from('coupons').delete().eq('code', code);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cupons');
}
