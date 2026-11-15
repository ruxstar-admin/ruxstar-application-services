/** Up to this many children on one account. */
export const MAX_CHILDREN = 10;

/** What's wrong with a child's name or year of birth, by field. */
export function childErrors(name: string, year: string, thisYear: number): { name?: string; birthYear?: string } {
  const errors: { name?: string; birthYear?: string } = {};
  const clean = name.trim();
  if (clean.length < 2) errors.name = 'At least 2 letters';
  else if (clean.length > 60) errors.name = 'Up to 60 letters';
  if (year.trim()) {
    const n = Number(year);
    if (!/^\d{4}$/.test(year.trim()) || n < 1990 || n > Math.min(2030, thisYear)) errors.birthYear = `A year from 1990 to ${Math.min(2030, thisYear)}`;
  }
  return errors;
}

/** "Born 2014 · 2 classes" */
export function childLine(child: { birthYear: number | null; enrolments: number }): string {
  const parts = [child.birthYear ? `Born ${child.birthYear}` : null, child.enrolments ? `${child.enrolments} ${child.enrolments === 1 ? 'class' : 'classes'}` : 'Not enrolled yet'];
  return parts.filter(Boolean).join(' · ');
}
