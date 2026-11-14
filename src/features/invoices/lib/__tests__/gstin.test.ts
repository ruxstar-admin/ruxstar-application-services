import { cleanGstin, gstinCheckChar, gstinError, stateOfGstin, STATE_NAMES } from '../gstin';

describe('gstinError', () => {
  it('accepts a real GSTIN', () => {
    expect(gstinError('27AAPFU0939F1ZV')).toBeUndefined();
  });

  it('explains what is wrong', () => {
    expect(gstinError('27AAPFU0939F1Z')).toMatch(/15 characters/);
    expect(gstinError('27AAPFU0939F1AV')).toMatch(/shape/);
    expect(gstinError('99AAPFU0939F1ZV')).toMatch(/state code/);
    expect(gstinError('27AAPFU0939F1ZA')).toMatch(/last character/);
  });
});

describe('gstin helpers', () => {
  it('computes the check character', () => {
    expect(gstinCheckChar('27AAPFU0939F1Z')).toBe('V');
  });

  it('cleans what was typed', () => {
    expect(cleanGstin(' 27aapfu0939f1zv-extra')).toBe('27AAPFU0939F1ZV');
  });

  it('finds the state from the first two digits', () => {
    expect(stateOfGstin('36AAAAA0000A1Z5')).toBe('Telangana');
    expect(stateOfGstin('00AAAAA0000A1Z5')).toBeNull();
    expect(stateOfGstin(null)).toBeNull();
  });

  it('lists every state once, sorted', () => {
    expect(STATE_NAMES).toHaveLength(36);
    expect(STATE_NAMES[0]).toBe('Andaman and Nicobar Islands');
  });
});
