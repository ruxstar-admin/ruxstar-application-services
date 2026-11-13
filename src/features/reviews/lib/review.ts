import type { Rating, ReviewReportReason } from '@/types/review';

export const REVIEW_TEXT_MAX = 500;
export const REPLY_TEXT_MAX = 500;

export const starsLabel = (n: number) => `${n} star${n === 1 ? '' : 's'}`;

/** "4.3 (12)", or "New" before a shop has 3 reviews. */
export const ratingShort = (rating: Rating) => (rating.average === null ? 'New' : `${rating.average.toFixed(1)} (${rating.count})`);

/** "4.3 from 12 reviews", or what a newer shop has so far. */
export function ratingLine(rating: Rating): string {
  if (rating.average !== null) return `${rating.average.toFixed(1)} from ${rating.count} reviews`;
  if (rating.count === 0) return 'New: no reviews yet';
  return `New: ${rating.count} review${rating.count === 1 ? '' : 's'} so far`;
}

export const REPORT_REASONS: { key: ReviewReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam or ads' },
  { key: 'fake', label: 'Not a real customer' },
  { key: 'abuse', label: 'Abusive' },
  { key: 'other', label: 'Something else' },
];

/** Shown under the star picker for the stars chosen. */
export const STAR_WORDS: Record<number, string> = { 1: 'Poor', 2: 'Not great', 3: 'Okay', 4: 'Good', 5: 'Excellent' };
