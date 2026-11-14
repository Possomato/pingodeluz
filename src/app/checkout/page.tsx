import CheckoutClient from '@/components/CheckoutClient';
import { getAddressesAction } from '@/app/actions/addresses';
import { getMyProfile } from '@/app/actions/auth-user';
import { fetchPaymentConfig } from '@/lib/data';

export const metadata = { title: 'Finalizar compra' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // O proxy já garantiu que existe sessão nesta rota.
  const [addresses, profile, paymentConfig] = await Promise.all([
    getAddressesAction(),
    getMyProfile(),
    fetchPaymentConfig(),
  ]);

  return <CheckoutClient
      savedAddresses={addresses}
      profile={profile}
      maxInstallments={paymentConfig.maxParcelas}
      paymentFailed={error === 'pagamento'}
    />;
}
