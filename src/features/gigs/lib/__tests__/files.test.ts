import { allowedFile, filesProblem, limitsOf } from '../files';
import { downloadUrl } from '../open-file';

const MB = 1024 * 1024;
const LIMITS = limitsOf(null);

describe('limitsOf', () => {
  it('takes the rules’ limits, else the fixed ones', () => {
    const sent = { portfolio: 8, gigPhotos: 3, questions: 4, files: 6, links: 7, answer: 500, extensions: ['pdf'] };
    expect(limitsOf({ limits: sent })).toBe(sent);
    expect(limitsOf({})).toMatchObject({ portfolio: 12, gigPhotos: 5, questions: 5, files: 10, links: 10, answer: 1000 });
    expect(LIMITS.extensions).toContain('pdf');
    expect(LIMITS.extensions).not.toContain('svg');
  });
});

describe('allowedFile', () => {
  it('goes by the extension, in any case', () => {
    expect(allowedFile('Brief.PDF', LIMITS.extensions)).toBe(true);
    expect(allowedFile('logo.ai', LIMITS.extensions)).toBe(true);
    expect(allowedFile('setup.exe', LIMITS.extensions)).toBe(false);
    expect(allowedFile('no-extension', LIMITS.extensions)).toBe(false);
  });
  it('uses the types the rules send', () => {
    expect(allowedFile('logo.ai', ['pdf'])).toBe(false);
  });
});

describe('downloadUrl', () => {
  it('asks the signed link for a download', () => {
    expect(downloadUrl('https://api.ruxstar.com/gig-files/f1?exp=1&t=abc')).toBe('https://api.ruxstar.com/gig-files/f1?exp=1&t=abc&download=1');
    expect(downloadUrl('https://api.ruxstar.com/gig-files/f1')).toBe('https://api.ruxstar.com/gig-files/f1?download=1');
  });
});

describe('filesProblem', () => {
  it('passes files that fit', () => {
    expect(filesProblem([{ name: 'a.png', size: 2 * MB }], [{ bytes: 3 * MB }], 25, LIMITS)).toBeNull();
  });
  it('names the first file of a refused type', () => {
    expect(filesProblem([{ name: 'a.png' }, { name: 'run.exe' }], [], 25, LIMITS)).toMatch(/^run\.exe can’t be sent/);
  });
  it('counts the ones already added', () => {
    expect(filesProblem([{ name: 'a.png' }, { name: 'b.png' }], [{ bytes: 1 }], 25, { ...LIMITS, files: 2 })).toBe('Up to 2 files.');
  });
  it('adds up the sizes, and lets through ones the picker could not size', () => {
    expect(filesProblem([{ name: 'a.mp4', size: 20 * MB }], [{ bytes: 6 * MB }], 25, LIMITS)).toBe('Files can add up to 25 MB.');
    expect(filesProblem([{ name: 'a.mp4', size: null }], [], 1, LIMITS)).toBeNull();
  });
});
