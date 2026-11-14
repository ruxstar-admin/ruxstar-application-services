import { ApiError } from '@/lib/api-error';
import { contactSupport, holdPassOf, reopenLine, supportErrorText, supportRoutes } from '../support';

const hold = (details: Record<string, unknown>[]) => new ApiError(423, 'This account is on hold.', undefined, 'ACCOUNT_ON_HOLD', details as never);

describe('holdPassOf', () => {
  it('reads the support pass from a login refused for an account on hold', () => {
    const err = hold([{ message: 'Ruxstar put this account on hold.', supportToken: 'pass', expiresAt: '2026-11-14T12:00:00.000Z' }]);
    expect(holdPassOf(err)).toEqual({ token: 'pass', expiresAt: '2026-11-14T12:00:00.000Z', message: 'Ruxstar put this account on hold.' });
  });

  it('is null for other failures, or a hold without a pass', () => {
    expect(holdPassOf(new ApiError(401, 'Wrong password', undefined, 'INVALID_CREDENTIALS'))).toBeNull();
    expect(holdPassOf(hold([{ message: 'x' }]))).toBeNull();
    expect(holdPassOf(new Error('boom'))).toBeNull();
  });
});

describe('support routes', () => {
  it('opens tickets in the app when signed in, and on the hold screens when not', () => {
    expect(supportRoutes(false).ticket('t1')).toEqual({ pathname: '/(customer)/support/[id]', params: { id: 't1' } });
    expect(supportRoutes(true).ticket('t1')).toEqual({ pathname: '/(auth)/hold/[id]', params: { id: 't1' } });
    expect(supportRoutes(true).list).toBe('/(auth)/hold');
  });

  it('fills in the topic and what a Contact support link is about', () => {
    expect(contactSupport('orders', { type: 'order', id: 'o1', label: 'Order #1042' })).toEqual({
      pathname: '/(customer)/support/new',
      params: { category: 'orders', contextType: 'order', contextId: 'o1', contextLabel: 'Order #1042' },
    });
    expect(contactSupport('account')).toEqual({ pathname: '/(customer)/support/new', params: { category: 'account' } });
  });
});

describe('reopenLine', () => {
  it('says until when a solved ticket can be reopened, and that a closed one needs a new ticket', () => {
    expect(reopenLine('resolved', '2026-11-21T10:00:00.000Z')).toMatch(/^Solved\. Reply by 21 Nov/);
    expect(reopenLine('closed', null)).toMatch(/Open a new one/);
    expect(reopenLine('open', null)).toBeNull();
  });
});

describe('supportErrorText', () => {
  it('asks to log in again when a support pass runs out', () => {
    expect(supportErrorText(new ApiError(401, 'Sign in', undefined, 'UNAUTHENTICATED'))).toMatch(/Log in again/);
    expect(supportErrorText(new ApiError(409, 'This ticket is closed.', undefined, 'CONFLICT'))).toBe('This ticket is closed.');
    expect(supportErrorText(ApiError.network())).toMatch(/connection/);
  });
});
