import { openableUrl } from '../open-link';

describe('openableUrl', () => {
  it('opens web pages, calls, mail and maps', () => {
    expect(openableUrl('https://meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
    expect(openableUrl('  http://example.com/x  ')).toBe('http://example.com/x');
    expect(openableUrl('HTTPS://ZOOM.US/j/1')).toBe('HTTPS://ZOOM.US/j/1');
    expect(openableUrl('tel:+919999999999')).toBe('tel:+919999999999');
    expect(openableUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(openableUrl('geo:12.97,77.59')).toBe('geo:12.97,77.59');
  });

  it('refuses other schemes and broken links', () => {
    for (const url of [
      'javascript:alert(1)',
      'intent://scan/#Intent;scheme=zxing;end',
      'ruxstar://payments/withdraw',
      'file:///data/data/x',
      'sms:123',
      'https://',
      'https:///path',
      'tel:',
      'meet.google.com/abc',
      '',
      '   ',
      null,
      undefined,
    ]) {
      expect(openableUrl(url)).toBeNull();
    }
  });
});
