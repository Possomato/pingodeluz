# Homepage Sections Admin — Design

## Objetivo

Permitir ao admin ocultar/mostrar cada seção da homepage e definir fotos dos cards de gênero e instagram, via uma página dedicada `/admin/homepage` no painel.

## Seções configuráveis

| id slug       | Seção                  | Toggle | Fotos         |
|---------------|------------------------|--------|---------------|
| `meninas`     | Card de gênero Meninas | sim    | 1 upload      |
| `meninos`     | Card de gênero Meninos | sim    | 1 upload      |
| `queridos`    | Mais queridos          | sim    | —             |
| `manifesto`   | Nosso manifesto        | sim    | —             |
| `colecoes`    | Coleções conceituais   | sim    | —             |
| `fases`       | Para cada fase         | sim    | —             |
| `depoimentos` | O que dizem as mães    | sim    | —             |
| `instagram`   | No instagram           | sim    | 6 uploads     |

## Banco de dados

```sql
create table homepage_config (
  id text primary key,
  visible boolean default true,
  image_urls text[] default '{}',
  updated_at timestamptz default now()
);
```

Seed inicial com todas as seções visíveis e `image_urls = '{}'`.

## Arquitetura

### `lib/data.ts`
- Nova interface `HomepageSection { id, visible, imageUrls }`
- `DEFAULT_HOMEPAGE_CONFIG` — todas visíveis, sem fotos
- `fetchHomepageConfig()` — busca do Supabase, fallback para defaults

### `app/actions/admin.ts`
- `upsertHomepageSectionAction(section)` — upsert na tabela `homepage_config`

### `context/AdminContext.tsx`
- Novo estado `homepageConfig: Record<string, HomepageSection>`
- `updateHomepageSection(id, patch)` — optimistic update + server action

### `app/admin/homepage/page.tsx`
Nova página admin com lista de blocos:
- Toggle liga/desliga — salva imediatamente
- Botão de foto abre modal de upload inline (reutiliza lógica de `upload.ts`)
- Ordem fixa conforme tabela acima

### `app/page.tsx`
- Chama `fetchHomepageConfig()` no `useEffect` (junto com `fetchCatalog`)
- Cada seção renderiza condicionalmente: `{config.meninas.visible && <div ...>}`
- Cards de gênero usam `imageUrls[0]` quando disponível: `<PdlImg imageUrl={...} />`
- Seção instagram usa `.map()` sobre `config.instagram.imageUrls` (fallback: 6 tints fixos)

## Fluxo de dados

```
Admin altera toggle/foto
  → updateHomepageSection() optimistic
  → upsertHomepageSectionAction() persiste Supabase
  → homepage lê fetchHomepageConfig() no próximo load
```

## UI da página /admin/homepage

```
┌─────────────────────────────────────────┐
│  Homepage                               │
├─────────────────────────────────────────┤
│  Meninas          [trocar foto] [●] on  │
│  Meninos          [trocar foto] [●] on  │
│  Mais queridos                  [●] on  │
│  Nosso manifesto                [○] off │
│  Coleções                       [●] on  │
│  Para cada fase                 [●] on  │
│  Depoimentos                    [●] on  │
│  Instagram       [6 fotos]      [●] on  │
└─────────────────────────────────────────┘
```

Toggle salva imediatamente. Upload de foto reutiliza Supabase Storage (mesmo bucket `product-images`).
