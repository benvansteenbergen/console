'use client';
import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

interface SessionData {
    email?: string;
    client?: string;
    role?: string;
    valid: 'true' | 'false';
}

interface SessionState {
    loading: boolean;
    unauth: boolean;
    data?: SessionData;
}

const SessionCtx = createContext<SessionState | undefined>(undefined);

const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((r) => {
        if (r.status === 401) throw new Error('unauth');
        return r.json();
    });

export function SessionProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { data, error, isLoading } = useSWR<SessionData>('/api/auth/me', fetcher, {
        refreshInterval: 5 * 60_000, // 5‑minute re‑validation
    });

    // Treat both HTTP 401 and valid:false payloads as unauthenticated
    const unauthPayload = data && data.valid === 'false';
    const unauthError   = error?.message === 'unauth';
    const unauth        = unauthError || unauthPayload;

    if (unauth) {
        // Redirect client‑side once, prevent endless loop during SSR
        if (typeof window !== 'undefined') router.push('/login');
    }

    const value: SessionState = {
        loading: isLoading,
        unauth,
        data,
    };

    return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionState {
    const ctx = useContext(SessionCtx);
    if (!ctx) throw new Error('useSession() must be used inside <SessionProvider>');
    return ctx;
}