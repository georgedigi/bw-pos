# Stock Take Approvals: Retention Only (backend)

**Date:** 2026-11-26
**Builds on:** `dairy-module-master/docs/stock-take-approvals-backend.md` (team leader + finance approval) and `docs/stock-take-team-leader-backend.md`
**Status:** Needs backend work. This is the last backend change for stock take approvals.

---

## 1. The rule

**Team leader approval applies only to stock retention.** A stock take needs it when its intent is **Retain Stock**, or any intent with "retain" / "retention" in its name.

Every other intent goes straight to finance with **no team leader step**:

| Intent | Team leader approval? |
|--------|-----------------------|
| Production Verification | No |
| Branch Receiving | No |
| Pull Down Activity | No |
| Branch Clearance | No |
| HQ Returns | No |
| General Stock Take Activity | No |
| **Retain Stock** | **Yes** |

Stock takes are counted in the mobile app (Stock Take Entry). The branch team leader approves them in the POS.

---

## 2. Changes needed

### 2.1 Mark which intents need approval (`tp=fetch_all_stock_intent`)

Add a flag to each intent so the rule lives in one place on the server, not in a name match on the clients:

```json
{
  "id": 6,
  "name": "Retain Stock",
  "...existing fields...": "",
  "requires_team_leader_approval": true
}
```

`true` only for retain-type intents. `false` (or omitted) for everything else.

### 2.2 Starting status on submit (`tp=stocktake`)

When a stock take is saved:

- **Retain-type intent:** `approval_status = pending_team_leader` (as today).
- **Any other intent:** skip the team leader stage. Set it to whatever status finance approves from (`team_leader_approved`, or a new `pending_finance` if you prefer; tell us which). The team leader fields stay empty.

Otherwise, non-retain stock takes sit at `pending_team_leader` with no one able to approve them, and finance never sees them.

### 2.3 Filter the approvals listing (`tp=getStockTakeReport`, `scope=my_approvals`)

Return **only retain-type stock takes** at `pending_team_leader` for the team leader's branch.

- `can_team_leader_approve` must be `true` **only** on retain-type stock takes (and still only for that branch's team leader, at `pending_team_leader`).
- The normal listing (no `scope`, "My stock takes") still returns every type, unchanged.

### 2.4 Enforce it on the approve endpoint (`tp=stock_take_team_leader_approval`)

Refuse team leader approve/reject on a non-retain stock take, even if someone calls the endpoint directly:

```json
{
  "status": "FAILED",
  "message": "Only stock retention needs team leader approval. Stock take 60 goes straight to finance."
}
```

The POS shows `message` exactly as sent, so please write it for the end user.

### 2.5 Type name on every stock take

Add `stock_take_type_name` (e.g. `"Retain Stock"`) to each entry in `getStockTakeReport` and `getStockTakeById`. The POS shows this name and uses it as a fallback check, so it doesn't depend on the numeric `stock_take_type` id.

### 2.6 Existing records

Non-retain stock takes already at `pending_team_leader` need moving to the finance stage (same status as 2.2), or they stay stuck.

---

## 3. What the POS already does

These POS changes are a stopgap until the backend changes are live; they stay harmless afterwards:

- The approvals queue keeps only stock takes whose type name contains "retain" / "retention".
- Approve / Reject buttons appear only on retain-type stock takes.
- Without `stock_take_type_name`, the POS assumes **id 6 = Retain Stock**. Please confirm the id, or send the name (2.5).

The POS only hides entries; it can't fix their status. 2.2–2.4 are what make the rule real.

---

## 4. Please confirm

1. The id of the **Retain Stock** intent (we assume `6`).
2. The status non-retain stock takes start at for finance (`team_leader_approved` or a new `pending_finance`).

---

## 5. Quick test

```bash
# Approvals queue: should contain only Retain Stock entries
curl -sS -X POST "https://budgetwear.digerp.com/dev/process.php" \
  -F tp=getStockTakeReport -F cp=0_ -F id=<team_leader_id> \
  -F scope=my_approvals -F branch_code=<branch_code> \
  | jq '.[] | {stock_take_id, stock_take_type, stock_take_type_name, approval_status, can_team_leader_approve}'

# Approving a non-retain stock take: should return FAILED
curl -sS -X POST "https://budgetwear.digerp.com/dev/process.php" \
  -F tp=stock_take_team_leader_approval -F cp=0_ -F id=<team_leader_id> \
  -F stock_take_id=<non_retain_id> -F action=approve | jq
```
