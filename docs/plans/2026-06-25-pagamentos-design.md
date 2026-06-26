# Design: Configuração Global de Pagamentos

**Data:** 2026-06-25
**Status:** validado

## Contexto

O campo `installments` era texto livre por produto ("em 3x de R$ 63 sem juros"). A proposta substitui isso por uma configuração global de parcelamento, com cálculo automático baseado no preço de cada produto.

## Modelo de dados

### PaymentConfig

```ts
interface PaymentConfig {
  maxParcelas: number;       // ex: 3
  parcelaMinima: number;     // ex: 50  (em reais, sem centavos)
  juros: 'sem' | number;     // 'sem' = sem juros; number = % ao mês
}
```

Supabase: tabela `payment_config` com uma única linha (`id = 'default'`).
Fallback local: `localStorage['pdl_payment_config']`.
Padrão: `{ maxParcelas: 3, parcelaMinima: 50, juros: 'sem' }`.

### Product — mudanças

- Remove: `installments?: string`
- O campo ainda existe no tipo para retrocompatibilidade, mas não é exibido nem configurado no admin

## Lógica de cálculo

Função pura `calcInstallments(price: string, config: PaymentConfig): string | null`:

1. Extrai o valor numérico de `price` (ex: "R$ 189" → 189)
2. Para `n` de `maxParcelas` até `2`:
   - Calcula `valorParcela = preco / n`
   - Se `valorParcela >= parcelaMinima`, retorna o texto formatado
3. Se nenhuma parcela passa do mínimo, retorna `null` (não exibe)

Com juros futuros: `valorParcela = preco * juros^n / (juros^n - 1)` onde `juros = 1 + taxa/100`.

### Exemplos (max 3x, mínimo R$50, sem juros)

| Preço | Resultado |
|-------|-----------|
| R$ 189 | "em 3x de R$ 63 sem juros" |
| R$ 120 | "em 2x de R$ 60 sem juros" |
| R$ 89  | null (89/2 = 44,50 < 50) |
| R$ 50  | null (só 1x, não exibe) |

## Admin: `/admin/pagamentos`

### Interface

Formulário simples com 3 campos:
- **Máximo de parcelas** — número (1–12)
- **Parcela mínima** — valor em R$ (ex: 50)
- **Juros** — select: "Sem juros" ou "Com juros (% ao mês)" com input numérico

**Preview ao vivo:** abaixo dos campos, mostra como ficaria para 3 preços de exemplo (R$ 89, R$ 159, R$ 250) com a configuração atual — atualiza em tempo real enquanto o admin digita.

### Navegação

Link "Pagamentos" no nav do admin (`/admin/pagamentos`), entre "Tabelas" e o botão Sair.

## Produto para o cliente — sem mudança visual

- `ProdutoClient` passa a chamar `calcInstallments(p.price, paymentConfig)` em vez de usar `p.installments`
- `paymentConfig` é buscado server-side em `ProdutoPage` via `fetchPaymentConfig()`
- Se `calcInstallments` retornar `null`, a linha de parcelamento não aparece
- Apresentação visual idêntica ao atual

## Fluxo de dados

```
ProdutoPage (Server Component)
  ├── fetchProductById(id) → Product
  ├── fetchSizeTableById(product.sizeTableId) → SizeTable
  ├── fetchPaymentConfig() → PaymentConfig
  └── <ProdutoClient product={p} sizeTable={st} paymentConfig={pc} />
```

## O que NÃO muda

- Carrinho, checkout, perfil
- Estrutura visual da página de produto
- Todas as outras seções do admin
