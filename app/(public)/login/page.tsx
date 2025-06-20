// apps/console/app/(public)/login/page.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw]     = useState('');
  const router          = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ email, password: pw }),
    });
    if (res.ok) router.push('/dashboard');
    else alert('Invalid credentials');
  }

  return (
    <div className="flex h-screen">
      {/* left hero (hidden on small screens) */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/hero.jpg"
          alt="Wingsuite flying over city"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* right form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <Image src="/logo.svg" alt="Wingsuite" width={200} height={48} priority />

        <h1 className="mt-8 text-2xl font-semibold">Login to the Wingsuite Console</h1>

        <form onSubmit={submit} className="mt-6 w-full max-w-sm space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            value={pw}
            onChange={e => setPw(e.target.value)}
            required
          />

          <Button className="w-full h-11">Sign in</Button>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            OR …
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <Button variant="outline" type="button" className="w-full h-11">
            Forgot password?
          </Button>
          <Button variant="outline" type="button" className="w-full h-11">
            I need help!
          </Button>
        </form>
      </div>
    </div>
  );
}

