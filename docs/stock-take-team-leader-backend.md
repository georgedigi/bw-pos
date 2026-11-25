# Stock Take Approvals: team leader role + branch scoping (backend)

Stock takes are **counted** in the mobile app. They are **approved** on this POS site (`bw-pos`, Inventory → Stock Take Approvals) by the branch team leader, then by finance in the ERP. The approve/reject endpoint and approval fields are described in the earlier spec, `stock-take-approvals-backend.md` (dairy-module-master repo). This doc covers two things the POS needs before approvals can work:

1. **Only team leaders** can see and act on stock take approvals.
2. **Each branch sees only its own stock takes.**

The POS screen is already built for this. Until the backend side is done, the screen stays empty.

> **Deploy to dev: `https://budgetweardev.digerp.com/`.** The mobile app saves stock takes there, the `mStockTakeApproval` role is set up there, and that is where we test. Production (`budgetwear.digerp.com`) has no stock takes this month, so changes made only there can't be seen. (`budgetwear.digerp.com/dev/` returns 404 and is not the dev server.)

## The problem today

Tested on `budgetweardev.digerp.com`, company `0_`, user `digisoft_support` (id `104`, `default_store = 006` CAXTON):

- `tp=getStockTakeReport` returns stock takes from **every branch**. The CAXTON user gets stock take **333 (ROYSAMBU, branch 001)**.
- There is no role for "team leader". The POS showed the screen to anyone with `mBranchManager` or `mInventoryManager`, which includes users who are not team leaders.
- `scope=my_approvals` returns `[]`, and `tp=stock_take_team_leader_approval` returns an empty response. Neither is built yet (see `stock-take-approvals-backend.md`, sections 3.1 and 3.3).

## 1. New role: `mStockTakeApproval`

Add a security role area in the ERP with the key **`mStockTakeApproval`** (label: "Stock Take Approval (Team Leader)").

- Give it only to branch team leaders.
- It must appear in the `tp=roles` response for those users, like the other keys:

```json
["pPOS", "iStock Take", "mBranchManager", "mStockTakeApproval", "..."]
```

The POS shows the **Stock Take Approvals** menu and page **only** when this key is in the list. Branch Manager and Inventory Manager alone are no longer enough.

> If the ERP already has a role that means "team leader", tell us its key and we will switch to it. It is one constant in the POS (`src/lib/stock-take-role.ts`).

## 2. A team leader's branch = their `default_store`

The POS identifies the user's branch as `default_store` from the login response (e.g. `"006"`). A team leader approves stock takes **only for that branch**.

If one team leader covers several branches, tell us how the ERP stores that (for example a user→branch table) and add a `branches` array to the login response. Until then, it is one branch per team leader.

## 3. `tp=getStockTakeReport` must filter by branch

The POS now sends a new field on **both** calls:

| Field         | Example | Meaning                                  |
| ------------- | ------- | ---------------------------------------- |
| `branch_code` | `006`   | The logged-in user's branch (`default_store`) |

### 3a. "Awaiting my approval"

```bash
curl -X POST https://budgetweardev.digerp.com/process.php \
  -F tp=getStockTakeReport -F cp=0_ -F id=104 \
  -F scope=my_approvals -F branch_code=006
```

Return only stock takes where **all** of these are true:

- `branch_code` (the stock take's branch) equals the user's branch, and
- `approval_status = pending_team_leader`, and
- the user in `id` has the `mStockTakeApproval` role.

If the user doesn't have the role, return `[]`. Don't trust the `branch_code` the app sends on its own: check it against the user's `default_store` on the server, so nobody can see another branch by changing the request.

### 3b. "My stock takes" (date range)

```bash
curl -X POST https://budgetweardev.digerp.com/process.php \
  -F tp=getStockTakeReport -F cp=0_ -F id=104 \
  -F sdate=2026-11-01 -F edate=2026-11-20 -F branch_code=006
```

When `branch_code` is sent, return only stock takes at that branch. Without `branch_code`, keep today's behaviour, because the mobile app (where counting happens) still calls it without `branch_code`.

### Entry fields

Each entry must include `branch_code` (it already does) plus the approval fields from `stock-take-approvals-backend.md`: `approval_status`, `can_team_leader_approve`, the `team_leader_*` and `finance_*` fields, and `rejected_stage` and `rejection_reason`.

`can_team_leader_approve` is `true` **only** if the user in `id`:

- has `mStockTakeApproval`, and
- has a `default_store` equal to the stock take's `branch_code`, and
- the stock take is at `pending_team_leader`.

**Self-approval is controlled by a permission**, `mStockTakeSelfApproval`, on by default for team leaders. See `stock-take-self-approval-permission-backend.md`.

## 4. `tp=stock_take_team_leader_approval` must check role and branch

Same request as `stock-take-approvals-backend.md`, section 3.1, sent from the POS. Before approving or rejecting, the server must check the rules above and fail with a message the user can read:

| Case                         | `message` to return                                      |
| ---------------------------- | -------------------------------------------------------- |
| No `mStockTakeApproval` role | `You are not a team leader, so you can't approve stock takes` |
| Different branch             | `Stock take 333 is for ROYSAMBU. You can only approve CAXTON stock takes` |
| Already approved/rejected    | `Stock take 333 is already approved`                     |

The POS shows `message` exactly as sent.

## 5. Approval order (reminder)

1. **Team leader** of the branch approves in the POS → `team_leader_approved`.
2. **Finance** approves in the ERP → `finance_approved`, `approved = 1`, inventory adjustment posted.

The ERP must **not** let finance approve a stock take that is still `pending_team_leader`.

## 6. Retention stock takes don't reach the team leader

**Problem (seen on `budgetweardev.digerp.com`, 2026-11-24):** Retention stock takes counted in the mobile app are saved, but the CAXTON team leader never sees them in the POS.

`tp=getStockTakeReport` (date range) returns them for CAXTON (`branch_code = 006`):

| `stock_take_id` | `confirmation_id` | `stock_take_type` | `approval_status` | `can_team_leader_approve` |
| --------------- | ----------------- | ----------------- | ----------------- | ------------------------- |
| 900000001       | RETAIN-1          | `6`               | *(missing)*       | *(missing)*               |
| 900000002       | RETAIN-2          | `6`               | *(missing)*       | *(missing)*               |
| 900000003       | RETAIN-3          | `6`               | *(missing)*       | *(missing)*               |
| 900000004       | RETAIN-4          | `6`               | *(missing)*       | *(missing)*               |

**Re-tested 2026-11-25 (twice, last after you reported it done):** still not fixed on `budgetweardev.digerp.com`. A new Retention stock take (RETAIN-4, saved today from the mobile app) also has no `approval_status`, and `scope=my_approvals` with `branch_code=006` still returns `[]`. The `mStockTakeApproval` role is in place and works. Production has no stock takes at all for November, so the fix is not visible there either.

The same user gets `[]` from `scope=my_approvals`, so the approval screen stays empty. The approval fields (section 3) are missing on these rows, and the queue only picks up `pending_team_leader`.

**Fix:**

1. When the mobile app saves a stock take of **any** type, Retention included, set `approval_status = pending_team_leader`. Retention follows the same order as every other type: team leader first, then finance (section 5).
2. Return Retention entries from `scope=my_approvals` under the same branch and role rules as section 3a, with every approval field from section 3 ("Entry fields"), including `can_team_leader_approve`.
3. Fix the existing rows: set `approval_status = pending_team_leader` on RETAIN-1, RETAIN-2, RETAIN-3 and RETAIN-4 (and any other stock take that has no approval status and `approved = 0`).

### Send the type name, not only the id

`stock_take_type` is a numeric id (`0`, `2`, `6`, …). The POS keeps its own id→name list, so every new type in the mobile app needs a POS change before it shows the right name. Add the name to every entry:

| Field                  | Example     | Meaning                                  |
| ---------------------- | ----------- | ---------------------------------------- |
| `stock_take_type`      | `6`         | Type id (keep it, unchanged)             |
| `stock_take_type_name` | `Retention` | Name to display, from the ERP's type list |

The POS shows `stock_take_type_name` when sent. If it's missing, the POS falls back to its own list:

| id | Name                        |
| -- | --------------------------- |
| 0  | Production Verification     |
| 1  | Branch Receiving            |
| 2  | Pull Down Activity          |
| 3  | Branch Clearance            |
| 4  | HQ Returns                  |
| 5  | General Stock Take Activity |
| 6  | Retention                   |

Please confirm these ids match the ERP.

## 7. How to check it's done

Run this against **dev**:

```bash
curl -X POST https://budgetweardev.digerp.com/process.php \
  -F tp=getStockTakeReport -F cp=0_ -F id=104 \
  -F scope=my_approvals -F branch_code=006
```

**Today it returns `[]`.** When sections 3 and 6 are done, it must return RETAIN-1, RETAIN-2, RETAIN-3 and RETAIN-4, each with at least:

```json
{
  "stock_take_id": "900000004",
  "confirmation_id": "RETAIN-4",
  "branch_code": "006",
  "stock_take_type": "6",
  "stock_take_type_name": "Retention",
  "approved": "0",
  "approval_status": "pending_team_leader",
  "can_team_leader_approve": true
}
```

**Today these come back with `can_team_leader_approve: false`** because user 104 counted them, so the POS shows no Approve button. With `mStockTakeSelfApproval` (see `stock-take-self-approval-permission-backend.md`), all four must come back `true`.

Then save a **new** Retention stock take from the mobile app and run the call again: it must show up straight away with `approval_status = pending_team_leader`.

Please send us the output of this call when you report it done.

## Checklist

- [x] Role key `mStockTakeApproval` created, returned by `tp=roles`, given to team leaders
- [ ] `getStockTakeReport` + `scope=my_approvals` + `branch_code`: pending stock takes for the user's branch only, `[]` for non-team-leaders
- [ ] `getStockTakeReport` + `branch_code` (date range): that branch only; no `branch_code` = unchanged
- [ ] Branch checked on the server against the user's `default_store`
- [ ] Entries include `approval_status` and `can_team_leader_approve`, worked out per the rules in section 3
- [ ] `stock_take_team_leader_approval` enforces role, branch, status and the self-approval permission, with readable messages
- [ ] ERP blocks finance approval before team leader approval
- [ ] Every new stock take, Retention (type 6) included, saved with `approval_status = pending_team_leader`
- [ ] Retention stock takes returned by `scope=my_approvals` with every approval field
- [ ] Existing RETAIN-1/2/3/4 rows (and others with no status) set to `pending_team_leader`
- [ ] `stock_take_type_name` returned on every entry; type ids confirmed
- [ ] Self-approval permission `mStockTakeSelfApproval` done (see `stock-take-self-approval-permission-backend.md`)
- [ ] Deployed to `budgetweardev.digerp.com`, and the section 7 call returns RETAIN-1 to RETAIN-4
- [ ] Answer: does the ERP already have a team leader role? Can one team leader cover several branches?
