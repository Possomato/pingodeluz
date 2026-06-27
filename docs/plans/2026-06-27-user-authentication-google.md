# User Authentication with Google OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable Google OAuth login and create user profiles so customers can sign up, log in, and manage their account data.

**Architecture:** Use Supabase Authentication (Google OAuth provider) for sign-in, store user metadata in `auth.users` via user_metadata, and create a `profiles` table for additional user data (name, addresses, preferences). Session persists via Supabase cookie in browser; Next.js middleware protects routes.

**Tech Stack:** Next.js 16, Supabase Auth (OAuth 2.0 + Google), React, TypeScript

---

## Task 1: Verify Supabase Google OAuth Configuration

**Files:**
- Check: `.env.local` (should have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Verify: Supabase project settings for Google OAuth provider

**Step 1: Verify environment variables exist**

Run:
```bash
grep "NEXT_PUBLIC_SUPABASE" /Users/Shared/projetos/pingo-de-luz-v2/.env.local
```

Expected: Output showing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

**Step 2: Check if Google OAuth is enabled in Supabase**

Go to your Supabase dashboard → Authentication → Providers → Google

If not enabled:
- Click "Enable Google"
- Add Google OAuth credentials (Client ID and Secret from Google Cloud Console)
- Set redirect URL: `https://yourdomain.com/auth/callback`

For local dev, use: `http://localhost:3000/auth/callback`

**Step 3: Verify auth callback route exists**

Run:
```bash
ls -la /Users/Shared/projetos/pingo-de-luz-v2/src/app/auth/callback/
```

Expected: Should see `route.ts` file

**Step 4: Test Supabase connection**

Run:
```bash
node -e "
const { createBrowserClient } = require('@supabase/ssr');
const client = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
console.log('✅ Supabase client initialized');
"
```

Expected: "✅ Supabase client initialized"

**Step 5: Commit**

```bash
git add .env.local
git commit -m "chore: verify supabase google oauth configuration"
```

---

## Task 2: Create User Profiles Table in Supabase

**Files:**
- Create: Migration file (Supabase SQL Editor)
- Update: `.env.local` with service role key (if needed)

**Step 1: Access Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New Query

**Step 2: Create profiles table**

Paste this SQL:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow new users to insert their profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

**Step 3: Run the migration**

Click "Run" button in Supabase SQL Editor

Expected: Confirmation message "✓ Successful"

**Step 4: Verify table created**

Run query:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';
```

Expected: Should return one row with profiles table

**Step 5: Commit**

```bash
git add .env.local
git commit -m "feat: create profiles table for user metadata storage"
```

---

## Task 3: Create Auth Helper Functions

**Files:**
- Create: `src/lib/auth.ts`

**Step 1: Create auth utility file**

Create file `src/lib/auth.ts`:

```typescript
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Client-side Supabase client
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server-side Supabase client (for middleware/server actions)
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies can fail in middleware - that's ok
          }
        },
      },
    }
  );
};

// Get current user
export const getCurrentUser = async () => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
};

// Sign out user
export const signOutUser = async () => {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
};
```

**Step 2: Verify imports work**

Run:
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2 && npx tsc --noEmit src/lib/auth.ts 2>&1 | head -20
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: create auth helper functions for client/server"
```

---

## Task 4: Update Login Page to Handle Post-Login Redirect

**Files:**
- Modify: `src/app/perfil/page.tsx:54-64` (handleGoogle function)

**Step 1: Update handleGoogle function**

In `src/app/perfil/page.tsx`, replace the `handleGoogle` function:

```typescript
const handleGoogle = async () => {
  setSigningIn(true);
  const redirect = searchParams.get('redirect') ?? '/perfil';
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
    
    if (error) {
      console.error('Sign in error:', error);
      setSigningIn(false);
    }
    // Page will redirect; no need to setSigningIn(false)
  } catch (err) {
    console.error('Unexpected error:', err);
    setSigningIn(false);
  }
};
```

**Step 2: Test locally**

Visit: `http://localhost:3000/perfil`

Click "Entrar com Google" button → should redirect to Google login

Expected: Google login page appears

**Step 3: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "feat: wire up google oauth signin flow"
```

---

## Task 5: Create User Profile on First Login

**Files:**
- Create: `src/app/actions/auth.ts`

**Step 1: Create auth actions file**

Create file `src/app/actions/auth.ts`:

```typescript
'use server';

import { createServerSupabaseClient } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function handleAuthCallback(searchParams: Record<string, string>) {
  const code = searchParams.code;
  const next = searchParams.next ?? '/perfil';

  if (code) {
    const supabase = await createServerSupabaseClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // Create profile if doesn't exist
      if (!profile) {
        const fullName = data.user.user_metadata?.full_name || 'User';
        const avatarUrl = data.user.user_metadata?.avatar_url || null;

        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
        });
      }
    }
  }

  redirect(next);
}
```

**Step 2: Update auth callback route**

Update `src/app/auth/callback/route.ts`:

```typescript
import { handleAuthCallback } from '@/app/actions/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  
  try {
    await handleAuthCallback(searchParams);
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/perfil?error=auth_failed', request.url));
  }

  return NextResponse.next();
}
```

**Step 3: Test auth flow**

Visit: `http://localhost:3000/perfil`

Click "Entrar com Google" → complete Google login → should create profile and redirect to `/perfil`

Expected: Profile page loads with user data

**Step 4: Commit**

```bash
git add src/app/actions/auth.ts src/app/auth/callback/route.ts
git commit -m "feat: auto-create user profile on first google login"
```

---

## Task 6: Create Signup/Registration Component (Optional - if native signup needed later)

**Files:**
- Create: `src/components/SignupForm.tsx`

**Step 1: Create signup component**

Create file `src/components/SignupForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/auth';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up with email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-8), // Temporary - users won't use this
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) throw authError;

      // Create profile
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: name,
        });

        if (profileError) throw profileError;
      }

      // Redirect to perfil
      window.location.href = '/perfil';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '10px', borderRadius: 4, border: '1px solid #ccc' }}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ padding: '10px', borderRadius: 4, border: '1px solid #ccc' }}
      />
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px',
          background: loading ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Criando...' : 'Criar Conta'}
      </button>
    </form>
  );
}
```

**Step 2: Test component locally**

(Skip for now - just commit as ready for future use)

**Step 3: Commit**

```bash
git add src/components/SignupForm.tsx
git commit -m "feat: create signup form component (for future use)"
```

---

## Task 7: Protect Routes with Middleware (Optional but Recommended)

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

Create file `src/middleware.ts`:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)',
  ],
};
```

**Step 2: Update auth.ts with updateSession**

Add this to `src/lib/auth.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth session
  await supabase.auth.getSession();
  
  return response;
}
```

**Step 3: Test middleware works**

Reload page → should maintain session

Expected: No errors in console

**Step 4: Commit**

```bash
git add src/middleware.ts src/lib/auth.ts
git commit -m "feat: add auth middleware for session management"
```

---

## Verification Checklist

- [ ] Supabase Google OAuth provider is enabled
- [ ] `.env.local` has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] `profiles` table created in Supabase
- [ ] RLS policies configured on `profiles` table
- [ ] `src/lib/auth.ts` created with helper functions
- [ ] Google sign-in button on `/perfil` is functional
- [ ] First-time login creates user profile automatically
- [ ] After login, user sees profile page
- [ ] User can log out
- [ ] No TypeScript errors

---

## Testing the Full Flow

1. Navigate to `http://localhost:3000/perfil` (not logged in)
2. Click "Entrar com Google" button
3. Complete Google sign-in
4. Should redirect back to `/perfil` showing user data
5. Check Supabase `auth.users` → should see new user
6. Check `profiles` table → should see new profile with full_name and avatar_url
7. Reload page → user should still be logged in (session persisted)
8. Click logout → should redirect to login page

---

## Next Steps After Implementation

1. Create dedicated signup page (optional, since Google OAuth is primary)
2. Implement user preferences/settings page
3. Add address management (already partially done in existing code)
4. Implement favorites/wishlist
5. Implement order history
