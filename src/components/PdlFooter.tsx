'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconChevronDown } from '@/components/Icons';

const PAYMENT_LOGOS = ['Pix', 'Visa', 'Mastercard', 'Elo', 'Hipercard'];

// Dados legais da loja vêm do ambiente: sem eles o rodapé mostra só a marca,
// em vez de um CNPJ fictício (ver ADR-6). Obrigatório divulgar razão social
// e CNPJ para vender online (Decreto 7.962/2013) — preencher antes de abrir.
const LEGAL_NAME = process.env.NEXT_PUBLIC_STORE_LEGAL_NAME;
const CNPJ = process.env.NEXT_PUBLIC_STORE_CNPJ;

type FooterCol = { title: string; links: { label: string; href?: string }[] };

// Só links que levam a algum lugar. Itens sem destino foram removidos:
// um rodapé cheio de rótulos que não clicam é pior do que um rodapé curto.
// As coleções não estão aqui porque mudam — elas aparecem na home.
const COLS: FooterCol[] = [
  {
    title: 'Navegação',
    links: [
      { label: 'Meninas', href: '/genero/meninas' },
      { label: 'Meninos', href: '/genero/meninos' },
      { label: 'Buscar', href: '/busca' },
    ],
  },
  {
    title: 'Institucional',
    links: [
      { label: 'Nossa história', href: '/sobre' },
      { label: 'Envio e trocas', href: '/trocas' },
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Termos de uso', href: '/termos' },
    ],
  },
  {
    title: 'Contato',
    links: [
      { label: 'atendimento@pingodeluz.com', href: 'mailto:atendimento@pingodeluz.com' },
    ],
  },
];

export default function PdlFooter() {
  const router = useRouter();
  const [openCol, setOpenCol] = useState<string | null>(null);

  const toggle = (title: string) => setOpenCol(openCol === title ? null : title);

  const handleLink = (href?: string) => {
    if (!href) return;
    // mailto: e tel: não passam pelo roteador do Next.
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      window.open(href, '_self');
      return;
    }
    router.push(href);
  };

  return (
    <footer className="pdl-footer">
      <div className="pdl-foot-logo">
        <img src="/logo-transparente.png" alt="Pingo de Luz" className="pdl-foot-logo-img" draggable={false} />
      </div>
      <div className="pdl-foot-sub">
        Roupas feitas com carinho<br />
        para os pequenos pingos<br />
        que iluminam a casa.
      </div>

      {/* Desktop: columns side by side */}
      <div className="pdl-foot-links">
        {COLS.map(col => (
          <div key={col.title} className="pdl-foot-col">
            <h4>{col.title}</h4>
            <ul>
              {col.links.map(link => (
                <li
                  key={link.label}
                  onClick={() => handleLink(link.href)}
                  style={link.href ? { cursor: 'pointer' } : undefined}
                >
                  {link.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Mobile: columns as accordions */}
      <div className="pdl-foot-accordions">
        {COLS.map(col => (
          <div key={col.title} className="pdl-foot-acc">
            <div className="pdl-foot-acc-head" onClick={() => toggle(col.title)}>
              <span>{col.title}</span>
              <IconChevronDown size={13} />
            </div>
            {openCol === col.title && (
              <ul className="pdl-foot-acc-body">
                {col.links.map(link => (
                  <li
                    key={link.label}
                    onClick={() => handleLink(link.href)}
                    style={link.href ? { cursor: 'pointer' } : undefined}
                  >
                    {link.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Payment logos */}
      <div className="pdl-foot-payment">
        {PAYMENT_LOGOS.map(name => (
          <span key={name} className="pdl-foot-payment-badge">{name}</span>
        ))}
      </div>

      <div className="pdl-foot-bottom">
        © {new Date().getFullYear()} {LEGAL_NAME ?? 'PINGO DE LUZ'}
        {CNPJ ? ` · CNPJ ${CNPJ}` : ''}
      </div>
    </footer>
  );
}
