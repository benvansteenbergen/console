import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing the route
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET } from '@/app/api/auth/me/route';

describe('API: /api/auth/me', () => {
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

    expect(response.status).toBe(401);
  });

  it('should return user info when authenticated', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    const mockUserInfo = {
      email: 'test@example.com',
      client: 'wingsuite',
      role: 'editor',
      valid: 'true',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUserInfo),
    }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockUserInfo);
    expect(fetch).toHaveBeenCalledWith(
      'https://test-n8n.example.com/webhook/portal-userinfo',
      expect.objectContaining({
        headers: { cookie: 'auth=test-jwt-token;' },
      })
    );
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
