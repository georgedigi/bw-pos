// Role the ERP gives branch team leaders so they can approve stock takes.
// Must match the role key returned by `tp=roles` (see docs/stock-take-team-leader-backend.md
// in this repo).
export const STOCK_TAKE_APPROVER_ROLE = "mStockTakeApproval";

/** `roles` is the JSON string kept in localStorage at sign-in. */
export function is_stock_take_approver(roles: string | null | undefined): boolean {
  if (!roles) return false;
  try {
    const list: unknown = JSON.parse(roles);
    return Array.isArray(list) && list.includes(STOCK_TAKE_APPROVER_ROLE);
  } catch {
    return false;
  }
}
