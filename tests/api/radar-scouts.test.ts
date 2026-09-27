import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Must mock before importing the routes
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET as getScouts } from '@/app/api/radar/scouts/route';
import { POST as manageScout } from '@/app/api/radar/scouts/manage/route';
import { GET as getConcepts } from '@/app/api/radar/concepts/route';
import { GET as getSources } from '@/app/api/radar/sources/route';
import { POST as sourceAction } from '@/app/api/radar/sources/action/route';

type CookieStore = ReturnType<typeof cookies> extends Promise<infer T> ? T : never;

function loggedIn() {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined),
  } as CookieStore);
}

function loggedOut() {
  vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as CookieStore);
}

function mockN8n(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function post(url: string, body: unknown) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });
}

describe('API: /api/radar/scouts', () => {
  beforeEach(() => {
    vi.stubEnv('N8N_BASE_URL', 'https://test-n8n.example.com');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns 401 without a session', async () => {
    loggedOut();
    const response = await getScouts();
    expect(response.status).toBe(401);
  });

  it('unwraps the n8n array response', async () => {
    loggedIn();
    const fetchMock = mockN8n([{ success: true, scouts: [{ id: 's1', name: 'AI', status: 'active' }] }]);

    const response = await getScouts();
    const data = await response.json();

    expect(fetchMock.mock.calls[0][0]).toBe('https://test-n8n.example.com/webhook/radar-scouts-list');
    expect(data.scouts).toHaveLength(1);
    expect(data.scouts[0].name).toBe('AI');
  });

  it('falls back to an empty list when n8n fails', async () => {
    loggedIn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('') }));

    const response = await getScouts();
    const data = await response.json();

    expect(data).toEqual({ success: true, scouts: [] });
  });
});

describe('API: /api/radar/scouts/manage', () => {
  beforeEach(() => {
    vi.stubEnv('N8N_BASE_URL', 'https://test-n8n.example.com');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('rejects unknown actions', async () => {
    loggedIn();
    const response = await manageScout(post('http://localhost/api/radar/scouts/manage', { scout_id: 's1', action: 'delete' }));
    expect(response.status).toBe(400);
  });

  it('requires a name to rename', async () => {
    loggedIn();
    const response = await manageScout(
      post('http://localhost/api/radar/scouts/manage', { scout_id: 's1', action: 'rename', name: '  ' })
    );
    expect(response.status).toBe(400);
  });

  it('forwards pause to n8n', async () => {
    loggedIn();
    const fetchMock = mockN8n({ success: true, scout: { id: 's1', name: 'AI', status: 'paused' } });

    const response = await manageScout(post('http://localhost/api/radar/scouts/manage', { scout_id: 's1', action: 'pause' }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://test-n8n.example.com/webhook/radar-scout-manage');
    expect(sent).toMatchObject({ scout_id: 's1', action: 'pause' });
  });
});

describe('API: scout_id forwarding', () => {
  beforeEach(() => {
    vi.stubEnv('N8N_BASE_URL', 'https://test-n8n.example.com');
    loggedIn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('concepts: forwards status, scout_id and unseen', async () => {
    const fetchMock = mockN8n([{ success: true, concepts: [] }]);
    await getConcepts(new NextRequest('http://localhost/api/radar/concepts?status=saved&scout_id=abc&unseen=true'));
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://test-n8n.example.com/webhook/radar-concepts-list?status=saved&scout_id=abc&unseen=true'
    );
  });

  it('concepts: no params means no query string (legacy behaviour)', async () => {
    const fetchMock = mockN8n([{ success: true, concepts: [] }]);
    await getConcepts(new NextRequest('http://localhost/api/radar/concepts'));
    expect(fetchMock.mock.calls[0][0]).toBe('https://test-n8n.example.com/webhook/radar-concepts-list');
  });

  it('sources: forwards scout_id', async () => {
    const fetchMock = mockN8n([{ success: true, sources: [] }]);
    await getSources(new NextRequest('http://localhost/api/radar/sources?status=followed&scout_id=abc'));
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://test-n8n.example.com/webhook/radar-sources-list?status=followed&scout_id=abc'
    );
  });

  it('source action: copy requires target_scout_id', async () => {
    const response = await sourceAction(
      post('http://localhost/api/radar/sources/action', { source_id: 'src', action: 'copy' })
    );
    expect(response.status).toBe(400);
  });

  it('source action: forwards target_scout_id on copy', async () => {
    const fetchMock = mockN8n({ success: true, copied: 1 });
    await sourceAction(
      post('http://localhost/api/radar/sources/action', { source_id: 'src', action: 'copy', target_scout_id: 'tgt' })
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({ source_id: 'src', action: 'copy', target_scout_id: 'tgt' });
  });
});
