// Stock take approvals: the branch team leader approves or rejects stock
// takes counted in the mobile app. Finance gives the final approval in the
// ERP. Backend contract: dairy-module-master docs/stock-take-approvals-backend.md
// and this repo's docs/stock-take-team-leader-backend.md (branch scoping + role).

import axios from "axios";

export type StockTakeApprovalStatus =
  | "pending_team_leader"
  | "team_leader_approved"
  | "finance_approved"
  | "rejected";

export type StockTakeItem = {
  stock_id: string;
  description: string;
  quantity_before: string;
  quantity_after: string;
  approved: string;
  approval_date: string;
  qty_approved: string;
};

export type StockTakeEntry = {
  stock_take_id: string;
  location: string;
  store_name: string;
  trans_date: string;
  items: StockTakeItem[];
  confirmation_id?: string;
  branch_code?: string;
  branch_name?: string;
  approved?: string;
  stock_take_type: string;
  approval_status?: StockTakeApprovalStatus;
  team_leader_approved_by?: string;
  team_leader_name?: string;
  team_leader_approval_date?: string;
  team_leader_comment?: string;
  finance_approved_by?: string;
  finance_name?: string;
  finance_approval_date?: string;
  rejected_by?: string;
  rejected_name?: string;
  rejected_stage?: "" | "team_leader" | "finance";
  rejection_date?: string;
  rejection_reason?: string;
  can_team_leader_approve?: boolean;
};

/** Same order as the mobile app's stock take intents (stock_take_type). */
export const STOCK_TAKE_TYPES = [
  "Production Verification",
  "Branch Receiving",
  "Pull Down Activity",
  "Branch Clearance",
  "HQ Returns",
  "General Stock Take Activity",
];

/**
 * Keep only stock takes counted at the user's own branch (their
 * default_store). The backend filters by `branch_code` too; this guards
 * against a backend that still returns every branch.
 */
export function only_my_branch(list: StockTakeEntry[], account: UserAccountInfo): StockTakeEntry[] {
  const branch = account.default_store?.trim();
  if (!branch) return [];
  return list.filter((e) => (e.branch_code?.trim() || e.location?.trim()) === branch);
}

export function stock_take_status(e: StockTakeEntry): StockTakeApprovalStatus {
  if (e.approval_status) return e.approval_status;
  return e.approved === "1" ? "finance_approved" : "pending_team_leader";
}

/**
 * Stock takes from the user's branch(es) waiting for them as team leader.
 * Throws on a network failure so react-query shows the error state.
 */
export async function fetch_stock_takes_for_approval(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
): Promise<StockTakeEntry[]> {
  const form = new FormData();
  form.append("tp", "getStockTakeReport");
  form.append("cp", site_company.company_prefix);
  form.append("id", account.id);
  form.append("scope", "my_approvals");
  form.append("branch_code", account.default_store ?? "");

  const res = await axios.postForm<StockTakeEntry[]>(
    `${site_url}process.php`,
    form,
  );
  return only_my_branch(Array.isArray(res.data) ? res.data : [], account);
}

/**
 * Stock takes the user submitted between two dates (YYYY-MM-DD), same list
 * the mobile app shows under "My stock takes".
 */
export async function fetch_my_stock_takes(
  site_company: SiteCompany,
  account: UserAccountInfo,
  site_url: string,
  sdate: string,
  edate: string,
): Promise<StockTakeEntry[]> {
  const form = new FormData();
  form.append("tp", "getStockTakeReport");
  form.append("cp", site_company.company_prefix);
  form.append("id", account.id);
  form.append("sdate", sdate);
  form.append("edate", edate);
  form.append("branch_code", account.default_store ?? "");

  const res = await axios.postForm<StockTakeEntry[]>(
    `${site_url}process.php`,
    form,
  );
  return only_my_branch(Array.isArray(res.data) ? res.data : [], account);
}

export type ApprovalResult =
  | { ok: true; message: string; stock_take: StockTakeEntry | null }
  | { ok: false; message: string };

/**
 * Team leader approves or rejects a whole stock take. `message` is the
 * server's own text. Returns null when no reply reached the POS.
 */
export async function submit_stock_take_approval({
  site_company,
  account,
  site_url,
  stock_take_id,
  action,
  comment,
}: {
  site_company: SiteCompany;
  account: UserAccountInfo;
  site_url: string;
  stock_take_id: string;
  action: "approve" | "reject";
  comment: string;
}): Promise<ApprovalResult | null> {
  const form = new FormData();
  form.append("tp", "stock_take_team_leader_approval");
  form.append("cp", site_company.company_prefix);
  form.append("id", account.id);
  form.append("stock_take_id", stock_take_id);
  form.append("action", action);
  form.append("comment", comment);

  try {
    const res = await axios.postForm<{
      status?: string;
      message?: string;
      stock_take?: StockTakeEntry;
    }>(`${site_url}process.php`, form);
    const message = typeof res.data?.message === "string" ? res.data.message : "";
    if (res.data?.status === "SUCCESS") {
      return { ok: true, message, stock_take: res.data.stock_take ?? null };
    }
    return { ok: false, message };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as { message?: string } | string | undefined;
      const message =
        typeof body === "string" ? body : typeof body?.message === "string" ? body.message : "";
      return { ok: false, message };
    }
    console.error("stock take approval failed", error);
    return null;
  }
}
