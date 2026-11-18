import { money, paiseOf, rupeesText } from '@/features/vendor/lib/pod';
import type { FreelancerInput, FreelancerProfileFields, GigInput, GigTier, GigsRules, MyGig, QuoteInput } from '@/types/gigs';
import { TIERS, TIER_LABEL } from './gigs';

type Errors = Record<string, string>;
type Limits = Pick<GigsRules, 'minPrice' | 'maxPrice' | 'minDays' | 'maxDays' | 'maxRevisions'>;

const length = (text: string, min: number, max: number, what: string): string | undefined => {
  const n = text.trim().length;
  if (n < min) return min === 1 ? `Add ${what}.` : `${what[0]!.toUpperCase()}${what.slice(1)} needs at least ${min} characters.`;
  if (n > max) return `Keep it to ${max} characters.`;
  return undefined;
};

const wholeNumber = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

/** "Logo design, branding , logo design" → ["Logo design", "branding"]: trimmed, no repeats ignoring case. */
export function splitList(text: string): string[] {
  const seen = new Map<string, string>();
  for (const raw of text.split(',')) {
    const item = raw.trim().replace(/\s+/g, ' ');
    if (item && !seen.has(item.toLowerCase())) seen.set(item.toLowerCase(), item);
  }
  return [...seen.values()];
}

/** What a package or offer costs, its days and revisions, checked against Ruxstar's limits. */
function termsErrors(t: { price: string; deliveryDays: string; revisions: string }, rules: Limits, prefix: string): Errors {
  const errors: Errors = {};
  const price = paiseOf(t.price);
  if (price === null || price < rules.minPrice || price > rules.maxPrice) errors[`${prefix}price`] = `From ${money(rules.minPrice)} to ${money(rules.maxPrice)}.`;
  const days = wholeNumber(t.deliveryDays);
  if (days === null || days < rules.minDays || days > rules.maxDays) errors[`${prefix}deliveryDays`] = `${rules.minDays} to ${rules.maxDays} days.`;
  const revisions = wholeNumber(t.revisions);
  if (revisions === null || revisions > rules.maxRevisions) errors[`${prefix}revisions`] = rules.maxRevisions ? `0 to ${rules.maxRevisions}.` : 'Revisions are off for now: use 0.';
  return errors;
}

// The freelancer profile.

export interface ProfileDraft {
  name: string;
  headline: string;
  bio: string;
  category: string;
  skills: string;
  languages: string;
  city: string;
}

export const emptyProfile = (name: string, category: string): ProfileDraft => ({ name, headline: '', bio: '', category, skills: '', languages: 'English', city: '' });

export const profileDraftOf = (p: FreelancerProfileFields): ProfileDraft => ({
  name: p.name,
  headline: p.headline,
  bio: p.bio ?? '',
  category: p.category,
  skills: p.skills.join(', '),
  languages: p.languages.join(', '),
  city: p.city ?? '',
});

export function profileErrors(d: ProfileDraft): Errors {
  const errors: Errors = {};
  const name = length(d.name, 2, 60, 'your name');
  if (name) errors.name = name;
  const headline = length(d.headline, 5, 80, 'a headline');
  if (headline) errors.headline = headline;
  if (d.bio.trim().length > 500) errors.bio = 'Keep it to 500 characters.';
  if (!d.category) errors.category = 'Pick what you do.';
  const skills = splitList(d.skills);
  if (skills.length > 15) errors.skills = 'Up to 15 skills.';
  else if (skills.some((s) => s.length < 2 || s.length > 30)) errors.skills = 'Each skill is 2 to 30 characters.';
  const languages = splitList(d.languages);
  if (!languages.length) errors.languages = 'Add at least one language.';
  else if (languages.length > 8) errors.languages = 'Up to 8 languages.';
  else if (languages.some((s) => s.length < 2 || s.length > 30)) errors.languages = 'Each language is 2 to 30 characters.';
  if (d.city.trim() && (d.city.trim().length < 2 || d.city.trim().length > 60)) errors.city = 'Use 2 to 60 characters, or leave it empty.';
  return errors;
}

export const toProfileInput = (d: ProfileDraft): FreelancerInput => ({
  name: d.name.trim(),
  headline: d.headline.trim(),
  bio: d.bio.trim() || null,
  category: d.category,
  skills: splitList(d.skills),
  languages: splitList(d.languages),
  city: d.city.trim() || null,
});

/** Only what changed, for PATCH /v1/gigs/me; empty when nothing did. */
export function profileChanges(d: ProfileDraft, before: FreelancerProfileFields): Partial<FreelancerInput> {
  const next = toProfileInput(d);
  const changes: Partial<FreelancerInput> = {};
  if (next.name !== before.name) changes.name = next.name;
  if (next.headline !== before.headline) changes.headline = next.headline;
  if (next.bio !== before.bio) changes.bio = next.bio;
  if (next.category !== before.category) changes.category = next.category;
  if (next.skills.join('\n') !== before.skills.join('\n')) changes.skills = next.skills;
  if (next.languages.join('\n') !== before.languages.join('\n')) changes.languages = next.languages;
  if (next.city !== before.city) changes.city = next.city;
  return changes;
}

export function linkErrors(title: string, url: string): Errors {
  const errors: Errors = {};
  const t = length(title, 2, 80, 'a title');
  if (t) errors.title = t;
  if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) errors.url = 'Paste a full link starting with https://';
  else if (url.trim().length > 500) errors.url = 'That link is too long.';
  return errors;
}

// Gigs.

export interface PackageDraft {
  tier: GigTier;
  name: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
}

export interface QuestionDraft {
  key: string;
  text: string;
  required: boolean;
}

export interface GigDraft {
  title: string;
  category: string;
  description: string;
  packages: PackageDraft[];
  questions: QuestionDraft[];
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const emptyPackage = (tier: GigTier, rules: Limits): PackageDraft => ({
  tier,
  name: '',
  description: '',
  price: '',
  deliveryDays: String(clamp(3, rules.minDays, rules.maxDays)),
  revisions: String(clamp(1, 0, rules.maxRevisions)),
});

export const emptyGig = (category: string, rules: Limits): GigDraft => ({ title: '', category, description: '', packages: [emptyPackage('basic', rules)], questions: [] });

let questionKeys = 0;
export const newQuestion = (): QuestionDraft => ({ key: `q${(questionKeys += 1)}`, text: '', required: true });

export const gigDraftOf = (g: Pick<MyGig, 'title' | 'category' | 'description' | 'packages' | 'questions'>): GigDraft => ({
  title: g.title,
  category: g.category,
  description: g.description,
  packages: g.packages.map((p) => ({
    tier: p.tier,
    name: p.name === TIER_LABEL[p.tier] ? '' : p.name,
    description: p.description,
    price: rupeesText(p.price),
    deliveryDays: String(p.deliveryDays),
    revisions: String(p.revisions),
  })),
  questions: g.questions.map((q) => ({ key: q.id, text: q.text, required: q.required })),
});

/** The next tier, while Ruxstar allows more packages. */
export const nextTier = (d: Pick<GigDraft, 'packages'>, maxPackages: number): GigTier | null =>
  d.packages.length < Math.min(maxPackages, TIERS.length) ? TIERS[d.packages.length]! : null;

export function gigErrors(d: GigDraft, rules: Limits & Pick<GigsRules, 'maxPackages'>): Errors {
  const errors: Errors = {};
  const title = length(d.title, 10, 80, 'the title');
  if (title) errors.title = title;
  if (!d.category) errors.category = 'Pick a category.';
  const description = length(d.description, 30, 3000, 'the description');
  if (description) errors.description = description;
  if (!d.packages.length) errors.packages = 'Add a package.';
  if (d.packages.length > rules.maxPackages) errors.packages = `Up to ${rules.maxPackages} package${rules.maxPackages === 1 ? '' : 's'}.`;
  d.packages.forEach((p) => {
    const prefix = `${p.tier}.`;
    if (p.name.trim() && (p.name.trim().length < 2 || p.name.trim().length > 40)) errors[`${prefix}name`] = 'Use 2 to 40 characters, or leave it empty.';
    const what = length(p.description, 10, 600, 'what’s included');
    if (what) errors[`${prefix}description`] = what;
    Object.assign(errors, termsErrors(p, rules, prefix));
  });
  d.questions.forEach((q) => {
    const text = length(q.text, 3, 200, 'the question');
    if (text) errors[`q.${q.key}`] = text;
  });
  return errors;
}

/** Which step of the gig editor holds the first problem, so the editor can go back to it. */
export function stepOfError(errors: Errors): 'about' | 'packages' | 'questions' | null {
  const keys = Object.keys(errors);
  if (keys.some((k) => k === 'title' || k === 'category' || k === 'description')) return 'about';
  if (keys.some((k) => k === 'packages' || TIERS.some((t) => k.startsWith(`${t}.`)))) return 'packages';
  if (keys.some((k) => k.startsWith('q.'))) return 'questions';
  return null;
}

export const toGigInput = (d: GigDraft): GigInput => ({
  title: d.title.trim(),
  category: d.category,
  description: d.description.trim(),
  packages: d.packages.map((p) => ({
    tier: p.tier,
    ...(p.name.trim() ? { name: p.name.trim() } : {}),
    description: p.description.trim(),
    price: paiseOf(p.price) ?? 0,
    deliveryDays: Number(p.deliveryDays),
    revisions: Number(p.revisions),
  })),
  questions: d.questions.map((q) => ({ text: q.text.trim(), required: q.required })),
});

// Custom offers.

export interface QuoteDraft {
  title: string;
  description: string;
  category: string;
  price: string;
  deliveryDays: string;
  revisions: string;
}

export function emptyQuote(category: string, rules: Limits): QuoteDraft {
  const { deliveryDays, revisions } = emptyPackage('basic', rules);
  return { title: '', description: '', category, price: '', deliveryDays, revisions };
}

export function quoteErrors(d: QuoteDraft, rules: Limits): Errors {
  const errors: Errors = {};
  const title = length(d.title, 3, 80, 'a title');
  if (title) errors.title = title;
  const description = length(d.description, 10, 1200, 'what’s included');
  if (description) errors.description = description;
  if (!d.category) errors.category = 'Pick a category.';
  return { ...errors, ...termsErrors(d, rules, '') };
}

export const toQuoteInput = (d: QuoteDraft): QuoteInput => ({
  title: d.title.trim(),
  description: d.description.trim(),
  category: d.category,
  price: paiseOf(d.price) ?? 0,
  deliveryDays: Number(d.deliveryDays),
  revisions: Number(d.revisions),
});

// Delivering.

/** Links typed one per line or with spaces between them. */
export const linesOf = (text: string) => [...new Set(text.split(/\s+/).map((l) => l.trim()).filter(Boolean))];

export function deliveryErrors(message: string, links: readonly string[], maxLinks: number): Errors {
  const errors: Errors = {};
  if (!message.trim()) errors.message = 'Tell the customer what you’re sending.';
  else if (message.trim().length > 2000) errors.message = 'Keep it to 2000 characters.';
  if (links.length > maxLinks) errors.links = `Up to ${maxLinks} link${maxLinks === 1 ? '' : 's'}.`;
  else if (links.some((l) => !/^https?:\/\/\S+\.\S+/.test(l) || l.length > 500)) errors.links = 'Each link starts with https://';
  return errors;
}
