import { createServiceClient } from '@/lib/supabase';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { createHmac } from 'crypto';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

function validateSignature(request: Request, body: string): boolean {
  const xSignature = request.headers.get('x-signature') ?? '';
  const xRequestId = request.headers.get('x-request-id') ?? '';
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id') ?? '';

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.replace('ts=', '') ?? '';
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.replace('v1=', '') ?? '';

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex');

  return expected === v1;
}

export async function POST(request: Request) {
  const body = await request.text();

  if (!validateSignature(request, body)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let data: { type?: string; data?: { id?: string } };
  try {
    data = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (data.type === 'payment' && data.data?.id) {
    try {
      const payment = new Payment(mp);
      const paymentData = await payment.get({ id: String(data.data.id) });

      const status =
        paymentData.status === 'approved' ? 'pago' :
        paymentData.status === 'rejected' ? 'recusado' :
        'pendente';

      const supabase = createServiceClient();
      await supabase
        .from('orders')
        .update({
          status,
          mp_payment_id: String(paymentData.id),
          mp_payment_method: paymentData.payment_method_id ?? null,
        })
        .eq('id', paymentData.external_reference);
    } catch (err) {
      console.error('Webhook processing error:', err);
      return new Response('Error processing payment', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
}
