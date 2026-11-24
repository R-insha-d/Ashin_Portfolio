import { profile, type EducationEntry, type Role, type Tool, type ToolId, type YearSpan } from '@/content/profile';

export const SEPARATOR = ' · ';
const TOOL_BY_ID = new Map(profile.tools.map((t) => [t.id, t] as const));
/** A tool id that is not in portfolio.json "tools" still renders (as its id) instead of crashing the page. */
export function getTool(id: ToolId): Tool {
  const t = TOOL_BY_ID.get(id);
  if (t) return t;
  if (process.env.NODE_ENV !== 'production') console.warn(`[portfolio.json] unknown tool id "${id}": add it to "tools".`);
  return { id, name: id, shortName: id, vendor: '', extensions: [] };
}
export function toolNames(ids: readonly ToolId[], form: 'short' | 'full' = 'short'): string[] {
  return ids.map((id) => (form === 'short' ? getTool(id).shortName : getTool(id).name));
}
export function formatYearSpan(s: YearSpan): string { return s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`; }
export function speakYearSpan(s: YearSpan): string {
  return s.from === s.to ? `${s.from}` : `${s.from} ${profile.copy.a11y.yearRangeJoiner} ${s.to}`;
}

export type DatedRole = Role & { readonly dates: YearSpan };
export const DATED_ROLES: readonly DatedRole[] = profile.roles.filter((r): r is DatedRole => r.dates !== null);
export const BIN_ROLES: readonly Role[] = profile.roles.filter((r) => r.dates === null);
export const LATEST_ROLE: Role = profile.roles[0];
export const DIPLOMA: EducationEntry = profile.education.find((e) => e.featured) ?? profile.education[0];

/** The career ruler: first dated year to last (2022–2026 with the CV data). */
export const RULER: YearSpan = {
  from: Math.min(DIPLOMA.dates.from, ...DATED_ROLES.map((r) => r.dates.from)),
  to: Math.max(DIPLOMA.dates.to, profile.highlight.year, ...DATED_ROLES.map((r) => r.dates.to)),
};
export const RULER_YEARS: readonly number[] = Array.from({ length: RULER.to - RULER.from + 1 }, (_, i) => RULER.from + i);
/** Education mini-scale (2015–2024). */
export const EDUCATION_SCALE: YearSpan = {
  from: Math.min(...profile.education.map((e) => e.dates.from)),
  to: Math.max(...profile.education.map((e) => e.dates.to)),
};

/**
 * THE span rule, used by every ruler on the site: a span runs from the START of its first year
 * to the END of its last year. Duration is never geometry; it is a text label.
 * Returns 1-based grid lines relative to the first year column of `ruler`.
 */
export function spanToGridLines(span: YearSpan, ruler: YearSpan = RULER): { start: number; end: number } {
  return { start: span.from - ruler.from + 1, end: span.to - ruler.from + 2 };
}
export function spanToFraction(span: YearSpan, ruler: YearSpan): { left: number; width: number } {
  const total = ruler.to - ruler.from + 1;
  return { left: (span.from - ruler.from) / total, width: (span.to - span.from + 1) / total };
}

/** Dev-time data checks for the timeline (log loudly, never throw). */
export function checkTimelineHonesty(): string[] {
  const problems: string[] = [];
  if (DATED_ROLES.some((r) => r.dates.from > r.dates.to)) problems.push('A role has "from" later than "to"');
  if (profile.education.some((e) => e.dates.from > e.dates.to)) problems.push('An education entry has "from" later than "to"');
  if (!profile.roles.some((r) => r.id === profile.highlight.roleId)) problems.push('highlight.roleId does not match any role id');
  return problems;
}
