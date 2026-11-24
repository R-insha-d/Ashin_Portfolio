import { profile } from '@/content/profile';

/**
 * Sorts project category names by portfolio.json "projectCategoryOrder". Categories that are not
 * listed keep their first-appearance order after the listed ones. Safe for client components.
 */
export function sortCategories(names: readonly string[]): string[] {
  const order = profile.projectCategoryOrder;
  const rank = (c: string) => {
    const i = order.indexOf(c);
    return i === -1 ? order.length : i;
  };
  return [...names].sort((a, b) => rank(a) - rank(b));
}
