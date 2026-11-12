import PageWrapper from "@/components/PageWrapper";
import { fetchShippingConfig } from '@/lib/data';
import { formatCentavos } from '@/lib/money';

export const metadata = {
  title: 'Envio e trocas',
  description: 'Prazos de entrega, política de trocas e devoluções da Pingo de Luz.',
};

export default async function TrocasPage() {
  const shipping = await fetchShippingConfig();

  return (
    <PageWrapper>
      <article className="pdl-page">
        <h1 className="pdl-h1 pdl-page-head">Envio e <em>trocas</em></h1>

        <section className="pdl-prose">
          <h2>Frete</h2>
          <p>
            O frete custa {formatCentavos(shipping.flatCentavos)} e é por nossa conta
            em compras a partir de {formatCentavos(shipping.freeAboveCentavos)}.
          </p>
          <p>{shipping.shippingInfo}</p>

          <h2>Trocas</h2>
          {/* CONTEÚDO PENDENTE DA LOJA — revise os prazos e condições abaixo. */}
          <p>
            Você pode solicitar troca ou devolução em até 30 dias corridos a partir do
            recebimento, desde que a peça esteja sem uso e com a etiqueta original.
          </p>
          <p>
            Para iniciar, responda o e-mail de confirmação do seu pedido informando o
            número dele — nós cuidamos do resto.
          </p>

          <h2>
            Direito de arrependimento
          </h2>
          <p>
            Pelo Código de Defesa do Consumidor, compras feitas pela internet podem ser
            canceladas em até 7 dias corridos após o recebimento, com devolução integral
            do valor pago.
          </p>
        </section>
      </article>
    </PageWrapper>
  );
}
