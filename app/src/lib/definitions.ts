export const PERMITTED_ROLES = ['noPHI_viewer', 'viewer', 'noPHI_editor', 'admin'] as const;
export type UserRole = typeof PERMITTED_ROLES[number]; 