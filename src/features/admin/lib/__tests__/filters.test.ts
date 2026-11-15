import {
  NO_AUDIT_FILTER,
  QUEUE_DEFAULT,
  auditFiltered,
  auditQuery,
  matchesPerson,
  queueFiltered,
  queueQuery,
  shiftDay,
  whenLabel,
  whenRange,
} from '../filters';

/** 15 Nov 2026, 4:52 pm in India. */
const NOW = Date.parse('2026-11-15T11:22:00Z');
/** 15 Nov 2026, 1:30 am in India, while it is still the 14th in UTC. */
const JUST_AFTER_MIDNIGHT = Date.parse('2026-11-14T20:00:00Z');

describe('time filters', () => {
  it('sends nothing for any time', () => {
    expect(whenRange({ kind: 'any' }, NOW)).toEqual({});
  });

  it('counts today and yesterday from India midnight', () => {
    const today = { from: '2026-11-14T18:30:00.000Z', to: '2026-11-15T18:30:00.000Z' };
    expect(whenRange({ kind: 'today' }, NOW)).toEqual(today);
    expect(whenRange({ kind: 'today' }, JUST_AFTER_MIDNIGHT)).toEqual(today);
    expect(whenRange({ kind: 'yesterday' }, NOW)).toEqual({ from: '2026-11-13T18:30:00.000Z', to: '2026-11-14T18:30:00.000Z' });
  });

  it('includes today in the last 7 and 30 days', () => {
    expect(whenRange({ kind: 'last7' }, NOW)).toEqual({ from: '2026-11-08T18:30:00.000Z', to: '2026-11-15T18:30:00.000Z' });
    expect(whenRange({ kind: 'last30' }, NOW)).toEqual({ from: '2026-10-16T18:30:00.000Z', to: '2026-11-15T18:30:00.000Z' });
  });

  it('covers the whole month, across a year end too', () => {
    expect(whenRange({ kind: 'month' }, NOW)).toEqual({ from: '2026-10-31T18:30:00.000Z', to: '2026-11-30T18:30:00.000Z' });
    expect(whenRange({ kind: 'month' }, Date.parse('2026-12-20T06:00:00Z'))).toEqual({ from: '2026-11-30T18:30:00.000Z', to: '2026-12-31T18:30:00.000Z' });
  });

  it('includes both picked days and puts them in order', () => {
    const range = { from: '2026-11-02T18:30:00.000Z', to: '2026-11-10T18:30:00.000Z' };
    expect(whenRange({ kind: 'range', from: '2026-11-03', to: '2026-11-10' }, NOW)).toEqual(range);
    expect(whenRange({ kind: 'range', from: '2026-11-10', to: '2026-11-03' }, NOW)).toEqual(range);
    expect(whenRange({ kind: 'range', from: '2026-11-03', to: '2026-11-03' }, NOW)).toEqual({ from: '2026-11-02T18:30:00.000Z', to: '2026-11-03T18:30:00.000Z' });
  });

  it('shifts day keys across months and leap days', () => {
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('names presets and picked days', () => {
    expect(whenLabel({ kind: 'any' }, NOW)).toBe('Any time');
    expect(whenLabel({ kind: 'last7' }, NOW)).toBe('Last 7 days');
    expect(whenLabel({ kind: 'range', from: '2026-11-10', to: '2026-11-03' }, NOW)).toBe('3 Nov – 10 Nov');
    expect(whenLabel({ kind: 'range', from: '2026-11-03', to: '2026-11-03' }, NOW)).toBe('3 Nov');
    expect(whenLabel({ kind: 'range', from: '2025-12-28', to: '2026-01-03' }, NOW)).toBe('28 Dec 2025 – 3 Jan');
  });
});

describe('audit query', () => {
  it('leaves out what is not set', () => {
    expect(auditQuery(NO_AUDIT_FILTER, NOW)).toEqual({});
    expect(auditFiltered(NO_AUDIT_FILTER)).toBe(false);
  });

  it('sends each choice with the time bounds', () => {
    const choice = { module: 'kyc', action: 'kyc.approve', actor: '64b000000000000000000001', target: 't1', when: { kind: 'today' as const } };
    expect(auditQuery(choice, NOW)).toEqual({
      module: 'kyc',
      action: 'kyc.approve',
      actor: '64b000000000000000000001',
      target: 't1',
      from: '2026-11-14T18:30:00.000Z',
      to: '2026-11-15T18:30:00.000Z',
    });
    expect(auditFiltered({ ...NO_AUDIT_FILTER, when: { kind: 'yesterday' } })).toBe(true);
    expect(auditFiltered({ ...NO_AUDIT_FILTER, actor: 'x' })).toBe(true);
  });
});

describe('help ticket queue query', () => {
  it('always sends the status and nothing else by default', () => {
    expect(queueQuery(QUEUE_DEFAULT)).toEqual({ status: 'open' });
    expect(queueFiltered(QUEUE_DEFAULT)).toBe(false);
  });

  it('adds who has it, the topic and a trimmed ticket number', () => {
    expect(queueQuery({ status: 'waiting', assigned: 'me', topic: 'refunds', q: ' RX-1042 ' })).toEqual({ status: 'waiting', assignee: 'me', category: 'refunds', q: 'RX-1042' });
    expect(queueQuery({ ...QUEUE_DEFAULT, assigned: 'none', q: '   ' })).toEqual({ status: 'open', assignee: 'none' });
    expect(queueFiltered({ ...QUEUE_DEFAULT, q: '   ' })).toBe(false);
    expect(queueFiltered({ ...QUEUE_DEFAULT, status: 'resolved' })).toBe(true);
    expect(queueFiltered({ ...QUEUE_DEFAULT, topic: 'app' })).toBe(true);
  });
});

describe('person match', () => {
  const ravi = { name: 'Ravi Kumar', username: 'ravik' };

  it('matches name or username, ignoring case and a leading @', () => {
    expect(matchesPerson(ravi, '')).toBe(true);
    expect(matchesPerson(ravi, 'kumar')).toBe(true);
    expect(matchesPerson(ravi, '@RAVIK')).toBe(true);
    expect(matchesPerson(ravi, 'venki')).toBe(false);
  });
});
