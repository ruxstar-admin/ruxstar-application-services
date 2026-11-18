import type { FreelancerProfileFields } from '@/types/gigs';
import {
  deliveryErrors,
  emptyGig,
  emptyPackage,
  emptyQuote,
  gigDraftOf,
  gigErrors,
  linesOf,
  linkErrors,
  nextTier,
  profileChanges,
  profileDraftOf,
  profileErrors,
  quoteErrors,
  splitList,
  stepOfError,
  toGigInput,
  toQuoteInput,
  type GigDraft,
} from '../forms';

const RULES = { minPrice: 10000, maxPrice: 20000000, minDays: 1, maxDays: 60, maxRevisions: 10, maxPackages: 3 };

const profile: FreelancerProfileFields = {
  businessId: 'b1',
  categoryLabel: 'Graphic and logo design',
  avatarUrl: null,
  portfolio: { photos: [], links: [] },
  name: 'Asha Rao',
  headline: 'Logos that people remember',
  bio: null,
  category: 'design',
  skills: ['Logo design', 'Branding'],
  languages: ['English', 'Hindi'],
  city: null,
};

const goodGig = (): GigDraft => ({
  title: 'A clean logo for your shop',
  category: 'design',
  description: 'I design a simple logo that works on signs, cards and screens.',
  packages: [{ tier: 'basic', name: '', description: 'One logo idea', price: '1500', deliveryDays: '3', revisions: '2' }],
  questions: [],
});

describe('splitList', () => {
  it('trims and drops repeats ignoring case', () => {
    expect(splitList('Logo design, branding , logo design,,  Print   work ')).toEqual(['Logo design', 'branding', 'Print work']);
    expect(splitList(' , ')).toEqual([]);
  });
});

describe('profile', () => {
  it('needs a name, a headline and a language', () => {
    const errors = profileErrors({ name: 'A', headline: 'Hi', bio: '', category: '', skills: '', languages: '', city: '' });
    expect(Object.keys(errors).sort()).toEqual(['category', 'headline', 'languages', 'name']);
  });
  it('passes a good profile', () => {
    expect(profileErrors(profileDraftOf(profile))).toEqual({});
  });
  it('sends only what changed', () => {
    const draft = { ...profileDraftOf(profile), city: ' Pune ', skills: 'Logo design, Branding' };
    expect(profileChanges(draft, profile)).toEqual({ city: 'Pune' });
    expect(profileChanges(profileDraftOf(profile), profile)).toEqual({});
  });
  it('checks portfolio links', () => {
    expect(linkErrors('My site', 'https://asha.design')).toEqual({});
    expect(Object.keys(linkErrors('A', 'asha.design'))).toEqual(['title', 'url']);
  });
});

describe('gig', () => {
  it('passes a good gig and turns it into the API body', () => {
    expect(gigErrors(goodGig(), RULES)).toEqual({});
    expect(toGigInput(goodGig())).toEqual({
      title: 'A clean logo for your shop',
      category: 'design',
      description: 'I design a simple logo that works on signs, cards and screens.',
      packages: [{ tier: 'basic', description: 'One logo idea', price: 150000, deliveryDays: 3, revisions: 2 }],
      questions: [],
    });
  });
  it('checks prices, days and revisions against the rules', () => {
    const gig = { ...goodGig(), packages: [{ ...goodGig().packages[0]!, price: '50', deliveryDays: '90', revisions: '11' }] };
    expect(Object.keys(gigErrors(gig, RULES)).sort()).toEqual(['basic.deliveryDays', 'basic.price', 'basic.revisions']);
    expect(gigErrors(gig, { ...RULES, maxRevisions: 0 })['basic.revisions']).toBe('Revisions are off for now: use 0.');
  });
  it('limits packages to the rules', () => {
    const gig = { ...goodGig(), packages: [goodGig().packages[0]!, { ...goodGig().packages[0]!, tier: 'standard' as const }] };
    expect(gigErrors(gig, { ...RULES, maxPackages: 1 }).packages).toBe('Up to 1 package.');
    expect(nextTier(goodGig(), 3)).toBe('standard');
    expect(nextTier(goodGig(), 1)).toBeNull();
  });
  it('finds the step with the first problem', () => {
    expect(stepOfError({ title: 'x' })).toBe('about');
    expect(stepOfError({ 'standard.price': 'x' })).toBe('packages');
    expect(stepOfError({ 'q.q1': 'x' })).toBe('questions');
    expect(stepOfError({})).toBeNull();
  });
  it('starts new packages inside the limits', () => {
    expect(emptyPackage('basic', { ...RULES, minDays: 5, maxRevisions: 0 })).toMatchObject({ deliveryDays: '5', revisions: '0' });
    expect(emptyGig('design', RULES).packages).toHaveLength(1);
  });
  it('reads a saved gig back, leaving the tier name blank', () => {
    const draft = gigDraftOf({
      title: 't',
      category: 'design',
      description: 'd',
      packages: [{ tier: 'basic', name: 'Basic', description: 'x', price: 150050, deliveryDays: 3, revisions: 1 }],
      questions: [{ id: 'q9', text: 'Your shop name?', required: true }],
    });
    expect(draft.packages[0]).toMatchObject({ name: '', price: '1500.50' });
    expect(draft.questions[0]?.key).toBe('q9');
  });
});

describe('custom offers', () => {
  it('needs a title, what is included and fair terms', () => {
    const draft = emptyQuote('design', RULES);
    expect(Object.keys(quoteErrors(draft, RULES)).sort()).toEqual(['description', 'price', 'title']);
    const good = { ...draft, title: 'Logo and cards', description: 'A logo and a business card', price: '2500' };
    expect(quoteErrors(good, RULES)).toEqual({});
    expect(toQuoteInput(good)).toEqual({ title: 'Logo and cards', description: 'A logo and a business card', category: 'design', price: 250000, deliveryDays: 3, revisions: 1 });
  });
});

describe('delivering', () => {
  it('reads links one per line or spaced', () => {
    expect(linesOf(' https://a.com\nhttps://b.com  https://a.com ')).toEqual(['https://a.com', 'https://b.com']);
  });
  it('needs a message and real links', () => {
    expect(deliveryErrors(' ', [], 10).message).toBeDefined();
    expect(deliveryErrors('Here it is', ['ftp://x'], 10).links).toBe('Each link starts with https://');
    expect(deliveryErrors('Here it is', ['https://a.com', 'https://b.com'], 1).links).toBe('Up to 1 link.');
    expect(deliveryErrors('Here it is', ['https://a.com'], 10)).toEqual({});
  });
});
