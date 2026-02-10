import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Must mock before importing the route
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET } from '@/app/api/content-storage/route';

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('API: /api/content-storage', () => {
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

    const request = createRequest('http://localhost/api/content-storage');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return folder stats when authenticated', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    // n8n returns format: [{ "FolderName": { items: [...], newFiles: 2 } }]
    const mockN8nResponse = [
      {
        "Blog Posts": {
          items: [
            { id: '1', name: 'Post 1', webViewLink: 'https://...' },
            { id: '2', name: 'Post 2', webViewLink: 'https://...' },
          ],
          newFiles: 2,
        },
      },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockN8nResponse)),
    }));

    const request = createRequest('http://localhost/api/content-storage?folder=Blog%20Posts&refresh=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([
      {
        folder: 'Blog Posts',
        unseen: 2,
        items: [
          { id: '1', name: 'Post 1', webViewLink: 'https://...' },
          { id: '2', name: 'Post 2', webViewLink: 'https://...' },
        ],
      },
    ]);
  });

  it('should transform multiple folders correctly', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    const mockN8nResponse = [
      { "Blog Posts": { items: [{ id: '1' }], newFiles: 1 } },
      { "Social Media": { items: [{ id: '2' }, { id: '3' }], newFiles: 0 } },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockN8nResponse)),
    }));

    const request = createRequest('http://localhost/api/content-storage?refresh=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].folder).toBe('Blog Posts');
    expect(data[1].folder).toBe('Social Media');
    expect(data[1].unseen).toBe(0);
  });

  it('should return 502 when n8n returns error', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const request = createRequest('http://localhost/api/content-storage?refresh=true');
    const response = await GET(request);

    expect(response.status).toBe(502);
  });

  it('should return 502 when n8n returns empty response', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    }));

    const request = createRequest('http://localhost/api/content-storage?folder=empty-test&refresh=true');
    const response = await GET(request);

    expect(response.status).toBe(502);
  });

  it('should return 502 when n8n returns invalid JSON', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined,
    } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('not valid json'),
    }));

    const request = createRequest('http://localhost/api/content-storage?folder=invalid-test&refresh=true');
    const response = await GET(request);

    expect(response.status).toBe(502);
  });
});
