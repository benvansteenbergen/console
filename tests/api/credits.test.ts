import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing the route
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET } from '@/app/api/credits/route';

describe('API: /api/credits', () => {
  beforeEach(() => {
    vi.stubEnv('N8N_BASE_URL', 'https://test-n8n.example.com');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should return 401 when no session cookie', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('should return credits when authenticated', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    const mockCredits = [{
      plan: 'pro',
      credits_used: '150',  // n8n might return as string
      plan_credits: '1000',
      over_limit: false,
    }];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockCredits)),
    }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      plan: 'pro',
      credits_used: 150,     // Should be converted to number
      plan_credits: 1000,    // Should be converted to number
      over_limit: false,
    });
  });

  it('should handle single object response (not array)', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    const mockCredits = {
      plan: 'starter',
      credits_used: 50,
      plan_credits: 100,
      over_limit: false,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockCredits)),
    }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plan).toBe('starter');
  });

  it('should return 502 when n8n returns error', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const response = await GET();

    expect(response.status).toBe(502);
  });
});
