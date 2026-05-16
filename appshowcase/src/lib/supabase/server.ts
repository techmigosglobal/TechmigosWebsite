import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    domain?: string;
    expires?: number | Date;
    httpOnly?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
    secure?: boolean;
  };
};

function requiredPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for SchoolDesk Supabase features.`);
  }
  return value;
}

export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | undefined;
  try {
    cookieStore = await cookies();
  } catch {
    // Handle build-time static generation where cookies are not available
  }

  return createServerClient(
    requiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet: CookieToSet[]) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'none',
                secure: true,
              })
            );
          } catch {
            // Server Component read-only context — expected
          }
        },
      },
    }
  );
}
