export const metadata = {
  title: 'Painel · Pingo de Luz',
  // O painel nunca deve aparecer em buscador.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
