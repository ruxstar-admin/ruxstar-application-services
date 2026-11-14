import { richText } from '../rich-text';

describe('richText', () => {
  it('finds mentions, not emails, and leaves a trailing dot as text', () => {
    expect(richText('Thanks @Asha.Rao. Mail sam@shop.in or @ab')).toEqual([
      { kind: 'text', text: 'Thanks ' },
      { kind: 'mention', text: '@Asha.Rao', username: 'asha.rao' },
      { kind: 'text', text: '. Mail sam@shop.in or @ab' },
    ]);
  });

  it('finds web links and leaves closing punctuation outside them', () => {
    expect(richText('See (https://ruxstar.com/p/1). Or www.ruxstar.com!')).toEqual([
      { kind: 'text', text: 'See (' },
      { kind: 'link', text: 'https://ruxstar.com/p/1', url: 'https://ruxstar.com/p/1' },
      { kind: 'text', text: '). Or ' },
      { kind: 'link', text: 'www.ruxstar.com', url: 'https://www.ruxstar.com' },
      { kind: 'text', text: '!' },
    ]);
  });

  it('keeps text without either as one part, and an empty text as none', () => {
    expect(richText('Glazed today.\nMore soon')).toEqual([{ kind: 'text', text: 'Glazed today.\nMore soon' }]);
    expect(richText('')).toEqual([]);
    expect(richText('@ravi_k')).toEqual([{ kind: 'mention', text: '@ravi_k', username: 'ravi_k' }]);
  });
});
