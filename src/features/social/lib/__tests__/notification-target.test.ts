import { notificationHref, notificationLink } from '../notification-target';

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

  it("opens a shop's reviews for its owner, and in Work for its team", () => {
    expect(notificationHref({ reviewsBusinessId: 'b2' })).toEqual({ pathname: '/(vendor)/businesses/[id]/reviews', params: { id: 'b2' } });
    expect(notificationHref({ workReviewsId: 'e2' })).toEqual({ pathname: '/(customer)/work/reviews/[id]', params: { id: 'e2' } });
  });

  it('opens Delivery verification for delivery partner decisions and delivery news', () => {
    expect(notificationHref({ deliveryVerification: true })).toBe('/(customer)/settings/delivery');
  });

  it('opens the help ticket Ruxstar replied to', () => {
    expect(notificationHref({ supportTicketId: 't1' })).toEqual({ pathname: '/(customer)/support/[id]', params: { id: 't1' } });
  });

  it('opens the course, the enrolment, the course in the vendor portal or the batch for its coaches', () => {
    expect(notificationHref({ courseId: 'c1' })).toEqual({ pathname: '/(customer)/coaching/[id]', params: { id: 'c1' } });
    expect(notificationHref({ coachingOrderId: 'o3' })).toEqual({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: 'o3' } });
    expect(notificationHref({ vendorCourseId: 'c2' })).toEqual({ pathname: '/(vendor)/courses/[id]', params: { id: 'c2' } });
    expect(notificationHref({ batchId: 'b3' })).toEqual({ pathname: '/(customer)/teach/batch/[id]', params: { id: 'b3' } });
  });

  it('opens the event, the tickets, or the event in the vendor portal', () => {
    expect(notificationHref({ eventId: 'e3' })).toEqual({ pathname: '/(customer)/events/[id]', params: { id: 'e3' } });
    expect(notificationHref({ eventOrderId: 'o4' })).toEqual({ pathname: '/(customer)/events/ticket/[id]', params: { id: 'o4' } });
    expect(notificationHref({ vendorEventId: 'e4' })).toEqual({ pathname: '/(vendor)/events/[id]', params: { id: 'e4' } });
  });

  it('opens a screen for every events and coaching link the API sends', () => {
    for (const screen of ['event', 'event_order', 'vendor_event', 'coaching_course', 'coaching_order', 'vendor_course', 'coaching_batch']) {
      expect(notificationHref(notificationLink(screen, 'x1'))).toMatchObject({ params: { id: 'x1' } });
    }
  });

  it('opens nothing when it points nowhere', () => {
    expect(notificationHref({})).toBeUndefined();
    expect(notificationHref(notificationLink('gate', 'x1'))).toBeUndefined();
  });
});
