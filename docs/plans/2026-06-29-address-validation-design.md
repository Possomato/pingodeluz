# Address Management with CEP Validation Design

**Date:** 2026-06-29

## Overview
Implement validated address management with automatic data population via CEP lookup using ViaCEP API.

## Structure

### Database Schema (Supabase `addresses` table)
```
id (UUID, PK)
user_id (UUID, FK → auth.users)
label (TEXT) - Casa, Trabalho, etc
zip (TEXT) - Format: XXXXX-XXX
street (TEXT) - Logradouro/Rua
number (TEXT) - Número do endereço
complement (TEXT, NULLABLE) - Apto, Sala, etc
neighborhood (TEXT) - Bairro
city (TEXT) - Cidade
state (TEXT) - Estado (sigla: SP, RJ, etc)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

RLS Policies:
- SELECT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id
- INSERT: auth.uid() = user_id
- DELETE: auth.uid() = user_id
```

## Validation Flow

### CEP Input Handling
1. **Format validation:** Remove special chars, check 8-digit format
2. **API call:** GET `https://viacep.com.br/ws/{cep}/json/`
3. **Success:** Auto-fill street, neighborhood, city, state
4. **Failure:** Show error message, disable Save button

### Required Fields
- Label ✓
- CEP ✓ (must be valid)
- Street ✓
- Number ✓
- Neighborhood ✓
- City ✓
- State ✓
- Complement ✗ (optional)

### UI Behavior
- Save button disabled while CEP is invalid/empty
- Error message shown for invalid CEP
- Form order: Label → CEP → Street → Number → Complement → Neighborhood → City → State

## Frontend Changes
- Translate field labels to Portuguese
- Add CEP input with real-time validation
- Add number field
- Integrate ViaCEP auto-fill on CEP blur/enter
- Update form validation logic

## Translation Map
- `zip` → "CEP"
- `street` → "Logradouro"
- `number` → "Número"
- `complement` → "Complemento"
- `neighborhood` → "Bairro"
- `city` → "Cidade"
- `state` → "Estado"
- `label` → "Rótulo"
