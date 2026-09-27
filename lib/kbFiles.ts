import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

/**
 * Knowledge base file handling (server side only).
 * PDFs go to n8n as-is. Word files (.docx / legacy .doc) are turned into plain text here,
 * because n8n cannot read them, and sent on as a text/plain file.
 */

export type KbFileType = 'pdf' | 'docx' | 'doc';

export const KB_MAX_BYTES = 10 * 1024 * 1024;
export const KB_ACCEPT = '.pdf,.docx,.doc';

export function kbFileType(fileName: string): KbFileType | null {
  const ext = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1];
  return ext === 'pdf' || ext === 'docx' || ext === 'doc' ? ext : null;
}

export async function wordToText(buffer: Buffer, type: 'docx' | 'doc'): Promise<string> {
  const raw =
    type === 'docx'
      ? (await mammoth.extractRawText({ buffer })).value
      : (await new WordExtractor().extract(buffer)).getBody();
  return raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** The file name n8n receives for extracted Word text: "report.docx" -> "report.txt". */
export function textFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') + '.txt';
}
