import { Session } from 'next-auth';

// Super admin email - hardcoded for now, but could be loaded from env in a production setting
const SUPER_ADMIN_EMAIL = 'karthickrajans.21cse@kongu.edu';

/**
 * Checks if the current user session belongs to the super admin
 */
export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.email === SUPER_ADMIN_EMAIL;
}

/**
 * Checks if the current user session has instructor role
 */
export function isInstructor(session: Session | null): boolean {
  return session?.user && 'role' in session.user && session.user.role === 'instructor';
}

/**
 * Checks if the current user session has admin role
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user && 'role' in session.user && session.user.role === 'admin';
}

/**
 * Checks if the current user has instructor privileges (either an instructor or super admin)
 */
export function hasInstructorPrivileges(session: Session | null): boolean {
  return isInstructor(session) || isSuperAdmin(session);
}

/**
 * Checks if the current user has admin privileges (either an admin or super admin)
 */
export function hasAdminPrivileges(session: Session | null): boolean {
  return isAdmin(session) || isSuperAdmin(session);
} 