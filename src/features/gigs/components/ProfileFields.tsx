import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import type { GigCategoryOption } from '@/types/gigs';
import type { ProfileDraft } from '../lib/forms';
import { categoryLabel } from '../lib/gigs';

/** The freelancer profile's fields, for starting out and for editing. Errors show once `errors` has them. */
export function ProfileFields({
  draft,
  set,
  errors,
  categories,
}: {
  draft: ProfileDraft;
  set: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
  errors: Record<string, string | undefined>;
  categories: readonly GigCategoryOption[];
}) {
  return (
    <>
      <InputField label="Name customers see" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={60} error={errors.name} />
      <InputField
        label="Headline"
        value={draft.headline}
        onChangeText={(v) => set('headline', v)}
        maxLength={80}
        placeholder="Like “Logo designer for small brands”"
        error={errors.headline}
      />
      <KeyedSelectField
        label="What you do"
        value={draft.category}
        options={categories}
        onChange={(v) => set('category', v)}
        error={errors.category}
        fallback={(key) => categoryLabel(categories, key)}
      />
      <InputField
        label="About you (optional)"
        value={draft.bio}
        onChangeText={(v) => set('bio', v)}
        multiline
        maxLength={500}
        showCount
        placeholder="Your experience, the kind of work you love, how you work"
        error={errors.bio}
      />
      <InputField
        label="Skills (optional)"
        value={draft.skills}
        onChangeText={(v) => set('skills', v)}
        placeholder="Logo design, Illustrator, branding"
        hint="Separate them with commas."
        error={errors.skills}
      />
      <InputField label="Languages" value={draft.languages} onChangeText={(v) => set('languages', v)} placeholder="English, Hindi" hint="Separate them with commas." error={errors.languages} />
      <InputField label="City (optional)" value={draft.city} onChangeText={(v) => set('city', v)} maxLength={60} placeholder="Where you are" error={errors.city} />
    </>
  );
}
