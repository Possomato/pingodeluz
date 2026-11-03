export const metadata = {
  title: 'Termos de uso',
  description: 'Condições para comprar na Pingo de Luz: conta, pagamento, entrega e trocas.',
};

export default function TermosPage() {
  return (
    <div className="pdl-app">
      <article className="pdl-cart" style={{ paddingTop: 32, maxWidth: 640 }}>
        <h1 className="pdl-cart-title">Termos de <em>uso</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — revise com apoio jurídico antes de publicar. */}
        <section style={{ marginTop: 24, fontFamily: 'var(--editorial)', fontSize: 15, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Quem somos
          </h2>
          <p>
            A Pingo de Luz vende roupas infantis pelo site pingodeluz.com. Ao criar uma conta ou fazer um pedido, você concorda com estes termos.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Conta e acesso
          </h2>
          <p>
            O acesso é feito por e-mail (código de verificação) ou por conta Google. Você é responsável por manter o acesso ao seu e-mail e pelas informações que fornece, como o endereço de entrega.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Preços e pagamento
          </h2>
          <p>
            Os preços são em reais e já definidos no momento da compra; o valor final, com frete e descontos, é exibido antes da finalização. O pagamento é processado pelo Mercado Pago por Pix, cartão ou boleto. O pedido é confirmado após a aprovação do pagamento.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Estoque e disponibilidade
          </h2>
          <p>
            Os pedidos dependem de disponibilidade em estoque. Se uma peça se esgotar antes da confirmação do pagamento, entraremos em contato para oferecer troca por outra peça ou o reembolso integral.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Entrega, trocas e arrependimento
          </h2>
          <p>
            Prazos, frete, trocas e devoluções estão descritos na página Envio e trocas. O direito de arrependimento de 7 dias, previsto no Código de Defesa do Consumidor, é garantido nas compras feitas pela internet.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Privacidade
          </h2>
          <p>
            O tratamento dos seus dados pessoais está descrito na Política de privacidade.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Contato
          </h2>
          <p>
            Dúvidas sobre estes termos ou sobre um pedido: atendimento@pingodeluz.com.
          </p>
        </section>
      </article>
    </div>
  );
}
