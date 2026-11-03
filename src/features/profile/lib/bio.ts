export const BIO_MAX = 160;
export const BIO_LINES = 4;

/** Applied as you type: one empty line in a row at most, and no fifth line (the API applies the same rule). */
export function limitBio(text: string): string {
  const lines = text.replace(/\n{3,}/g, '\n\n').split('\n');
  if (lines.length <= BIO_LINES) return lines.join('\n');
  const rest = lines.slice(BIO_LINES - 1).filter(Boolean).join(' ');
  return [...lines.slice(0, BIO_LINES - 1), rest].join('\n');
}
