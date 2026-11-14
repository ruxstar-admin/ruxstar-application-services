import { refundLine, refundPercentAt } from '../refund';

const turf = [
  { hoursBefore: 6, percent: 100 },
  { hoursBefore: 2, percent: 50 },
];

describe('refundLine', () => {
  it('writes the turf rule as one sentence', () => {
    expect(refundLine(turf)).toBe('Full refund if you cancel at least 6 hours before it starts, 50% back if at least 2 hours before, and no refund after that.');
  });

  it('reads the same whatever order the tiers come in', () => {
    expect(refundLine([...turf].reverse())).toBe(refundLine(turf));
  });

  it('handles a single tier and a custom ending', () => {
    expect(refundLine([{ hoursBefore: 48, percent: 100 }], 'move-in')).toBe('Full refund if you cancel at least 2 days before move-in, and no refund after that.');
    expect(refundLine([{ hoursBefore: 0, percent: 100 }], 'the first class')).toBe('Full refund if you cancel any time before the first class.');
  });

  it('handles a last tier that lasts until the start', () => {
    expect(refundLine([{ hoursBefore: 24, percent: 100 }, { hoursBefore: 0, percent: 25 }])).toBe(
      'Full refund if you cancel at least 1 day before it starts, and 25% back after that, until it starts.',
    );
  });

  it('says so plainly when there is no refund', () => {
    expect(refundLine([])).toBe('No refund if you cancel.');
    expect(refundLine([{ hoursBefore: 6, percent: 0 }])).toBe('No refund if you cancel.');
  });

  it('writes short windows in minutes and one hour in the singular', () => {
    expect(refundLine([{ hoursBefore: 1, percent: 100 }, { hoursBefore: 0.5, percent: 50 }])).toBe(
      'Full refund if you cancel at least 1 hour before it starts, 50% back if at least 30 minutes before, and no refund after that.',
    );
  });
});

describe('refundPercentAt', () => {
  it('picks the best tier the time left qualifies for', () => {
    expect(refundPercentAt(turf, 10)).toBe(100);
    expect(refundPercentAt(turf, 6)).toBe(100);
    expect(refundPercentAt(turf, 3)).toBe(50);
    expect(refundPercentAt(turf, 1)).toBe(0);
    expect(refundPercentAt(turf, -1)).toBe(0);
    expect(refundPercentAt([{ hoursBefore: 0, percent: 100 }], 0.1)).toBe(100);
  });
});
