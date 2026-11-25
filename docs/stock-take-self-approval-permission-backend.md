# Stock Take Approvals: self-approval permission (backend)

Follows `stock-take-team-leader-backend.md` (same folder). Deploy and test on **dev: `https://budgetweardev.digerp.com/`**.

## The problem

A team leader can't approve a stock take they counted themselves. On dev, user `104` (CAXTON, `006`) counted RETAIN-1 to RETAIN-4, and `scope=my_approvals` returns all four with `can_team_leader_approve: false`. The POS shows no Approve button, so the stock takes are stuck.

Many branches have one team leader who also does the counting, so they need to approve their own stock takes. Others want a second person to approve. This should be a permission, not a fixed rule.

## 1. New role key: `mStockTakeSelfApproval`

Add a security role area with the key **`mStockTakeSelfApproval`** (label: "Stock Take: approve own stock takes").

**On by default:**

- Give it to **every role that has `mStockTakeApproval`** today, including role id 11 on dev.
- When `mStockTakeApproval` is given to a role in future, give `mStockTakeSelfApproval` with it, ticked by default.
- To stop a team leader approving their own stock takes, an admin unticks `mStockTakeSelfApproval` on their role.

It is returned by `tp=roles` like the other keys:

```json
["pPOS", "iStock Take", "mStockTakeApproval", "mStockTakeSelfApproval", "..."]
```

`mStockTakeSelfApproval` on its own (without `mStockTakeApproval`) gives no access to approvals.

## 2. `tp=getStockTakeReport`: `can_team_leader_approve`

`can_team_leader_approve` is `true` when the user in `id`:

- has `mStockTakeApproval`, and
- has a `default_store` equal to the stock take's `branch_code`, and
- the stock take is at `pending_team_leader`, and
- **either** did not submit the stock take (`user_id` ≠ `id`), **or** has `mStockTakeSelfApproval`.

Otherwise it is `false`. This applies to `scope=my_approvals` and to the date range call.

## 3. `tp=stock_take_team_leader_approval`: same check on the server

Apply the same rule before approving or rejecting. Don't rely on the POS hiding the button.

| Case | `message` to return |
| ---- | ------------------- |
| User submitted the stock take and doesn't have `mStockTakeSelfApproval` | `You counted stock take 900000004, so another team leader has to approve it` |

Use the real stock take id in the message. All other checks and messages from `stock-take-team-leader-backend.md` section 4 stay the same.

Record the approver as usual (`team_leader_approved_by`, `team_leader_name`, `team_leader_approval_date`). Finance still approves in the ERP afterwards; that step doesn't change.

## 4. How to check it's done

1. `tp=roles` for user `104` on dev includes `mStockTakeSelfApproval`.
2. This call returns RETAIN-1 to RETAIN-4 with `"can_team_leader_approve": true`:

   ```bash
   curl -X POST https://budgetweardev.digerp.com/process.php \
     -F tp=getStockTakeReport -F cp=0_ -F id=104 \
     -F scope=my_approvals -F branch_code=006
   ```

3. Untick `mStockTakeSelfApproval` on role 11 and run the call again: all four come back `false`, and `tp=stock_take_team_leader_approval` for one of them fails with the message above. Tick it again afterwards.

Please send us the output of step 2 when you report it done.

## Checklist

- [ ] Role key `mStockTakeSelfApproval` created and returned by `tp=roles`
- [ ] Given to every role that has `mStockTakeApproval`, and ticked by default whenever `mStockTakeApproval` is given
- [ ] `can_team_leader_approve` follows section 2
- [ ] `stock_take_team_leader_approval` enforces the same rule, with the message in section 3
- [ ] Deployed to `budgetweardev.digerp.com`; section 4 checks pass
