import { customerTerms, percentOf, vendorTerms } from '../terms';

const terms = { commissionBps: 1000, platformFee: 500, acceptHours: 6, reportHours: 48, filesDays: 30, refundDays: 7, payoutFee: 590, minPayout: 10_000 };

describe('payment terms', () => {
  it('writes the commission as a percent', () => {
    expect(percentOf(1000)).toBe('10%');
    expect(percentOf(1250)).toBe('12.5%');
    expect(percentOf(0)).toBe('0%');
  });

  it("tells the customer the fee and the shop's windows", () => {
    const text = customerTerms(terms).map((t) => t.text);
    expect(text[0]).toBe("You pay the full amount now, including Ruxstar's ₹5 platform fee.");
    expect(text).toContain("The shop has 6 hours to accept. If it doesn't, or turns the order down, you get all of it back.");
    expect(text.some((t) => t.includes('48 hours to report'))).toBe(true);
  });

  it('leaves the fee out when Ruxstar charges none', () => {
    expect(customerTerms({ ...terms, platformFee: 0 })[0]!.text).toBe('You pay the full amount now.');
    expect(vendorTerms({ ...terms, platformFee: 0 }).some((t) => t.text.includes('platform fee'))).toBe(false);
  });

  it("tells the vendor the commission, payout rules and Ruxstar's current numbers", () => {
    const text = vendorTerms(terms).map((t) => t.text);
    expect(text[0]).toContain('Ruxstar keeps 10%');
    expect(text).toContain('You can withdraw once ₹100 is available. Each withdrawal costs ₹5.90.');
  });
});
