import PageWrapper from "@/components/PageWrapper";
export const metadata = {
  title: 'Termos de uso',
  description: 'Condições para comprar na Pingo de Luz: conta, pagamento, entrega e trocas.',
};

export default function TermosPage() {
  return (
    <PageWrapper>
      <article className="pdl-page">
        <h1 className="pdl-h1 pdl-page-head">Termos de <em>uso</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — revise com apoio jurídico antes de publicar. */}
        <section className="pdl-prose">
          <h2>
            Quem somos
          </h2>
          <p>
            A Pingo de Luz vende roupas infantis pelo site pingodeluz.com. Ao criar uma conta ou fazer um pedido, você concorda com estes termos.
          </p>

          <h2>
            Conta e acesso
          </h2>
          <p>
            O acesso é feito por e-mail (código de verificação) ou por conta Google. Você é responsável por manter o acesso ao seu e-mail e pelas informações que fornece, como o endereço de entrega.
          </p>

          <h2>
            Preços e pagamento
          </h2>
          <p>
            Os preços são em reais e já definidos no momento da compra; o valor final, com frete e descontos, é exibido antes da finalização. O pagamento é processado pelo Mercado Pago por Pix ou cartão. O pedido é confirmado após a aprovação do pagamento.
          </p>

          <h2>
            Estoque e disponibilidade
          </h2>
          <p>
            Os pedidos dependem de disponibilidade em estoque. Se uma peça se esgotar antes da confirmação do pagamento, entraremos em contato para oferecer troca por outra peça ou o reembolso integral.
          </p>

          <h2>
            Entrega, trocas e arrependimento
          </h2>
          <p>
            Prazos, frete, trocas e devoluções estão descritos na página Envio e trocas. O direito de arrependimento de 7 dias, previsto no Código de Defesa do Consumidor, é garantido nas compras feitas pela internet.
          </p>

          <h2>
            Privacidade
          </h2>
          <p>
            O tratamento dos seus dados pessoais está descrito na Política de privacidade.
          </p>

          <h2>
            Contato
          </h2>
          <p>
            Dúvidas sobre estes termos ou sobre um pedido: atendimento@pingodeluz.com.
          </p>
        </section>
      </article>
    </PageWrapper>
  );
}
