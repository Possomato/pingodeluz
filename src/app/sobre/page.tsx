export const metadata = {
  title: 'Sobre',
  description: 'A história e o jeito de fazer da Pingo de Luz.',
};

export default function SobrePage() {
  return (
    <div className="pdl-app">
      <article className="pdl-cart" style={{ paddingTop: 32, maxWidth: 640 }}>
        <h1 className="pdl-cart-title">Sobre a <em>Pingo de Luz</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — substitua pelo texto da marca. */}
        <section style={{ marginTop: 24, fontFamily: 'var(--editorial)', fontSize: 15, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
          <p>
            Roupas feitas com carinho para os pequenos pingos que iluminam a casa.
          </p>
          <p style={{ marginTop: 16 }}>
            Esta página ainda está esperando o texto da loja. Enquanto isso, a estrutura
            está pronta: é só substituir este trecho pela história da marca.
          </p>
        </section>
      </article>
    </div>
  );
}
