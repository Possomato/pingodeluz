export const metadata = {
  title: 'Privacidade',
  description: 'Como a Pingo de Luz trata os dados pessoais de quem compra na loja.',
};

export default function PrivacidadePage() {
  return (
    <div className="pdl-app">
      <article className="pdl-cart" style={{ paddingTop: 32, maxWidth: 640 }}>
        <h1 className="pdl-cart-title">Política de <em>privacidade</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — revise com apoio jurídico antes de publicar. */}
        <section style={{ marginTop: 24, fontFamily: 'var(--editorial)', fontSize: 15, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Que dados guardamos
          </h2>
          <p>
            Nome, e-mail e endereço de entrega, para processar e enviar seu pedido.
            Endereços salvos ficam vinculados à sua conta para agilizar compras futuras.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Dados de pagamento
          </h2>
          <p>
            Não coletamos nem armazenamos dados de cartão. O pagamento acontece
            inteiramente no ambiente do Mercado Pago; recebemos de volta apenas a
            confirmação e o meio utilizado.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Com quem compartilhamos
          </h2>
          <p>
            Com o provedor de pagamento, para cobrar; e com a transportadora, para
            entregar. Não vendemos seus dados nem os usamos para outra finalidade.
          </p>

          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', margin: '28px 0 8px' }}>
            Seus direitos
          </h2>
          <p>
            Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados a
            qualquer momento. Basta entrar em contato pelo e-mail da loja.
          </p>
        </section>
      </article>
    </div>
  );
}
