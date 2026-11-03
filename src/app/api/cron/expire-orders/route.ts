import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * Cron diário: cancela pedidos pendentes antigos e devolve o cupom.
 * Agendado em vercel.json. A Vercel envia `Authorization: Bearer
 * $CRON_SECRET`; sem o segredo configurado a rota recusa tudo.
 */

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response('Unauthorized', { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service.rpc('expire_pending_orders');

  if (error) {
    console.error('[cron] falha ao expirar pedidos:', error.message);
    return new Response('Error', { status: 500 });
  }

  revalidatePath('/admin/pedidos');
  return Response.json({ expired: data as number });
}
