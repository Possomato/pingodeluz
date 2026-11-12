import PageWrapper from "@/components/PageWrapper";
export const metadata = {
  title: 'Privacidade',
  description: 'Como a Pingo de Luz trata os dados pessoais de quem compra na loja.',
};

export default function PrivacidadePage() {
  return (
    <PageWrapper>
      <article className="pdl-page">
        <h1 className="pdl-h1 pdl-page-head">Política de <em>privacidade</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — revise com apoio jurídico antes de publicar. */}
        <section className="pdl-prose">
          <h2>
            Que dados guardamos
          </h2>
          <p>
            Nome, e-mail e endereço de entrega, para processar e enviar seu pedido.
            Endereços salvos ficam vinculados à sua conta para agilizar compras futuras.
          </p>

          <h2>
            Dados de pagamento
          </h2>
          <p>
            Não coletamos nem armazenamos dados de cartão. O pagamento acontece
            inteiramente no ambiente do Mercado Pago; recebemos de volta apenas a
            confirmação e o meio utilizado.
          </p>

          <h2>
            Com quem compartilhamos
          </h2>
          <p>
            Com o provedor de pagamento, para cobrar; e com a transportadora, para
            entregar. Não vendemos seus dados nem os usamos para outra finalidade.
          </p>

          <h2>
            Seus direitos
          </h2>
          <p>
            Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados a
            qualquer momento. Basta entrar em contato pelo e-mail da loja.
          </p>
        </section>
      </article>
    </PageWrapper>
  );
}
