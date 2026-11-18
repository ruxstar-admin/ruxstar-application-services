import type { GigsLimits, GigsRules } from '@/types/gigs';

/** Every file type the API can take, by extension. Ruxstar picks which of them are allowed in the console. */
export const FILE_TYPES = [
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'psd', 'ai', 'eps', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a',
  'zip', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'ttf', 'otf',
] as const;

/**
 * Set by Ruxstar: portfolio photos, gig photos, questions, files and links on one order or delivery, the length of
 * an answer, and the file types taken. GET /v1/gigs/rules sends them as `limits`; these defaults stand in when it doesn't.
 */
const FALLBACK_LIMITS: GigsLimits = {
  portfolio: 12,
  gigPhotos: 5,
  questions: 5,
  files: 10,
  links: 10,
  answer: 1000,
  extensions: [...FILE_TYPES],
};

export const limitsOf = (rules: Pick<GigsRules, 'limits'> | null | undefined): GigsLimits => rules?.limits ?? FALLBACK_LIMITS;

const MB = 1024 * 1024;
const extensionOf = (name: string) => /\.([a-z0-9]{2,5})$/i.exec(name.trim())?.[1]?.toLowerCase() ?? '';
export const allowedFile = (name: string, extensions: readonly string[]) => extensions.includes(extensionOf(name));

/**
 * Why these picked files can't go with the ones already added, or null: a type the API refuses, too many files,
 * or more than `maxMb` in all.
 */
export function filesProblem(
  picked: readonly { name: string; size?: number | null }[],
  held: readonly { bytes: number }[],
  maxMb: number,
  limits: Pick<GigsLimits, 'files' | 'extensions'>,
): string | null {
  const refused = picked.find((f) => !allowedFile(f.name, limits.extensions));
  if (refused) return `${refused.name} can’t be sent. Use one of these: ${limits.extensions.join(', ')}.`;
  if (picked.length + held.length > limits.files) return `Up to ${limits.files} file${limits.files === 1 ? '' : 's'}.`;
  const bytes = picked.reduce((s, f) => s + (f.size ?? 0), 0) + held.reduce((s, f) => s + f.bytes, 0);
  if (bytes > maxMb * MB) return `Files can add up to ${maxMb} MB.`;
  return null;
}
