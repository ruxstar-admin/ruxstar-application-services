import {
  draftErrors,
  emptyDraft,
  fromIst,
  istParts,
  orderPrice,
  paiseOf,
  peopleFor,
  personErrors,
  playersFor,
  priceLine,
  refundText,
  toEventInput,
  toHolders,
  whenLine,
} from '../events';

const RULES = { maxTicketTypes: 5, maxQuestions: 3, maxDays: 14 };

describe('event times', () => {
  it('reads and writes India time whatever the phone is set to', () => {
    expect(istParts('2026-11-16T13:30:00.000Z')).toEqual({ day: '2026-11-16', time: '19:00' });
    expect(istParts('2026-11-16T20:00:00.000Z')).toEqual({ day: '2026-11-17', time: '01:30' });
    expect(fromIst('2026-11-16', '19:00')).toBe('2026-11-16T13:30:00.000Z');
  });

  it('says one day once, and both days when it runs past midnight', () => {
    expect(whenLine(fromIst('2026-11-16', '19:00'), fromIst('2026-11-16', '23:00'))).toBe('Mon, 16 Nov · 7:00 pm – 11:00 pm');
    expect(whenLine(fromIst('2026-11-16', '22:00'), fromIst('2026-11-17', '02:00'))).toBe('Mon, 16 Nov, 10:00 pm – Tue, 17 Nov, 2:00 am');
  });
});

describe('prices', () => {
  it('words the price for a card', () => {
    expect(priceLine({ free: true, team: false, priceFrom: 0 })).toBe('Free');
    expect(priceLine({ free: false, team: false, priceFrom: 50_000 })).toBe('From ₹500');
    expect(priceLine({ free: false, team: true, priceFrom: 150_000 })).toBe('₹1,500 per team');
  });

  it('adds the platform fee only when something is paid for', () => {
    const tiers = [
      { id: 'a', price: 50_000 },
      { id: 'b', price: 0 },
    ];
    expect(orderPrice({ a: 2, b: 1 }, tiers, 500)).toEqual({ items: 100_000, discount: 0, fee: 500, total: 100_500 });
    expect(orderPrice({ b: 3 }, tiers, 500)).toEqual({ items: 0, discount: 0, fee: 0, total: 0 });
    expect(orderPrice({ a: 11 }, tiers, 500, true)).toEqual({ items: 50_000, discount: 0, fee: 500, total: 50_500 });
  });

  it('takes a coupon off the tickets, never below nothing, and keeps the platform fee', () => {
    const tiers = [{ id: 'a', price: 50_000 }];
    expect(orderPrice({ a: 2 }, tiers, 500, false, 10_000)).toEqual({ items: 100_000, discount: 10_000, fee: 500, total: 90_500 });
    expect(orderPrice({ a: 1 }, tiers, 500, false, 80_000)).toEqual({ items: 50_000, discount: 50_000, fee: 500, total: 500 });
  });

  it('reads rupees typed in', () => {
    expect(paiseOf('499')).toBe(49_900);
    expect(paiseOf('₹1,250.50')).toBe(125_050);
    expect(paiseOf('0')).toBe(0);
    expect(paiseOf('abc')).toBeNull();
    expect(paiseOf('')).toBeNull();
  });

  it('explains the refund rule before paying', () => {
    const until = fromIst('2026-11-15', '19:00');
    expect(refundText({ policy: 'standard', until, hours: 24 })).toBe(
      'Full refund, fee included, if you cancel before Sun, 15 Nov, 7:00 pm. If the organiser cancels, you always get it all back.',
    );
    expect(refundText({ policy: 'none', until: null, hours: 24 })).toMatch(/^No refunds/);
  });
});

describe('one card per person', () => {
  const me = { name: 'Asha Rao', mobile: '9876543210' };

  it('starts the first card with the buyer and keeps what was typed when counts change', () => {
    const first = peopleFor({ gen: 2 }, ['gen', 'vip'], [], me);
    expect(first.map((p) => [p.tierId, p.name])).toEqual([
      ['gen', 'Asha Rao'],
      ['gen', ''],
    ]);
    first[1]!.name = 'Ravi';
    const more = peopleFor({ gen: 2, vip: 1 }, ['gen', 'vip'], first, me);
    expect(more.map((p) => [p.tierId, p.name])).toEqual([
      ['gen', 'Asha Rao'],
      ['gen', 'Ravi'],
      ['vip', ''],
    ]);
    expect(peopleFor({ gen: 1 }, ['gen', 'vip'], more, me).map((p) => p.name)).toEqual(['Asha Rao']);
  });

  it('makes every player a card on the team ticket', () => {
    expect(playersFor(3, 'team', [], me).map((p) => p.tierId)).toEqual(['team', 'team', 'team']);
  });

  it('checks names, numbers and required answers', () => {
    const questions = [{ id: 'q1', label: 'T-shirt size', required: true }];
    const [person] = peopleFor({ gen: 1 }, ['gen'], []);
    expect(Object.keys(personErrors(person!, questions)).sort()).toEqual(['name', 'phone', 'q1']);
    const filled = { ...person!, name: 'Ravi Kumar', phone: '+91 98765 43210', answers: { q1: 'L' } };
    expect(personErrors(filled, questions)).toEqual({});
    expect(toHolders([filled], questions)).toEqual([{ tierId: 'gen', name: 'Ravi Kumar', phone: '9876543210', answers: [{ id: 'q1', answer: 'L' }] }]);
  });
});

describe('the event form', () => {
  const now = Date.parse('2026-11-14T06:00:00.000Z');

  it('checks each step', () => {
    const draft = emptyDraft();
    expect(draftErrors(draft, 'basics', RULES, now)).toEqual({ title: 'At least 3 letters' });
    expect(Object.keys(draftErrors(draft, 'when', RULES, now)).sort()).toEqual(['address', 'city', 'endDay', 'startDay', 'venueName']);
    expect(Object.keys(draftErrors(draft, 'tickets', RULES, now)).sort()).toEqual(['tier0.capacity', 'tier0.price']);

    const set = { ...draft, startDay: '2026-11-20', endDay: '2026-11-20', startTime: '22:00', endTime: '21:00', online: true, link: 'https://meet.example.com/x' };
    expect(draftErrors(set, 'when', RULES, now)).toEqual({ endTime: 'It must end after it starts' });
    expect(draftErrors({ ...set, endDay: '2026-12-20' }, 'when', RULES, now)).toEqual({ endDay: 'Events run for up to 14 days' });
  });

  it('won’t let capacity go below what is booked or names repeat', () => {
    const draft = {
      ...emptyDraft(),
      tiers: [
        { id: 't1', name: 'General', price: '500', capacity: '10', taken: 12 },
        { name: 'general', price: '0', capacity: '5', taken: 0 },
      ],
    };
    expect(draftErrors(draft, 'tickets', RULES, now)).toEqual({ 'tier0.capacity': '12 already booked', 'tier1.name': 'Each ticket type needs its own name' });
  });

  it('turns the form into what the API takes', () => {
    const draft = {
      ...emptyDraft('sports'),
      title: ' Weekend Cup ',
      venueName: 'Gachibowli Stadium',
      address: 'Gachibowli, near the flyover',
      city: 'Hyderabad',
      startDay: '2026-11-20',
      endDay: '2026-11-21',
      team: true,
      teamMin: '7',
      teamMax: '11',
      tiers: [{ id: 't1', name: 'Team entry', price: '2500', capacity: '16', taken: 0 }],
      questions: [{ label: 'Jersey number', required: false }],
    };
    expect(toEventInput(draft)).toEqual({
      title: 'Weekend Cup',
      description: null,
      kind: 'sports',
      venue: { name: 'Gachibowli Stadium', address: 'Gachibowli, near the flyover', city: 'Hyderabad' },
      online: null,
      startsAt: '2026-11-20T13:30:00.000Z',
      endsAt: '2026-11-21T16:30:00.000Z',
      team: { min: 7, max: 11 },
      tiers: [{ id: 't1', name: 'Team entry', price: 250_000, capacity: 16 }],
      questions: [{ label: 'Jersey number', required: false }],
      refunds: 'standard',
    });
  });
});
