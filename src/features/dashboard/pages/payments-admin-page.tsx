import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";
import { paymentStatus } from "@/features/orders";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState, Panel } from "@/features/dashboard/components/panel";
import { ExportForm } from "@/features/dashboard/components/export-form";
import { getPaymentsSummary } from "@/features/dashboard/services/api/dashboard.server";
import { TablePagination } from "@/features/dashboard/components/table-pagination";

export async function PaymentsAdminPage({
  live,
  page = 1,
}: {
  live: boolean;
  page?: number;
}) {
  const summary = await getPaymentsSummary(page);
  const settled = summary.succeededCents - summary.refundedCents;

  return (
    <>
      <DashboardTopbar
        title="Payments"
        subtitle={`Paymob · ${live ? "Live" : "Not connected"} · EGP`}
        actions={<ExportForm action="/dashboard/payments/export" label="Export CSV" />}
      />

      <div className="grid gap-4 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-paper px-5 py-4.5">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 place-items-center rounded-[10px] bg-ink text-lg font-extrabold tracking-tight text-white">
              P
            </span>
            <div>
              <p className="text-sm font-bold">
                Paymob · {live ? "Connected" : "Not connected"}
              </p>
              <p className="mt-0.5 text-[11px] text-grey-2">
                {live
                  ? "Unified Checkout · EGP · HMAC-verified callbacks"
                  : "Add the Paymob keys to .env.local to take live orders"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-grey-2">
            <span>{live ? "Live mode" : "Offline"}</span>
            <span
              className={`relative h-5 w-9 rounded-full ${live ? "bg-ok" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                  live ? "right-0.5" : "left-0.5"
                }`}
              />
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Settled"
            value={formatMoney(Math.max(settled, 0))}
            note="Succeeded, less refunds"
          />
          <SummaryCard
            label="Pending"
            value={formatMoney(summary.pendingCents)}
            note="Awaiting a verified callback"
          />
          <SummaryCard
            label="Refunded"
            value={formatMoney(summary.refundedCents)}
            note="Returned to customers"
          />
        </div>

        {summary.transactions.length === 0 ? (
          <EmptyPanelState
            icon={<CreditCard />}
            title="No transactions yet"
            body="Every payment attempt lands here once a customer reaches Paymob."
          />
        ) : (
          <Panel title="Transactions" note="Paymob" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.transactions.map((payment) => {
                  const status = paymentStatus(payment.status);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-[11px]">
                        <span className="flex items-center gap-1.5">
                          {payment.hmac_verified ? (
                            <ShieldCheck className="size-3.5 text-ok" />
                          ) : null}
                          {payment.transaction_id ?? payment.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {payment.order ? (
                          <Link
                            href={`/dashboard/orders/${payment.order_id}`}
                            className="hover:underline"
                          >
                            {payment.order.order_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {payment.method ?? "Card"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(payment.amount_cents)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-grey-2">
                        {formatDate(payment.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={summary.page}
              totalPages={summary.totalPages}
              total={summary.total}
              perPage={summary.perPage}
              basePath="/dashboard/payments"
              label="transactions"
            />
          </Panel>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-4.5">
      <p className="up-xs text-grey-2">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] text-grey">{note}</p>
    </div>
  );
}
