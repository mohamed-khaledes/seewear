import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatMoney, initialsFrom } from "@/lib/utils";
import { orderStatusMeta, paymentMethodLabel } from "@/features/orders";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { Panel } from "@/features/dashboard/components/panel";
import { getCustomer } from "@/features/dashboard/services/api/dashboard.server";

export async function CustomerAdminDetailPage({ customerId }: { customerId: string }) {
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  const { profile } = customer;
  const name = profile.full_name ?? customer.email ?? "Customer";
  const average = customer.orderCount ? customer.lifetimeCents / customer.orderCount : 0;

  return (
    <>
      <DashboardTopbar title={name} subtitle={`Customer since ${formatDate(profile.created_at)}`} />

      <div className="px-5 py-6 lg:px-8">
        <Link
          href="/dashboard/customers"
          className="up-xs mb-5 inline-flex items-center gap-1 text-grey-2 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3" />
          All customers
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Figure label="Lifetime value" value={formatMoney(customer.lifetimeCents)} />
              <Figure label="Completed orders" value={String(customer.orderCount)} />
              <Figure label="Average order" value={formatMoney(Math.round(average))} />
            </div>

            <Panel title="Orders" note={`${customer.orders.length} in total`} bodyClassName="p-0">
              {customer.orders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-grey-2">
                  No orders yet. They appear here from the first checkout, signed in or
                  as a guest with this email.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead className="hidden sm:table-cell">Placed</TableHead>
                      <TableHead className="hidden md:table-cell">Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => {
                      const meta = orderStatusMeta[order.status];
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-bold tabular-nums">
                            <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                              {order.order_number}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-grey-2">
                            {formatDateTime(order.created_at)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs">
                            {paymentMethodLabel[order.payment_method]}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatMoney(order.total_cents)}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </div>

          <aside className="grid h-fit gap-4">
            <Panel title="Contact">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-concrete text-xs font-bold">
                  {initialsFrom(name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusPill tone={profile.role === "admin" ? "ok" : "mut"}>
                      {profile.role === "admin" ? "Admin" : "Customer"}
                    </StatusPill>
                    {profile.is_demo ? <StatusPill tone="warn">Demo</StatusPill> : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2 break-all text-grey-2 hover:text-ink"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    {customer.email}
                  </a>
                ) : null}
                {profile.phone ? (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-2 tabular-nums text-grey-2 hover:text-ink"
                  >
                    <Phone className="size-3.5 shrink-0" />
                    {profile.phone}
                  </a>
                ) : null}
                {customer.lastSignIn ? (
                  <p className="up-xs mt-1 text-grey">
                    Last signed in {formatDateTime(customer.lastSignIn)}
                  </p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Addresses" note={String(customer.addresses.length)}>
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-grey-2">None saved.</p>
              ) : (
                <ul className="grid gap-3">
                  {customer.addresses.map((address) => (
                    <li key={address.id} className="text-sm leading-relaxed text-grey-2">
                      <p className="font-semibold text-ink">
                        {address.label || address.full_name}
                        {address.is_default ? (
                          <span className="up-xs ms-2 font-medium text-ok">Default</span>
                        ) : null}
                      </p>
                      <p>{address.line1}</p>
                      <p>
                        {address.city}, {address.governorate}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-4.5">
      <p className="up-xs text-grey-2">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
