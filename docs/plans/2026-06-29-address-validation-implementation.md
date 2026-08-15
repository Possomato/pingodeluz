# Address Validation with CEP Lookup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement validated address management with automatic data population via CEP lookup using ViaCEP API.

**Architecture:** Create a Supabase `addresses` table with proper RLS, add CEP validation utility that calls ViaCEP API, integrate real-time validation into the address form with Portuguese labels, and disable save until CEP is valid.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS), React, ViaCEP API, TypeScript

---

## Task 1: Create Addresses Table in Supabase

**Files:**
- Create: Supabase SQL migration (manual execution)

**Step 1: Create the SQL migration**

Execute this SQL in Supabase SQL Editor (https://app.supabase.com/project/dgzmpmqmalsyhnmgvtpb/sql):

```sql
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  zip TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;

-- Create RLS policies
CREATE POLICY "Users can read own addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
```

**Step 2: Verify table was created**

Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'addresses' AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected: Shows all columns (id, user_id, label, zip, street, number, complement, neighborhood, city, state, created_at, updated_at)

**Step 3: Commit**

```bash
git add docs/plans/2026-06-29-address-validation-implementation.md
git commit -m "docs: add address validation implementation plan"
```

---

## Task 2: Update Address Interface with Number Field

**Files:**
- Modify: `src/app/actions/addresses.ts:6-15`

**Step 1: Update the Address interface**

Replace the current interface:

```typescript
export interface Address {
  id: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}
```

The interface already has `number`, so verify it's correct (it should have `number: string` after `street`).

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2 && npx tsc --noEmit 2>&1 | grep -E "error|Address" || echo "✅ No errors"
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/app/actions/addresses.ts
git commit -m "chore: verify Address interface includes number field"
```

---

## Task 3: Create CEP Validation Utility

**Files:**
- Create: `src/lib/cep.ts`

**Step 1: Create CEP utility file**

Create file `src/lib/cep.ts`:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2 && npx tsc --noEmit src/lib/cep.ts 2>&1 | grep -E "error" || echo "✅ No errors"
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/cep.ts
git commit -m "feat: create cep validation and viacep integration utility"
```

---

## Task 4: Update Address Form with Portuguese Labels and CEP Validation

**Files:**
- Modify: `src/app/perfil/page.tsx:1-30` (imports and state)
- Modify: `src/app/perfil/page.tsx:190-230` (form rendering)

**Step 1: Update imports**

Add at top of file after existing imports:

```typescript
import { formatCEP, isValidCEP, fetchCEPData, extractAddressFromCEP } from '@/lib/cep';
```

**Step 2: Update state to track CEP validation**

In the `PerfilContent` function, update state initialization to include:

```typescript
const [cepError, setCepError] = useState<string | null>(null);
const [cepLoading, setCepLoading] = useState(false);
const [validCEP, setValidCEP] = useState<string | null>(null);
```

**Step 3: Add CEP change handler**

Add this function in `PerfilContent`:

```typescript
const handleCEPChange = async (value: string) => {
  const formatted = formatCEP(value);
  setNewAddr(prev => ({ ...prev, zip: formatted }));
  setCepError(null);
  setValidCEP(null);

  if (!isValidCEP(formatted)) {
    if (formatted.length === 8 || (formatted.length === 9 && formatted.includes('-'))) {
      setCepError('CEP inválido');
    }
    return;
  }

  setCepLoading(true);
  const data = await fetchCEPData(formatted);
  setCepLoading(false);

  if (!data) {
    setCepError('CEP não encontrado');
    return;
  }

  const extracted = extractAddressFromCEP(data);
  setNewAddr(prev => ({
    ...prev,
    street: extracted.street,
    neighborhood: extracted.neighborhood,
    city: extracted.city,
    state: extracted.state,
  }));
  setValidCEP(formatted);
};
```

**Step 4: Update form field rendering**

Replace the form field map section (around line 208-225) with:

```typescript
{showAddrForm && (
  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {/* Label */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Rótulo</div>
      <input
        value={newAddr.label}
        onChange={e => setNewAddr(prev => ({ ...prev, label: e.target.value }))}
        placeholder="Casa, Trabalho, etc"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* CEP */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>CEP</div>
      <input
        value={newAddr.zip}
        onChange={e => handleCEPChange(e.target.value)}
        onBlur={() => {
          if (newAddr.zip && !isValidCEP(newAddr.zip)) {
            setCepError('CEP inválido');
          }
        }}
        placeholder="00000-000"
        style={{
          width: '100%',
          padding: '8px 10px',
          border: `1px solid ${cepError ? 'red' : 'var(--border)'}`,
          borderRadius: 6,
          fontSize: 13,
          fontFamily: 'var(--sans)',
        }}
      />
      {cepLoading && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Buscando...</div>}
      {cepError && <div style={{ fontSize: 12, color: 'red', marginTop: 4 }}>{cepError}</div>}
    </div>

    {/* Logradouro */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Logradouro</div>
      <input
        value={newAddr.street}
        onChange={e => setNewAddr(prev => ({ ...prev, street: e.target.value }))}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Número */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Número</div>
      <input
        value={newAddr.number}
        onChange={e => setNewAddr(prev => ({ ...prev, number: e.target.value }))}
        placeholder="Ex: 123"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Complemento */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Complemento (opcional)</div>
      <input
        value={newAddr.complement}
        onChange={e => setNewAddr(prev => ({ ...prev, complement: e.target.value }))}
        placeholder="Apto, Sala, etc"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Bairro */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Bairro</div>
      <input
        value={newAddr.neighborhood}
        onChange={e => setNewAddr(prev => ({ ...prev, neighborhood: e.target.value }))}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Cidade */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Cidade</div>
      <input
        value={newAddr.city}
        onChange={e => setNewAddr(prev => ({ ...prev, city: e.target.value }))}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Estado */}
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Estado (sigla)</div>
      <input
        value={newAddr.state}
        onChange={e => setNewAddr(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
        placeholder="SP"
        maxLength={2}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
      />
    </div>

    {/* Buttons */}
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      <button
        onClick={async () => {
          if (!validCEP || cepError) {
            setCepError('CEP inválido');
            return;
          }
          await saveAddressAction(newAddr);
          const updated = await getAddressesAction();
          setAddresses(updated);
          setShowAddrForm(false);
          setNewAddr({ label: 'Casa', zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
          setCepError(null);
          setValidCEP(null);
        }}
        disabled={!validCEP || !!cepError}
        style={{
          padding: '10px 16px',
          background: !validCEP || cepError ? '#ccc' : 'var(--ink)',
          color: '#fff',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--sans)',
          border: 'none',
          cursor: !validCEP || cepError ? 'not-allowed' : 'pointer',
        }}>
        Salvar endereço
      </button>
      <button
        onClick={() => {
          setShowAddrForm(false);
          setCepError(null);
          setValidCEP(null);
        }}
        style={{ padding: '10px 16px', background: 'none', color: 'var(--muted)', borderRadius: 999, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
        Cancelar
      </button>
    </div>
  </div>
)}
```

**Step 5: Test in browser**

1. Go to `http://localhost:3000/perfil`
2. Log in with Google
3. Click "+ adicionar endereço"
4. Type a valid CEP (e.g., "01310100" for Avenida Paulista)
5. Verify fields auto-fill
6. Type invalid CEP and verify error shows
7. Verify Save button is disabled until CEP is valid

Expected: Form works with Portuguese labels, auto-fills from ViaCEP, shows errors

**Step 6: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "feat: implement cep validation with viacep auto-fill and portuguese labels"
```

---

## Task 5: Update Address Display with Portuguese Labels

**Files:**
- Modify: `src/app/perfil/page.tsx:167-187` (address display)

**Step 1: Update the address display section**

Replace the address display mapping with Portuguese labels:

```typescript
{addresses.map(a => (
  <div key={a.id} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--cream-warm)', borderRadius: 6 }}>
    <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.05 }}>{a.label}</div>
    <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
      {a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ''}<br />
      {a.neighborhood} · {a.city}/{a.state} · {a.zip}
    </div>
    <button
      onClick={async () => {
        await deleteAddressAction(a.id);
        setAddresses(prev => prev.filter(x => x.id !== a.id));
      }}
      style={{ marginTop: 6, fontSize: 11, color: 'var(--terra)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
      remover
    </button>
  </div>
))}
```

**Step 2: Test address display**

1. After saving an address, verify it displays with number in format: "Rua, 123 - Apto 101"
2. Verify the layout looks good

Expected: Address displays with number properly formatted

**Step 3: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "style: update address display format to include number field"
```

---

## Verification Checklist

- [ ] Supabase `addresses` table created with all fields
- [ ] RLS policies configured
- [ ] Address interface updated with `number` field
- [ ] CEP validation utility works
- [ ] ViaCEP API integration works
- [ ] Form has Portuguese labels
- [ ] CEP auto-fills street, neighborhood, city, state
- [ ] Invalid CEP shows error message
- [ ] Save button disabled when CEP invalid
- [ ] Address displays with number field
- [ ] No TypeScript errors
- [ ] All tests pass

---

## Testing the Full Flow

1. Navigate to `/perfil` (logged in)
2. Click "+ adicionar endereço"
3. Type "01310100" in CEP field
4. Verify auto-fill (Avenida Paulista, Centro, São Paulo, SP)
5. Fill in Número (e.g., "1000")
6. Fill in optional Complemento
7. Click "Salvar endereço"
8. Verify address appears in list with all fields
9. Test invalid CEP shows error
10. Test Save button is disabled with invalid CEP
