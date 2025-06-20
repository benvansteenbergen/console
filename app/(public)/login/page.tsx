'use client';

import { Button } from '@/components/ui/button';

export default function Login() {
  return (
    <div className="flex h-screen">
      {/* ---------- Hero image (desktop only) ---------- */}
      <div className="relative hidden lg:block lg:w-1/2">
        {/* update src if your image lives elsewhere */}
        <img
          src="/hero.jpg"
          alt="Wingsuite flying"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* ---------- Form column ---------- */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* logo */}
        <img src="/logo.svg" alt="Wingsuite" width={200} height={48} />

        <h1 className="mt-8 text-2xl font-semibold">
          Login to the Wingsuite Console
        </h1>

        {/* HTML form posts directly to the route handler */}
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
