import { ratingLine, ratingShort, starsLabel } from '../review';

describe('rating labels', () => {
  it('shows the average once a shop has three reviews', () => {
    expect(ratingShort({ average: 4.3, count: 12 })).toBe('4.3 (12)');
    expect(ratingLine({ average: 4, count: 3 })).toBe('4.0 from 3 reviews');
  });

  it('calls a shop new before that', () => {
    expect(ratingShort({ average: null, count: 2 })).toBe('New');
    expect(ratingLine({ average: null, count: 0 })).toBe('New: no reviews yet');
    expect(ratingLine({ average: null, count: 1 })).toBe('New: 1 review so far');
    expect(ratingLine({ average: null, count: 2 })).toBe('New: 2 reviews so far');
  });

  it('says star or stars', () => {
    expect(starsLabel(1)).toBe('1 star');
    expect(starsLabel(4)).toBe('4 stars');
  });
});
