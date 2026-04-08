export type NormalizedRole = 'fns' | 'jc' | 'sc';

export function normalizeRole(role: string | null | undefined): NormalizedRole | null {
  if (!role) return null;
  const r = String(role).toLowerCase().replace(/[_-]/g, '');
  // Common aliases
  if (r === 'fns' || r === 'fs' || r === 'f_s' || r === 'fnss') {
    return 'fns';
  }
  if (r === 'jc' || r === 'juniorcoordinator' || r === 'jc') {
    return 'jc';
  }
  if (r === 'sc' || r === 'seniorcoordinator' || r === 'sc') {
    return 'sc';
  }
  // Fallback heuristics
  if (r.includes('fn')) return 'fns';
  if (r.includes('jc')) return 'jc';
  if (r.includes('sc')) return 'sc';
  return null;
}
