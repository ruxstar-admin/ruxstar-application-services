import { notificationHref } from '../notification-target';

describe('notificationHref', () => {
  it('opens the post, profile, order or verification it is about', () => {
    expect(notificationHref({ postId: 'p1' })).toEqual({ pathname: '/(customer)/post/[id]', params: { id: 'p1' } });
    expect(notificationHref({ profileId: 'u1' })).toEqual({ pathname: '/(customer)/user/[id]', params: { id: 'u1' } });
    expect(notificationHref({ shopOrderId: 'o1' })).toEqual({ pathname: '/(vendor)/sale/[id]', params: { id: 'o1' } });
    expect(notificationHref({ verification: true })).toBe('/(customer)/settings/verification');
    expect(notificationHref({ payments: true })).toBe('/(vendor)/(tabs)/payments');
  });

  it('opens Work for team invites and the team for its owner', () => {
    expect(notificationHref({ workId: 'e1' })).toEqual({ pathname: '/(customer)/work/[id]', params: { id: 'e1' } });
    expect(notificationHref({ teamBusinessId: 'b1' })).toEqual({ pathname: '/(vendor)/businesses/[id]/team', params: { id: 'b1' } });
    expect(notificationHref({ workOrderId: 'o2' })).toEqual({ pathname: '/(customer)/work/order/[id]', params: { id: 'o2' } });
  });

  it('opens nothing when it points nowhere', () => {
    expect(notificationHref({})).toBeUndefined();
  });
});
