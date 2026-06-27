'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconChevronDown } from '@/components/Icons';

const PAYMENT_LOGOS = ['Pix', 'Visa', 'Mastercard', 'Elo', 'Hipercard'];

type FooterCol = { title: string; links: { label: string; href?: string }[] };

const COLS: FooterCol[] = [
  {
    title: 'Navegação',
    links: [
      { label: 'Meninas', href: '/genero/meninas' },
      { label: 'Meninos', href: '/genero/meninos' },
      { label: 'Jardim Encantado', href: '/colecao/jardim' },
      { label: 'Doce Aventura', href: '/colecao/doce' },
      { label: 'Arquivo' },
    ],
  },
  {
    title: 'Institucional',
    links: [
      { label: 'Nossa história' },
      { label: 'Como fazemos' },
      { label: 'Guia de tamanhos' },
      { label: 'Trocas e devoluções' },
    ],
  },
  {
    title: 'Contato',
    links: [
      { label: 'atendimento@pingodelu.com.br' },
      { label: 'WhatsApp' },
      { label: '@pingodelu' },
    ],
  },
];

export default function PdlFooter() {
  const router = useRouter();
  const [openCol, setOpenCol] = useState<string | null>(null);

  const toggle = (title: string) => setOpenCol(openCol === title ? null : title);

  const handleLink = (href?: string) => {
    if (href) router.push(href);
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
        © 2026 PINGO DE LUZ · CNPJ 00.000.000/0001-00
      </div>
    </footer>
  );
}
