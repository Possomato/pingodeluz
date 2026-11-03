import CheckoutClient from '@/components/CheckoutClient';
import { getAddressesAction } from '@/app/actions/addresses';
import { getMyProfile } from '@/app/actions/auth-user';

export const metadata = { title: 'Finalizar compra' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // O proxy já garantiu que existe sessão nesta rota.
  const [addresses, profile] = await Promise.all([getAddressesAction(), getMyProfile()]);

  return <CheckoutClient
      savedAddresses={addresses}
      profile={profile}
      paymentFailed={error === 'pagamento'}
    />;
}
