import { acrossLine, listingWord, orderLabel, ratingLine, ratingShort, replyFrom, reviewLink, starsLabel } from '../review';

describe('words by kind of business', () => {
  it('names who replied, reading old print reviews as the shop', () => {
    expect(replyFrom()).toBe('From the shop');
    expect(replyFrom('events')).toBe('From the organiser');
    expect(replyFrom('coaching')).toBe('From the institute');
    expect(replyFrom('turf')).toBe('From the ground');
  });

  it('names the order a review is about', () => {
    expect(orderLabel({ orderNo: 7 })).toBe('Order #7');
    expect(orderLabel({ module: 'events', orderNo: 12 })).toBe('Booking #12');
    expect(orderLabel({ module: 'coaching', orderNo: 12 })).toBe('Enrolment #12');
  });

  it('names the listing and what the business rating covers', () => {
    expect(listingWord('course')).toBe('Course');
    expect(acrossLine('Asha Gigs', 'event')).toBe('Across Asha Gigs’s events');
    expect(acrossLine('Arena', 'ground')).toBe('Across Arena’s grounds');
  });
});

describe('reviewLink', () => {
  const at = { orderId: 'o1', listing: null };

  it('opens a print order from the vendor portal, or from Work for the team', () => {
    expect(reviewLink(at, false)).toEqual({ label: 'Open order', href: { pathname: '/(vendor)/sale/[id]', params: { id: 'o1' } } });
    expect(reviewLink({ ...at, module: 'pod' }, true)).toEqual({ label: 'Open order', href: { pathname: '/(customer)/work/order/[id]', params: { id: 'o1' } } });
  });

  it('sends the owner to the event’s bookings or the course’s students', () => {
    expect(reviewLink({ ...at, module: 'events', listing: { type: 'event', id: 'e1' } }, false)).toEqual({
      label: 'See bookings',
      href: { pathname: '/(vendor)/events/[id]/bookings', params: { id: 'e1' } },
    });
    expect(reviewLink({ ...at, module: 'coaching', listing: { type: 'course', id: 'c1' } }, false)?.label).toBe('See students');
    expect(reviewLink({ ...at, module: 'events', listing: { type: 'event', id: 'e1' } }, true)).toBeNull();
  });

  it('opens a ground booking on the desk for the owner and the team', () => {
    const turf = { ...at, module: 'turf' as const, listing: { type: 'ground' as const, id: 'g1' } };
    expect(reviewLink(turf, true)?.href).toEqual({ pathname: '/(customer)/ground-desk/booking/[id]', params: { id: 'o1' } });
    expect(reviewLink({ ...at, module: 'stays' }, false)).toBeNull();
  });
});

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
