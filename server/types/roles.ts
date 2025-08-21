export type Role = 'owner' | 'admin' | 'member';

export const OWNER: Role = 'owner';
export const ADMIN: Role = 'admin';
export const MEMBER: Role = 'member';

export const AdminRoles: Role[] = [OWNER, ADMIN];

export function normalizeRole(role?: string | null): Role | undefined {
  if (!role) return undefined;
  const r = role.toString().trim().toLowerCase();
  if (r === OWNER || r === ADMIN || r === MEMBER) return r as Role;
  return undefined;
}
