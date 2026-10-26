import { redact } from '../redact';

describe('redact', () => {
  it('hides credentials and identity numbers, including nested ones', () => {
    expect(
      redact({
        mobile: '9876543210',
        password: 'secret',
        signupToken: 'abc',
        kyc: { aadhaar: '1234', panNumber: 'ABCDE1234F', accountNumber: '111', ifsc: 'HDFC0001234' },
        list: [{ otp: '123456' }],
      }),
    ).toEqual({
      mobile: '[redacted]',
      password: '[redacted]',
      signupToken: '[redacted]',
      kyc: { aadhaar: '[redacted]', panNumber: '[redacted]', accountNumber: '[redacted]', ifsc: '[redacted]' },
      list: [{ otp: '[redacted]' }],
    });
  });

  it('leaves unrelated keys alone, including ones that merely contain "pan"', () => {
    expect(redact({ spans: [1], company: 'x', status: 200, ms: 12 })).toEqual({
      spans: [1],
      company: 'x',
      status: 200,
      ms: 12,
    });
  });
});
