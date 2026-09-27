/**
 * Release notes: the single source of truth for the console version.
 *
 * - RELEASES is newest first; CURRENT_VERSION is RELEASES[0].version.
 * - Write entries for users (what changed for them), not for developers.
 * - Changes that shipped without a version bump collect in UNRELEASED until the
 *   next bump moves them into a new release. UNRELEASED is never shown to users.
 * - `type` follows semver and is what a future "new version" email keys on
 *   (e.g. email users on minor/major only).
 * See CLAUDE.md "Releases & versioning" for the workflow.
 */

export type ReleaseType = 'major' | 'minor' | 'patch';
export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface ReleaseChange {
  kind: ChangeKind;
  text: string;
}

export interface Release {
  version: string;
  /** ISO date (YYYY-MM-DD) the version went live. */
  date: string;
  type: ReleaseType;
  title: string;
  summary?: string;
  changes: ReleaseChange[];
}

export const UNRELEASED: ReleaseChange[] = [];

export const RELEASES: Release[] = [
  {
    version: '1.2.0',
    date: '2026-09-27',
    type: 'minor',
    title: 'Ask your documents',
    summary:
      'Ask a question and get an answer straight from your own documents, with the sources it came from.',
    changes: [
      { kind: 'new', text: 'Ask your knowledge base: questions about all your documents or one folder, answered from the documents themselves.' },
      { kind: 'new', text: 'Ask about one document from its menu, for a quick summary or a specific figure.' },
      { kind: 'improved', text: 'Every answer shows which documents it is based on.' },
      { kind: 'improved', text: 'In Content Studio, "Shared with your team" limits the knowledge base to documents shared with your team.' },
      { kind: 'fixed', text: 'Content Studio finds your documents again when "All documents" is selected.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-27',
    type: 'minor',
    title: 'A knowledge base you can organise',
    summary:
      'Put your documents in folders and tell Content Studio exactly which ones to use. Word files are welcome too.',
    changes: [
      { kind: 'new', text: 'Folders in your knowledge base. Create, rename and delete them, and move documents between them.' },
      { kind: 'new', text: 'In Content Studio, choose which knowledge to use: everything, specific folders, or none at all.' },
      { kind: 'new', text: 'Upload Word documents (.docx and .doc) next to PDF.' },
      { kind: 'new', text: 'Add several documents at once, each with its own title, folder and a suggested description.' },
      { kind: 'improved', text: 'The knowledge base page stays clear with many documents: search, sorting and compact rows.' },
      { kind: 'improved', text: 'Select several documents to move or delete them in one go.' },
      { kind: 'fixed', text: 'New documents appear in the list right after uploading.' },
      { kind: 'fixed', text: 'Deleting a document now removes all of it, and only its owner can delete it.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-27',
    type: 'major',
    title: 'Radar grows up: one scout per topic',
    summary:
      'Radar can now watch several topics at once. Each scout has its own focus and sources, and everything it finds lands in one calm feed.',
    changes: [
      { kind: 'new', text: 'Run several scouts, each watching one topic. Scout suggests a name for it, and you can rename it anytime.' },
      { kind: 'new', text: 'One feed for all your finds, with a filter per topic. Every find shows which topic it came from.' },
      { kind: 'new', text: 'A scouts overview where you pause, resume, adjust or remove a scout.' },
      { kind: 'new', text: 'Copy a source from one scout to another.' },
      { kind: 'improved', text: 'Finds read like the weekly email: the headline, why it matters to you, the angle and a fact check.' },
      { kind: 'improved', text: 'Each source shows its link, so you always see where a find comes from.' },
      { kind: 'improved', text: 'Sources that keep failing are paused automatically after 5 tries. Resume them with one click.' },
      { kind: 'improved', text: 'Clearer source health: "sometimes fails" is shown apart from "not fetching".' },
      { kind: 'new', text: 'This page, and the version number in the corner that leads here.' },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-24',
    type: 'minor',
    title: 'Your Radar, in your inbox',
    changes: [
      { kind: 'new', text: 'A weekly email every Monday with what Radar found for you. No finds, no email.' },
      { kind: 'new', text: 'Each headline in the email opens that find directly in Radar.' },
      { kind: 'new', text: 'Turn the weekly email off in Settings.' },
      { kind: 'improved', text: 'Sources that fail to load are marked, so you know which ones need attention.' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-07-09',
    type: 'minor',
    title: 'From find to finished piece',
    changes: [
      { kind: 'new', text: 'Write about a Radar find in Content Studio with one click.' },
      { kind: 'improved', text: 'The new experience (Brand identity, Studio, Library, Radar) is now the default for everyone.' },
      { kind: 'improved', text: 'Download documents from the Library as PDF.' },
      { kind: 'fixed', text: 'Studio conversations load reliably again.' },
      { kind: 'fixed', text: 'PDF file names with special characters download correctly.' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-06-08',
    type: 'minor',
    title: 'A new way to create content',
    changes: [
      { kind: 'new', text: 'Brand identity: a short interview that teaches the platform who you are.' },
      { kind: 'new', text: 'Content Studio: create content in conversation, based on your brand.' },
      { kind: 'new', text: 'Content Library: all your created content in one place.' },
      { kind: 'new', text: 'Radar with Scout: finds sources that fit you and surfaces fresh angles to write about.' },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
