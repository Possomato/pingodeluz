'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';
import MercadoPagoConfig, { Preference } from 'mercadopago';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  size: string;
  tint: string;
  col: string;
}

function parsePrice(price: string): number {
  // handles "R$ 189,90" → 189.90
  return Number(price.replace(/[^0-9,]/g, '').replace(',', '.'));
}

export async function createOrderAction(
  items: CartItem[],
  address: Record<string, string>
): Promise<{ initPoint: string; orderId: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subtotal = items.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);
  const freight = subtotal >= 250 ? 0 : 24;
  const total = subtotal + freight;

  const service = createServiceClient();
  const { data: order, error } = await service
    .from('orders')
    .insert({
      user_id: user.id,
      items,
      total,
      status: 'pendente',
      address,
    })
    .select('id')
    .single();

  if (error || !order) throw new Error(error?.message ?? 'Failed to create order');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const preference = new Preference(mp);
  const response = await preference.create({
    body: {
      items: items.map(item => ({
        id: item.id,
        title: `${item.name} (tam. ${item.size})`,
        quantity: item.qty,
        unit_price: parsePrice(item.price),
        currency_id: 'BRL',
      })),
      back_urls: {
        success: `${siteUrl}/confirmacao?order_id=${order.id}`,
        failure: `${siteUrl}/checkout?error=payment`,
        pending: `${siteUrl}/confirmacao?order_id=${order.id}&pending=true`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      external_reference: order.id,
      payer: { email: user.email ?? '' },
    },
  });

  if (!response.init_point) throw new Error('No init_point from Mercado Pago');
  return { initPoint: response.init_point, orderId: order.id };
}
