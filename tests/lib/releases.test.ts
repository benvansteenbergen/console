import { describe, it, expect } from 'vitest';
import { CURRENT_VERSION, RELEASES } from '@/lib/releases';

function parse(version: string): [number, number, number] {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (m === null) throw new Error(`not semver: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

describe('release notes', () => {
  it('current version is the newest release', () => {
    expect(CURRENT_VERSION).toBe(RELEASES[0].version);
  });

  it('every release has a semver version, ISO date, title and at least one change', () => {
    for (const r of RELEASES) {
      expect(() => parse(r.version)).not.toThrow();
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.title.trim()).not.toBe('');
      expect(r.changes.length).toBeGreaterThan(0);
    }
  });

  it('is ordered newest first, with unique versions and non-increasing dates', () => {
    for (let i = 1; i < RELEASES.length; i++) {
      const [newer, older] = [RELEASES[i - 1], RELEASES[i]];
      const a = parse(newer.version);
      const b = parse(older.version);
      const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
      expect(cmp, `${newer.version} should be above ${older.version}`).toBeGreaterThan(0);
      expect(newer.date >= older.date, `${newer.version} date`).toBe(true);
    }
  });

  // `type` drives a future "new version" email, so it must match the actual bump.
  it('type matches the version bump from the previous release', () => {
    for (let i = 0; i < RELEASES.length - 1; i++) {
      const [ma, mi, pa] = parse(RELEASES[i].version);
      const [mb, mib] = parse(RELEASES[i + 1].version);
      const expected = ma !== mb ? 'major' : mi !== mib ? 'minor' : 'patch';
      expect(RELEASES[i].type, RELEASES[i].version).toBe(expected);
      if (expected === 'major') expect([mi, pa]).toEqual([0, 0]);
      if (expected === 'minor') expect(pa).toBe(0);
    }
  });
});
