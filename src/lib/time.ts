const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "5m", "3h", "2d", or "12 Oct" for anything older than a week. */
export const timeAgo = (iso: string, now: number = Date.now()): string => {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  if (elapsed < MINUTE) return 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** 1.2K / 3.4M style counts for like and comment totals. */
export const compactCount = (value: number): string => {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
};
