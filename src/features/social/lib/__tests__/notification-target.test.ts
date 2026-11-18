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

  it('opens the ground, the booking, or the ground’s board for its owner and staff', () => {
    expect(notificationHref({ groundId: 'g1' })).toEqual({ pathname: '/(customer)/turf/[id]', params: { id: 'g1' } });
    expect(notificationHref({ turfOrderId: 'o5' })).toEqual({ pathname: '/(customer)/turf/booking/[id]', params: { id: 'o5' } });
    expect(notificationHref({ deskGroundId: 'g2' })).toEqual({ pathname: '/(customer)/ground-desk/[id]', params: { id: 'g2' } });
  });

  it('opens the PG or hostel, the reservation, or the property’s bed map for its owner and wardens', () => {
    expect(notificationHref(notificationLink('stay_property', 'p1'))).toEqual({ pathname: '/(customer)/stays/[id]', params: { id: 'p1' } });
    expect(notificationHref(notificationLink('stay_order', 'r1'))).toEqual({ pathname: '/(customer)/stays/order/[id]', params: { id: 'r1' } });
    expect(notificationHref(notificationLink('vendor_property', 'p2'))).toEqual({ pathname: '/(customer)/stays-desk/[id]', params: { id: 'p2' } });
  });

  it('opens a screen for every events, coaching, turf and stays link the API sends', () => {
    const screens = [
      'event',
      'event_order',
      'vendor_event',
      'coaching_course',
      'coaching_order',
      'vendor_course',
      'coaching_batch',
      'turf_ground',
      'turf_order',
      'vendor_ground',
      'stay_property',
      'stay_order',
      'vendor_property',
    ];
    for (const screen of screens) {
      expect(notificationHref(notificationLink(screen, 'x1'))).toMatchObject({ params: { id: 'x1' } });
    }
  });

  it('opens something for every link screen the API can send', () => {
    const screens = [
      'post',
      'verification',
      'business',
      'order',
      'shop_order',
      'profile',
      'payments',
      'work',
      'team',
      'work_order',
      'reviews',
      'work_reviews',
      'delivery_job',
      'delivery_earnings',
      'support',
      'event',
      'event_order',
      'vendor_event',
      'coaching_course',
      'coaching_order',
      'vendor_course',
      'coaching_batch',
      'turf_ground',
      'turf_order',
      'vendor_ground',
      'stay_property',
      'stay_order',
      'vendor_property',
      'store',
      'store_product',
      'store_order',
      'vendor_store_order',
      'gig',
      'gig_order',
      'vendor_gig_order',
      'freelance',
      'freelance_payments',
    ];
    for (const screen of screens) expect(notificationHref(notificationLink(screen, 'x1'))).toBeDefined();
  });

  it('opens Payments in Freelancing for a freelancer’s withdrawal, and the vendor portal’s Payments for a vendor’s', () => {
    expect(notificationHref(notificationLink('freelance_payments', 'p1'))).toBe('/(customer)/freelance/payments');
    expect(notificationHref(notificationLink('payments', 'p2'))).toBe('/(vendor)/(tabs)/payments');
  });

  it('opens the Freelancing home when your freelancing is held or back, and the business for any other hold', () => {
    expect(notificationHref(notificationLink('freelance', 'b1'))).toBe('/(customer)/freelance');
    expect(notificationHref(notificationLink('business', 'b2'))).toEqual({ pathname: '/(vendor)/businesses/[id]', params: { id: 'b2' } });
  });

  it('opens the local shop, its product, your order, or the order on the shop desk', () => {
    expect(notificationHref(notificationLink('store', 's1'))).toEqual({ pathname: '/(customer)/store/[id]', params: { id: 's1' } });
    expect(notificationHref(notificationLink('store_product', 'x2'))).toEqual({ pathname: '/(customer)/store/product/[id]', params: { id: 'x2' } });
    expect(notificationHref(notificationLink('store_order', 'o6'))).toEqual({ pathname: '/(customer)/store/order/[id]', params: { id: 'o6' } });
    expect(notificationHref(notificationLink('vendor_store_order', 'o7'))).toEqual({ pathname: '/(customer)/store-desk/order/[id]', params: { id: 'o7' } });
  });

  it('opens nothing when it points nowhere', () => {
    expect(notificationHref({})).toBeUndefined();
    expect(notificationHref(notificationLink('gate', 'x1'))).toBeUndefined();
  });
});
