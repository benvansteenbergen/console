import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST as folderAction } from '@/app/api/knowledge-base/folders/route';
import { POST as moveDocs } from '@/app/api/knowledge-base/move/route';
import { POST as upload } from '@/app/api/knowledge-base/upload/route';
import { GET as library } from '@/app/api/knowledge-base/library/route';
import { POST as studioMessage } from '@/app/api/studio/message/route';

type CookieStore = ReturnType<typeof cookies> extends Promise<infer T> ? T : never;

function loggedIn() {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'session' ? { name: 'session', value: 'test-jwt-token' } : undefined),
  } as CookieStore);
}

function mockN8n(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const jsonPost = (url: string, body: unknown) =>
  new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });

function uploadRequest(file: File, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append('file', file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return new NextRequest('http://localhost/api/knowledge-base/upload', { method: 'POST', body: fd });
}

beforeEach(() => {
  vi.stubEnv('N8N_BASE_URL', 'https://test-n8n.example.com');
  loggedIn();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('API: /api/knowledge-base/folders', () => {
  it('rejects unknown actions and missing fields', async () => {
    expect((await folderAction(jsonPost('http://localhost/x', { action: 'drop' }))).status).toBe(400);
    expect((await folderAction(jsonPost('http://localhost/x', { action: 'create', name: '  ' }))).status).toBe(400);
    expect((await folderAction(jsonPost('http://localhost/x', { action: 'rename', name: 'A' }))).status).toBe(400);
  });

  it('forwards a create to n8n', async () => {
    const fetchMock = mockN8n({ success: true, folders: [{ id: 'f1', name: 'Pricing' }] });
    const res = await folderAction(jsonPost('http://localhost/x', { action: 'create', name: 'Pricing' }));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://test-n8n.example.com/webhook/knowledge-base-folders');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: 'create', name: 'Pricing' });
  });
});

describe('API: /api/knowledge-base/move', () => {
  it('requires document ids', async () => {
    expect((await moveDocs(jsonPost('http://localhost/x', { document_ids: [], folder_id: 'f1' }))).status).toBe(400);
  });

  it('forwards ids and folder, "" when unfiling', async () => {
    const fetchMock = mockN8n([{ success: true, moved_chunks: 4 }]);
    const res = await moveDocs(jsonPost('http://localhost/x', { document_ids: ['d1', 'd2'] }));
    const data = await res.json();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ document_ids: ['d1', 'd2'], folder_id: '' });
    expect(data.moved_chunks).toBe(4);
  });
});

describe('API: /api/knowledge-base/library', () => {
  it('unwraps the n8n array', async () => {
    mockN8n([{ success: true, documents: [{ document_id: 'd1' }], folders: [] }]);
    const data = await (await library()).json();
    expect(data.documents).toHaveLength(1);
  });
});

describe('API: /api/knowledge-base/upload', () => {
  it('rejects unsupported file types', async () => {
    const res = await upload(uploadRequest(new File(['x'], 'notes.txt', { type: 'text/plain' })));
    expect(res.status).toBe(400);
  });

  it('sends a PDF as-is with folder and type', async () => {
    const fetchMock = mockN8n({ success: 'true' });
    await upload(uploadRequest(new File(['%PDF-1.4'], 'sheet.pdf', { type: 'application/pdf' }), { folder_id: 'f1' }));
    const sent = fetchMock.mock.calls[0][1].body as FormData;
    expect((sent.get('file') as File).name).toBe('sheet.pdf');
    expect(sent.get('folder_id')).toBe('f1');
    expect(sent.get('file_type')).toBe('pdf');
  });

  it('converts a .docx to a text file before sending it to n8n', async () => {
    const fetchMock = mockN8n({ success: 'true' });
    const docx = readFileSync(path.join(__dirname, '..', 'fixtures', 'sample.docx'));
    await upload(uploadRequest(new File([docx], 'Vitrilight.docx')));
    const sent = fetchMock.mock.calls[0][1].body as FormData;
    const file = sent.get('file') as File;
    expect(file.name).toBe('Vitrilight.txt');
    expect(await file.text()).toContain('modulering van 1200 mm');
    expect(sent.get('file_type')).toBe('docx');
    expect(sent.get('title')).toBe('Vitrilight');
  });
});

describe('API: /api/studio/message', () => {
  it('forwards the knowledge base scope', async () => {
    const fetchMock = mockN8n({ content: 'ok', conversationId: 'c1' });
    const scope = { mode: 'folders', folderIds: ['f1'], folderNames: ['Pricing'] };
    await studioMessage(jsonPost('http://localhost/x', { message: 'hi', useKnowledgeBase: true, knowledgeBase: scope }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).knowledgeBase).toEqual(scope);
  });
});
