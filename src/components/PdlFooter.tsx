'use client';

import { useRouter } from 'next/navigation';

export default function PdlFooter() {
  const router = useRouter();

  return (
    <div className="pdl-footer">
      <div className="pdl-foot-logo">
        <img src="/logo-transparente.png" alt="Pingo de Luz" className="pdl-foot-logo-img" draggable={false} />
      </div>
      <div className="pdl-foot-sub">
        Roupas feitas com carinho<br />
        para os pequenos pingos<br />
        que iluminam a casa.
      </div>
      <div className="pdl-foot-links">
        <div className="pdl-foot-col">
          <h4>Coleções</h4>
          <ul>
            <li onClick={() => router.push('/colecao/jardim')}>Jardim Encantado</li>
            <li onClick={() => router.push('/colecao/doce')}>Doce Aventura</li>
            <li>Arquivo</li>
          </ul>
        </div>
        <div className="pdl-foot-col">
          <h4>Loja</h4>
          <ul>
            <li onClick={() => router.push('/genero/meninas')}>Meninas</li>
            <li onClick={() => router.push('/genero/meninos')}>Meninos</li>
          </ul>
        </div>
        <div className="pdl-foot-col">
          <h4>Ajuda</h4>
          <ul>
            <li>Trocas e devoluções</li>
            <li>Tamanhos</li>
            <li>Contato</li>
          </ul>
        </div>
        <div className="pdl-foot-col">
          <h4>Encontre</h4>
          <ul>
            <li>Instagram</li>
            <li>Newsletter</li>
          </ul>
        </div>
      </div>
      <div className="pdl-foot-bottom">
        © 2026 PINGO DE LUZ · CNPJ 00.000.000/0001-00
      </div>
    </div>
  );
}
