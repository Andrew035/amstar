/**
 * The role hierarchy, as the UI understands it.
 *
 * A mirror of UserRole.java, and only a mirror: the server checks every grant
 * itself. This exists so the roster does not offer a manager a choice that is
 * going to come back a 400 - not as a boundary.
 */
export const ADMIN = "ADMIN";
export const BOOKKEEPER = "BOOKKEEPER";
export const TECHNICIAN = "TECHNICIAN";

const RANK: Record<string, number> = {
  [TECHNICIAN]: 1,
  [BOOKKEEPER]: 2,
  [ADMIN]: 3,
};

export const rank = (role?: string | null): number =>
  role ? (RANK[role] ?? 0) : 0;

/**
 * The roles `actor` may hand out: strictly below their own, never equal.
 *
 * So an owner can appoint a bookkeeper or a technician but not another owner,
 * and a bookkeeper can appoint a technician only. A second owner is a
 * deliberate manual job - the email allowlist plus the documented SQL - so
 * that no single account can multiply its own rank.
 */
export const grantableRoles = (actor?: string | null): string[] =>
  [BOOKKEEPER, TECHNICIAN].filter((role) => rank(role) < rank(actor));

/** Whether `actor` may touch someone who currently holds `target`. */
export const mayManage = (actor?: string | null, target?: string | null): boolean =>
  rank(target) > 0 && rank(target) < rank(actor);

/** "READY_FOR_INVOICE" would need the /_/g treatment; roles are one word today. */
export const roleLabel = (role?: string | null): string =>
  role ? role.replace(/_/g, " ") : "No login";
