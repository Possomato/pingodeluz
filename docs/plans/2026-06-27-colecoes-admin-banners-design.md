# Coleções — Admin criar/excluir + Banners na homepage

**Data:** 2026-06-27

---

## Arquivos alterados

- `src/app/actions/admin.ts` — `deleteCollectionAction`
- `src/context/AdminContext.tsx` — `addCollection`, `deleteCollection`
- `src/app/admin/colecoes/page.tsx` — botão nova + excluir por linha
- `src/app/admin/colecoes/[id]/page.tsx` — botão excluir na edição
- `src/app/page.tsx` — buscar e passar `collections` como prop
- `src/components/HomeClient.tsx` — coleções dinâmicas via map
- `src/app/globals.css` — `aspect-ratio: 7/9` → `4/2`

---

## 1. deleteCollectionAction

```ts
export async function deleteCollectionAction(id: string) {
  const supabase = createServiceClient();
  await supabase.from('collections').delete().eq('id', id);
  revalidatePath('/');
}
```

## 2. AdminContext

`addCollection(name: [string, string])`:
- Gera slug: `name[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'-')`
- Cria Collection mínima com campos padrão
- Chama `upsertCollectionAction`

`deleteCollection(id: string)`:
- Remove do estado local (optimistic)
- Chama `deleteCollectionAction`

## 3. Admin /colecoes/page.tsx

- Botão "Nova coleção" no topo → campo inline com nome → slug gerado exibido abaixo → confirmar cria
- Botão "Excluir" por linha com `window.confirm`

## 4. Admin /colecoes/[id]/page.tsx

- Botão "Excluir coleção" no rodapé com `window.confirm`
- Após confirmar → redireciona para `/admin/colecoes`

## 5. Homepage — coleções dinâmicas

`page.tsx` adiciona `fetchCollections()` ao `Promise.all` e passa como prop.

`HomeClient` substitui cards hardcoded por `.map()` sobre `Object.values(collections)`.

## 6. Banner 4:2

`.pdl-col-card { aspect-ratio: 4/2 }` (era `7/9`).

Layout `.pdl-collections` já é coluna única — banners empilham naturalmente.
