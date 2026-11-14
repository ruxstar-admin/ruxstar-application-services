import { cleanPhone, isSameAsMe, personErrors } from '../people';

const person = (name: string, phone: string, answers: Record<string, string> = {}) => ({ key: 'p', name, phone, answers });
const questions = [
  { id: 'size', label: 'T-shirt size', required: true },
  { id: 'note', label: 'Anything else', required: false },
];

describe('personErrors', () => {
  it('asks for a name, a mobile and required answers', () => {
    expect(personErrors(person('', '123'), questions)).toEqual({ name: 'Add their name as on an ID', phone: 'A 10-digit mobile number', size: 'Needed' });
    expect(personErrors(person('Ravi Kumar', '+91 98765 43210', { size: 'M' }), questions)).toEqual({});
  });

  it('skips the mobile for cards without one', () => {
    expect(personErrors(person('Anu', ''), [], { phone: false })).toEqual({});
  });
});

describe('cleanPhone', () => {
  it('drops +91, a leading 0 and spaces', () => {
    expect(cleanPhone('+91 98765 43210')).toBe('9876543210');
    expect(cleanPhone('09876543210')).toBe('9876543210');
  });
});

describe('isSameAsMe', () => {
  const me = { name: 'Ravi Kumar', mobile: '9876543210' };
  it('matches the signed-in person’s own name and number', () => {
    expect(isSameAsMe(person('Ravi Kumar ', '+91 98765 43210'), me)).toBe(true);
    expect(isSameAsMe(person('Ravi', '9876543210'), me)).toBe(false);
    expect(isSameAsMe(person('', ''), { name: null, mobile: null })).toBe(false);
  });
});
