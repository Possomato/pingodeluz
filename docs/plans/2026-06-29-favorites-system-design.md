# Favorites System Design

**Date:** 2026-06-29

## Overview
Implement a favorites system that allows logged-in users to mark products as favorites with a heart icon, view them in their profile, and get redirected to login if not authenticated.

## Structure

### Database Schema
**Table: `favorites`**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `product_id` (TEXT - product reference)
- `created_at` (TIMESTAMP)
- Index on `user_id` for fast lookups

**RLS Policies:**
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

## Components

### HeartButton Component
- Icon: empty or filled heart
- On click: checks authentication
- If not logged in → redirect to `/perfil`
- If logged in → toggle favorite (insert/delete)
- Optimistic UI updates
- Loading state during request

### Profile Page Changes
- Section "Meus favoritos" shows grid of favorited products
- Each card displays: image, name, heart button (filled), view product link
- Remove favorite via heart button click
- Empty state message if no favorites

### Product Pages/Cards
- Heart button integrated in product card/image area
- Shows current favorite status
- Disabled during request

## Data Flow

1. **GET /perfil** → `getFavoritesAction()` fetches all user favorites
2. **Click heart icon** → `toggleFavoriteAction(productId)`
   - If not authenticated → redirect to `/perfil`
   - If authenticated → insert/delete in DB
   - Optimistic UI update
3. **Remove from favorites** → delete via heart button or card action

## Files to Create/Modify

1. `src/app/actions/favorites.ts` - Server actions
2. `src/components/HeartButton.tsx` - Reusable heart button
3. `src/lib/favorites.ts` - Helper functions
4. `src/app/perfil/page.tsx` - Add favorites section
5. Product components - Add heart button

## Server Actions

- `getFavoritesAction()` - Get all favorited products for user
- `toggleFavoriteAction(productId)` - Add or remove favorite
- `isFavoritedAction(productId)` - Check if product is favorited

## Success Criteria

- User can favorite/unfavorite products via heart icon
- Non-logged users are redirected to login
- Favorites persist in database with RLS
- Profile page displays all user favorites
- Fast performance with indexed queries
- Optimistic UI updates for good UX
