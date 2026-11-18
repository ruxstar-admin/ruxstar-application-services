import { categoriesChanged, categoriesProblem, categoryKeyOf } from '../gig-categories';

const saved = [
  { key: 'design', label: 'Graphic and logo design', hidden: false },
  { key: 'other', label: 'Anything else', hidden: false },
];

describe('categoryKeyOf', () => {
  it('makes a key from the label', () => {
    expect(categoryKeyOf('Voice overs & dubbing', [])).toBe('voice_overs_dubbing');
    expect(categoryKeyOf('3D models', [])).toBe('d_models');
    expect(categoryKeyOf('!!', [])).toBe('category');
  });
  it('adds a number when the key is taken', () => {
    expect(categoryKeyOf('Design', ['design', 'design_2'])).toBe('design_3');
  });
});

describe('categoriesProblem', () => {
  it('passes a good list', () => {
    expect(categoriesProblem(saved)).toBeNull();
  });
  it('needs names, own keys and one showing', () => {
    expect(categoriesProblem([])).toBe('Add at least one category.');
    expect(categoriesProblem([{ ...saved[0]!, label: ' ' }])).toMatch(/needs a name/);
    expect(categoriesProblem([saved[0]!, saved[0]!])).toBe('Each category needs its own key.');
    expect(categoriesProblem(saved.map((c) => ({ ...c, hidden: true })))).toBe('Keep at least one category showing.');
  });
});

describe('categoriesChanged', () => {
  it('sees renames, hiding and additions but not spaces', () => {
    expect(categoriesChanged(saved.map((c) => ({ ...c, label: `${c.label} ` })), saved)).toBe(false);
    expect(categoriesChanged([{ ...saved[0]!, hidden: true }, saved[1]!], saved)).toBe(true);
    expect(categoriesChanged([...saved, { key: 'music', label: 'Music', hidden: false }], saved)).toBe(true);
  });
});
