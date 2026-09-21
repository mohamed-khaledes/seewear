import Link from "next/link";
import { Users } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, initialsFrom } from "@/lib/utils";
import { AdminSearch } from "@/features/dashboard/components/admin-search";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { getCustomers } from "@/features/dashboard/services/api/dashboard.server";
import { TablePagination } from "@/features/dashboard/components/table-pagination";

export async function CustomersAdminPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const search = searchParams.q ?? "";
  const customers = await getCustomers(search, Number(searchParams.page ?? 1));

  return (
    <>
      <DashboardTopbar
        title="Customers"
        subtitle={`${customers.total} profiles · lifetime value`}
        actions={
          <AdminSearch
            basePath="/dashboard/customers"
            placeholder="Search customers…"
            defaultValue={search}
          />
        }
      />

      <div className="px-5 py-6 lg:px-8">
        {customers.rows.length === 0 ? (
          <EmptyPanelState
            icon={<Users />}
            title={search ? "Nothing matched that search" : "No customers yet"}
            body={
              search
                ? "Try part of a name or an email address."
                : "Profiles appear here as soon as people sign up."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Lifetime</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.rows.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-concrete text-[11px] font-bold">
                          {initialsFrom(customer.full_name ?? customer.email)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="block truncate text-[12.5px] font-semibold hover:underline"
                          >
                            {customer.full_name ?? customer.email ?? "—"}
                          </Link>
                          <p className="truncate text-[11px] text-grey">
                            {customer.email ?? "no email on file"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        <StatusPill tone={customer.role === "admin" ? "ok" : "mut"}>
                          {customer.role === "admin" ? "Admin" : "Customer"}
                        </StatusPill>
                        {customer.is_demo ? (
                          <StatusPill tone="warn">Demo</StatusPill>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{customer.order_count}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(customer.lifetime_cents)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-grey-2">
                      {formatDate(customer.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={customers.page}
              totalPages={customers.totalPages}
              total={customers.total}
              perPage={customers.perPage}
              basePath="/dashboard/customers"
              params={{ q: search || undefined }}
              label="profiles"
            />
          </div>
        )}
      </div>
    </>
  );
}
