'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChevronDown } from '@/components/Icons';

const PAYMENT_LOGOS = ['Pix', 'Visa', 'Mastercard', 'Elo', 'Hipercard'];

// Dados legais da loja vêm do ambiente: sem eles o rodapé mostra só a marca,
// em vez de um CNPJ fictício (ver ADR-6). Obrigatório divulgar razão social
// e CNPJ para vender online (Decreto 7.962/2013) — preencher antes de abrir.
const LEGAL_NAME = process.env.NEXT_PUBLIC_STORE_LEGAL_NAME;
const CNPJ = process.env.NEXT_PUBLIC_STORE_CNPJ;

type FooterCol = { title: string; links: { label: string; href: string }[] };

// Só links que levam a algum lugar. As coleções não estão aqui porque
// mudam — elas aparecem na home.
const COLS: FooterCol[] = [
  {
    title: 'Navegação',
    links: [
      { label: 'Meninas', href: '/genero/meninas' },
      { label: 'Meninos', href: '/genero/meninos' },
      { label: 'Coleções', href: '/#colecoes' },
      { label: 'Minha conta', href: '/perfil' },
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
      { label: '@pingodeluz', href: 'https://instagram.com/pingodeluz' },
    ],
  },
];

function FootLink({ href, label }: { href: string; label: string }) {
  const external = href.startsWith('http') || href.startsWith('mailto:');
  return external
    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{label}</a>
    : <Link href={href}>{label}</Link>;
}

export default function PdlFooter() {
  const [openCol, setOpenCol] = useState<string | null>(null);

  const toggle = (title: string) => setOpenCol(openCol === title ? null : title);

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

      {/* Desktop: colunas lado a lado */}
      <div className="pdl-foot-links">
        {COLS.map(col => (
          <div key={col.title} className="pdl-foot-col">
            <h4>{col.title}</h4>
            <ul>
              {col.links.map(link => (
                <li key={link.label}><FootLink {...link} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Mobile: colunas como acordeões */}
      <div className="pdl-foot-accordions">
        {COLS.map(col => (
          <div key={col.title} className="pdl-foot-acc">
            <button type="button" className="pdl-foot-acc-head" onClick={() => toggle(col.title)} aria-expanded={openCol === col.title}>
              <span>{col.title}</span>
              <IconChevronDown size={13} />
            </button>
            {openCol === col.title && (
              <ul className="pdl-foot-acc-body">
                {col.links.map(link => (
                  <li key={link.label}><FootLink {...link} /></li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

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
