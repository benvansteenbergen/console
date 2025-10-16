'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/BrandingProvider';

const ERROR_MESSAGES: Record<string, string> = {
  'missing-fields'      : 'Vul zowel e-mail als wachtwoord in.',
  'invalid-credentials' : 'Onjuiste combinatie. Probeer het nogmaals.',
  'token-missing'       : 'Er ging iets mis bij het inloggen. Probeer opnieuw.',
};

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const branding = useBranding();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get('error'));
  }, []);

  return (
      <div className="flex h-screen">
        {/* ---------- Hero image (desktop only) ---------- */}
        <div className="relative hidden lg:block lg:w-1/2">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: branding.loginBg }}
          />
          <img
              src={branding.loginImage}
              alt={`${branding.name} flying`}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
              aria-hidden="true"
          />
        </div>

        {/* ---------- Form column ---------- */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* logo */}
          <img src={branding.logo} alt={branding.name} width={200} height={48} />

          <h1 className="mt-8 text-2xl font-semibold">
            Login to the {branding.name}
          </h1>

          {error && (
              <p className="mt-4 w-full max-w-sm rounded-md bg-red-100 p-3 text-sm text-red-700">
                {ERROR_MESSAGES[error] ?? 'Onbekende fout. Probeer opnieuw.'}
              </p>
          )}

          <form
              action="/api/auth/login"
              method="POST"
              className="mt-6 w-full max-w-sm space-y-4"
          >
            <input
                name="emailOrLdapLoginId"
                type="email"
                required
                placeholder="Email"
                className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            <input
                name="password"
                type="password"
                required
                placeholder="Password"
                className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />

            <Button className="h-11 w-full" type="submit">
              Sign in
            </Button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              OR …
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <Button variant="outline" type="button" className="h-11 w-full">
              Forgot password?
            </Button>
            <Button variant="outline" type="button" className="h-11 w-full">
              I need help!
            </Button>
          </form>
        </div>
      </div>
  );
}