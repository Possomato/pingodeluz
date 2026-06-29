export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export function formatCEP(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
}

export function isValidCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 && cleaned !== '00000000';
}

export async function fetchCEPData(cep: string): Promise<ViaCEPResponse | null> {
  try {
    const cleaned = cep.replace(/\D/g, '');
    if (!isValidCEP(cep)) return null;

    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json() as ViaCEPResponse;
    if (data.erro) return null;

    return data;
  } catch (error) {
    console.error('CEP fetch error:', error);
    return null;
  }
}

export function extractAddressFromCEP(data: ViaCEPResponse) {
  return {
    street: data.logradouro,
    neighborhood: data.bairro,
    city: data.localidade,
    state: data.uf,
  };
}
