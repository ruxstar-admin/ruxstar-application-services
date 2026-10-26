import {
  digitsOnly,
  endingIn,
  formatAadhaar,
  isValidAadhaar,
  isValidAccountNumber,
  isValidBusinessId,
  isValidDrivingLicence,
  isValidIfsc,
  upperAlnum,
} from '../validators';

describe('kyc validators', () => {
  it('accepts a 12-digit Aadhaar not starting with 0 or 1', () => {
    expect(isValidAadhaar('234567890123')).toBe(true);
    expect(isValidAadhaar('123456789012')).toBe(false);
    expect(isValidAadhaar('23456789012')).toBe(false);
  });

  it('validates IFSC and account numbers', () => {
    expect(isValidIfsc('HDFC0001234')).toBe(true);
    expect(isValidIfsc('HDFC1001234')).toBe(false);
    expect(isValidAccountNumber('123456789')).toBe(true);
    expect(isValidAccountNumber('12345678')).toBe(false);
  });

  it('accepts a GST number or a plausible shop licence', () => {
    expect(isValidBusinessId('29ABCDE1234F1Z5')).toBe(true);
    expect(isValidBusinessId('SHOP/2024/118')).toBe(true);
    expect(isValidBusinessId('ab')).toBe(false);
  });

  it('accepts driving licence numbers with or without separators', () => {
    expect(isValidDrivingLicence('KA0120190012345')).toBe(true);
    expect(isValidDrivingLicence('KA01-20190012345')).toBe(true);
    expect(isValidDrivingLicence('1234')).toBe(false);
  });

  it('cleans and formats typed input', () => {
    expect(digitsOnly('12ab34', 12)).toBe('1234');
    expect(upperAlnum('hdfc 0001234', 11)).toBe('HDFC0001234');
    expect(formatAadhaar('234567890123')).toBe('2345 6789 0123');
    expect(endingIn('234567890123')).toBe('ending 0123');
  });
});
