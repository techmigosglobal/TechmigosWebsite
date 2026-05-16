import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

type CookieOptions = {
  path?: string;
  maxAge?: number;
  domain?: string;
  expires?: string | number | Date;
};

type StoredCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

declare global {
  interface Window {
    __sb_patched__?: boolean;
    __supabaseClient?: SupabaseBrowserClient;
  }
}

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=None; Secure; Partitioned`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined'
    ? []
    : document.cookie
        .split(';')
        .filter(Boolean)
        .map((c) => {
          const eqIndex = c.trim().indexOf('=');
          const name = eqIndex !== -1 ? c.trim().slice(0, eqIndex) : c.trim();
          const rest = eqIndex !== -1 ? c.trim().slice(eqIndex + 1) : '';
          return { name: name.trim(), value: decodeURIComponent(rest) };
        })
        .filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch {
    return [];
  }
};

const setCookie = (name: string, value: string, options?: CookieOptions) => {
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=None; Secure; Partitioned`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage()).find((c) => c.name.includes('auth-token'))
    ?.value ?? null;

if (typeof window !== 'undefined' && !window.__sb_patched__) {
  window.__sb_patched__ = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const token = getToken();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      init = {
        ...(init || {}),
        headers: { ...(init?.headers || {}), 'x-sb-token': token },
      };
    }
    return orig(input, init);
  };
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

function requiredPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for SchoolDesk Supabase features.`);
  }
  return value;
}

export function createClient() {
  // Singleton pattern for the browser client
  if (typeof window !== 'undefined') {
    if (window.__supabaseClient) {
      return window.__supabaseClient;
    }
  }

  if (browserClient) return browserClient;

  const supabaseUrl = requiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => (canUseCookies() ? fromCookies() : fromStorage()),
      setAll(cookiesToSet: StoredCookie[]) {
        if (typeof document === 'undefined') return;
        if (canUseCookies()) {
          cookiesToSet.forEach(({ name, value, options }) =>
            value
              ? setCookie(name, value, options)
              : (document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`)
          );
        } else {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              if (value) {
                localStorage.setItem(`${PFX}${name}`, value);
              } else {
                localStorage.removeItem(`${PFX}${name}`);
              }
            } catch {
              // ignore
            }
            if (value) setCookie(name, value, options);
          });
        }
      },
    },
  });

  if (typeof window !== 'undefined') {
    window.__supabaseClient = browserClient;
  }

  return browserClient;
}
