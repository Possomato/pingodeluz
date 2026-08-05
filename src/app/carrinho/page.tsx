import CarrinhoClient from '@/components/CarrinhoClient';
import { fetchShippingConfig, fetchPaymentConfig } from '@/lib/data';

export const metadata = { title: 'Sua sacola' };

export default async function CarrinhoPage() {
  const [shipping, payment] = await Promise.all([
    fetchShippingConfig(),
    fetchPaymentConfig(),
  ]);

  return <CarrinhoClient shipping={shipping} payment={payment} />;
}
