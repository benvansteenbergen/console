import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { kbFileType, textFileName, wordToText } from '@/lib/kbFiles';

const fixture = (name: string) => readFileSync(path.join(__dirname, '..', 'fixtures', name));

describe('kbFiles', () => {
  it('recognises the supported types case-insensitively', () => {
    expect(kbFileType('Report.PDF')).toBe('pdf');
    expect(kbFileType('brief.docx')).toBe('docx');
    expect(kbFileType('old.doc')).toBe('doc');
    expect(kbFileType('notes.txt')).toBeNull();
    expect(kbFileType('no-extension')).toBeNull();
  });

  it('extracts text from a .docx file', async () => {
    const text = await wordToText(fixture('sample.docx'), 'docx');
    expect(text).toContain('Wandsysteem Vitrilight');
    expect(text).toContain('modulering van 1200 mm');
  });

  it('extracts text from a legacy .doc file', async () => {
    const text = await wordToText(fixture('sample.doc'), 'doc');
    expect(text).toContain('Productblad Vitriwand');
    expect(text).toContain('44 dB');
  });

  it('renames Word files to .txt for n8n', () => {
    expect(textFileName('Q3 plan.docx')).toBe('Q3 plan.txt');
    expect(textFileName('legacy.doc')).toBe('legacy.txt');
  });
});
