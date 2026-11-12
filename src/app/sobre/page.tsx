import PageWrapper from "@/components/PageWrapper";
export const metadata = {
  title: 'Sobre',
  description: 'A história e o jeito de fazer da Pingo de Luz.',
};

export default function SobrePage() {
  return (
    <PageWrapper>
      <article className="pdl-page">
        <h1 className="pdl-h1 pdl-page-head">Sobre a <em>Pingo de Luz</em></h1>

        {/* CONTEÚDO PENDENTE DA LOJA — substitua pelo texto da marca. */}
        <section className="pdl-prose">
          <p>
            Roupas feitas com carinho para os pequenos pingos que iluminam a casa.
          </p>
          <p>
            Esta página ainda está esperando o texto da loja. Enquanto isso, a estrutura
            está pronta: é só substituir este trecho pela história da marca.
          </p>
        </section>
      </article>
    </PageWrapper>
  );
}
