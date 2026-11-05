"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { DashboardLayout } from "~/components/common/dashboard-layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import {
  STOCK_TAKE_TYPES,
  StockTakeApprovalStatus,
  StockTakeEntry,
  fetch_my_stock_takes,
  fetch_stock_takes_for_approval,
  stock_take_status,
  submit_stock_take_approval,
} from "~/lib/actions/stocktake.actions";
import { useAuthStore } from "~/store/auth-store";

const STATUS_META: Record<StockTakeApprovalStatus, { label: string; className: string }> = {
  pending_team_leader: {
    label: "Pending team leader",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  team_leader_approved: {
    label: "Approved by team leader",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  finance_approved: {
    label: "Approved by finance",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400",
  },
};

function StatusBadge({ entry }: { entry: StockTakeEntry }) {
  const meta = STATUS_META[stock_take_status(entry)];
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", meta.className)}>
      {meta.label}
    </Badge>
  );
}

const type_name = (t: string) => STOCK_TAKE_TYPES[parseInt(t)] ?? "Stock take";
const who_when = (name?: string, date?: string) =>
  [name, date].filter((x) => x && x.trim() !== "").join(" · ");

function Timeline({ entry }: { entry: StockTakeEntry }) {
  const status = stock_take_status(entry);
  const rejected_tl = status === "rejected" && entry.rejected_stage !== "finance";
  const rejected_fin = status === "rejected" && entry.rejected_stage === "finance";
  const tl_done = status === "team_leader_approved" || status === "finance_approved" || rejected_fin;
  const fin_done = status === "finance_approved";

  type Step = { title: string; state: "done" | "current" | "waiting" | "rejected"; detail?: string; note?: string };
  const steps: Step[] = [{ title: "Counted", state: "done", detail: entry.trans_date }];
  const rejection = {
    state: "rejected" as const,
    detail: who_when(entry.rejected_name, entry.rejection_date),
    note: entry.rejection_reason,
  };

  if (rejected_tl) {
    steps.push({ title: "Rejected by team leader", ...rejection });
  } else {
    steps.push({
      title: tl_done ? "Approved by team leader" : "Team leader approval",
      state: tl_done ? "done" : "current",
      detail: tl_done ? who_when(entry.team_leader_name, entry.team_leader_approval_date) : undefined,
      note: tl_done ? entry.team_leader_comment : undefined,
    });
    if (rejected_fin) {
      steps.push({ title: "Rejected by finance", ...rejection });
    } else {
      steps.push({
        title: fin_done ? "Approved by finance" : "Finance approval (ERP)",
        state: fin_done ? "done" : tl_done ? "current" : "waiting",
        detail: fin_done ? who_when(entry.finance_name, entry.finance_approval_date) : undefined,
      });
    }
  }

  const dot = {
    done: "bg-emerald-500",
    current: "bg-amber-500",
    waiting: "bg-muted-foreground/40",
    rejected: "bg-red-500",
  };

  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.title} className="flex gap-3">
          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dot[s.state])} />
          <div className="text-sm">
            <p className={cn("font-medium", s.state === "waiting" && "text-muted-foreground")}>
              {s.title}
              {s.state === "current" && <span className="text-muted-foreground"> (waiting)</span>}
            </p>
            {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
            {s.note && <p className="text-xs italic text-muted-foreground">“{s.note}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StockTakeDetail({
  entry,
  on_updated,
}: {
  entry: StockTakeEntry;
  on_updated: (e: StockTakeEntry) => void;
}) {
  const { site_company, account, site_url } = useAuthStore();
  const [comment, set_comment] = React.useState("");
  const [busy, set_busy] = React.useState<null | "approve" | "reject">(null);

  React.useEffect(() => set_comment(""), [entry.stock_take_id]);

  const can_act = entry.can_team_leader_approve === true;

  const submit = async (action: "approve" | "reject") => {
    if (!site_company || !account || !site_url) return;
    if (action === "reject" && comment.trim() === "") {
      toast.error("Give a reason before rejecting.");
      return;
    }
    set_busy(action);
    const result = await submit_stock_take_approval({
      site_company,
      account,
      site_url,
      stock_take_id: entry.stock_take_id,
      action,
      comment: comment.trim(),
    });
    set_busy(null);

    if (result === null) {
      toast.error("No response from the server. Check the connection and try again.");
      return;
    }
    if (!result.ok) {
      toast.error(result.message || (action === "approve" ? "Not approved" : "Not rejected"));
      return;
    }
    toast.success(result.message || (action === "approve" ? "Stock take approved" : "Stock take rejected"));
    on_updated(
      result.stock_take
        ? { ...entry, ...result.stock_take, items: result.stock_take.items?.length ? result.stock_take.items : entry.items }
        : { ...entry, can_team_leader_approve: false },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">
            {entry.branch_name?.trim() || entry.store_name?.trim()} · #{entry.stock_take_id}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {type_name(entry.stock_take_type)} · counted {entry.trans_date}
            {entry.confirmation_id ? ` · ${entry.confirmation_id}` : ""}
          </p>
        </div>
        <StatusBadge entry={entry} />
      </CardHeader>
      <CardContent className="space-y-6">
        <Timeline entry={entry} />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.items.map((it) => {
                const diff = Number(it.quantity_after) - Number(it.quantity_before);
                return (
                  <TableRow key={it.stock_id}>
                    <TableCell>
                      <p className="font-medium">{it.description}</p>
                      <p className="text-xs text-muted-foreground">{it.stock_id}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity_before}</TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity_after}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        diff < 0 && "text-red-500",
                        diff > 0 && "text-emerald-500",
                      )}>
                      {Number.isFinite(diff) ? (diff > 0 ? `+${diff}` : diff) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {can_act ? (
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => set_comment(e.target.value)}
              placeholder="Comment (optional when approving, required when rejecting)"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                disabled={busy !== null}
                onClick={() => submit("reject")}>
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </Button>
              <Button disabled={busy !== null} onClick={() => submit("approve")}>
                {busy === "approve" ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {stock_take_status(entry) === "pending_team_leader"
              ? "You can't approve this stock take."
              : "No action needed from you."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** List on the left, the picked stock take on the right. */
function StockTakeBrowser({
  list,
  isLoading,
  error,
  empty_title,
  empty_text,
}: {
  list: StockTakeEntry[];
  isLoading: boolean;
  error: unknown;
  empty_title: string;
  empty_text: string;
}) {
  const queryClient = useQueryClient();
  // Kept as an object, not an id, so a stock take stays on screen (with its
  // new status) after it drops out of the pending list.
  const [selected, set_selected] = React.useState<StockTakeEntry | null>(null);

  React.useEffect(() => {
    if (!selected && list.length > 0) set_selected(list[0]!);
  }, [list, selected]);

  const on_updated = (e: StockTakeEntry) => {
    set_selected(e);
    void queryClient.invalidateQueries({ queryKey: ["stockTakes"] });
  };

  if (error) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load stock takes: {(error as Error).message}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Loading stock takes…
      </div>
    );
  }
  if (list.length === 0 && !selected) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-semibold">{empty_title}</h3>
        <p className="text-sm text-muted-foreground">{empty_text}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{empty_text}</p>
        )}
        {list.map((e) => (
          <button
            key={e.stock_take_id}
            type="button"
            onClick={() => set_selected(e)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
              selected?.stock_take_id === e.stock_take_id && "border-primary bg-muted/60",
            )}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {e.branch_name?.trim() || e.store_name?.trim()} · #{e.stock_take_id}
              </p>
              <StatusBadge entry={e} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {type_name(e.stock_take_type)} · {e.trans_date} · {e.items.length}{" "}
              {e.items.length === 1 ? "item" : "items"}
            </p>
          </button>
        ))}
      </div>
      {selected && <StockTakeDetail entry={selected} on_updated={on_updated} />}
    </div>
  );
}

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const StockTakeApprovalsPage = () => {
  const { site_company, account, site_url } = useAuthStore();
  const ready = !!(site_company && account && site_url);
  const [tab, set_tab] = React.useState<"approvals" | "mine">("approvals");
  const [sdate, set_sdate] = React.useState(() => ymd(new Date(Date.now() - 6 * 86400000)));
  const [edate, set_edate] = React.useState(() => ymd(new Date()));

  const approvals_key = ["stockTakes", "approvals", site_url, site_company?.company_prefix, account?.id];
  const approvals = useQuery({
    queryKey: approvals_key,
    queryFn: () => fetch_stock_takes_for_approval(site_company!, account!, site_url!),
    enabled: ready,
  });

  const mine_key = ["stockTakes", "mine", site_url, site_company?.company_prefix, account?.id, sdate, edate];
  const mine = useQuery({
    queryKey: mine_key,
    queryFn: () => fetch_my_stock_takes(site_company!, account!, site_url!, sdate, edate),
    enabled: ready && tab === "mine" && sdate !== "" && edate !== "",
  });

  const active = tab === "approvals" ? approvals : mine;
  const waiting = approvals.data?.length ?? 0;

  return (
    <DashboardLayout title={site_company?.branch ?? ""}>
      <main className="flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Stock Take Approvals</h1>
            <p className="text-sm text-muted-foreground">
              Team leaders approve stock takes counted at their branch. Finance gives the final approval in the ERP.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => active.refetch()} disabled={active.isFetching}>
            <RefreshCw className={cn("mr-2 h-4 w-4", active.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => set_tab(v as "approvals" | "mine")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="approvals">
                Awaiting my approval{waiting > 0 ? ` (${waiting})` : ""}
              </TabsTrigger>
              <TabsTrigger value="mine">My stock takes</TabsTrigger>
            </TabsList>
            {tab === "mine" && (
              <div className="flex items-center gap-2 text-sm">
                <Input type="date" value={sdate} max={edate} onChange={(e) => set_sdate(e.target.value)} className="h-9 w-40" />
                <span className="text-muted-foreground">to</span>
                <Input type="date" value={edate} min={sdate} onChange={(e) => set_edate(e.target.value)} className="h-9 w-40" />
              </div>
            )}
          </div>

          <TabsContent value="approvals" className="mt-4">
            <StockTakeBrowser
              key="approvals"
              list={approvals.data ?? []}
              isLoading={approvals.isLoading}
              error={approvals.error}
              empty_title="Nothing to approve"
              empty_text="No stock takes are waiting for your approval. Only the team leader of a branch sees its stock takes here."
            />
          </TabsContent>
          <TabsContent value="mine" className="mt-4">
            <StockTakeBrowser
              key={`mine-${sdate}-${edate}`}
              list={mine.data ?? []}
              isLoading={mine.isLoading}
              error={mine.error}
              empty_title="No stock takes"
              empty_text="You haven't submitted any stock takes in this date range."
            />
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
};

export default StockTakeApprovalsPage;
