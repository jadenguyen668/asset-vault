export const NAMING_CATEGORIES = ['ANM', 'VFX', 'UIX', 'CHR', 'ENV', 'ICO', 'CUT', 'PRP'] as const;
export const NAMING_LOCATIONS = ['LOB', 'ING', 'CUT', 'MNU', 'DLG', 'MAP', 'BTL', 'SHP'] as const;
export type NamingCategory = typeof NAMING_CATEGORIES[number];
export type NamingLocation = typeof NAMING_LOCATIONS[number];

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'under-review', label: 'Under Review', color: '#f59e0b' },
  { value: 'in-review', label: 'In Review', color: '#3b82f6' },
  { value: 'approved', label: 'Approved', color: '#34d399' },
  { value: 'rejected', label: 'Rejected', color: '#f87171' },
  { value: 'needs-revision', label: 'Needs Revision', color: '#fb923c' },
  { value: 'redo', label: 'Redo', color: '#ef4444' },
] as const;
