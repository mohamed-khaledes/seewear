"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  Shapes,
  Store,
  Tags,
  Users,
} from "lucide-react";

import { cn, initialsFrom } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import type { SessionUser } from "@/features/auth";

const GROUPS: {
  title: string;
  links: { href: string; label: string; icon: React.ReactNode }[];
}[] = [
  {
    title: "Store",
    links: [
      { href: "/dashboard", label: "Overview", icon: <LayoutGrid /> },
      { href: "/dashboard/products", label: "Products", icon: <Package /> },
      { href: "/dashboard/categories", label: "Categories", icon: <Shapes /> },
      { href: "/dashboard/orders", label: "Orders", icon: <Receipt /> },
      { href: "/dashboard/customers", label: "Customers", icon: <Users /> },
    ],
  },
  {
    title: "Money",
    links: [
      { href: "/dashboard/payments", label: "Payments", icon: <CreditCard /> },
      { href: "/dashboard/discounts", label: "Discounts", icon: <Tags /> },
    ],
  },
  {
    title: "Config",
    links: [{ href: "/dashboard/settings", label: "Settings", icon: <Settings /> }],
  },
];

export function DashboardSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 flex flex-row flex-wrap items-center gap-1 bg-ink px-3.5 py-3.5 text-white lg:h-dvh lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-0 lg:px-0 lg:py-5.5">
      <Link
        href="/"
        className="px-3 text-[15px] font-bold uppercase tracking-[0.3em] lg:px-6 lg:pb-6.5 lg:pt-1.5"
      >
        {siteConfig.name}
      </Link>

      <nav className="flex flex-1 flex-row flex-wrap items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0">
        {GROUPS.map((group) => (
          <div key={group.title} className="contents lg:block">
            <p className="hidden px-6 pb-2 pt-4 text-[9px] uppercase tracking-[0.2em] text-[#5c5c5c] lg:block">
              {group.title}
            </p>
            {group.links.map((link) => {
              const active =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded px-3 py-2 text-[13px] text-[#c9c9c9] transition-colors hover:bg-[#141414] hover:text-white lg:rounded-none lg:border-l-2 lg:border-transparent lg:px-6 lg:py-2.5",
                    active && "bg-[#141414] text-white lg:border-l-white",
                  )}
                >
                  <span className="[&_svg]:size-4 [&_svg]:stroke-[1.6]">
                    {link.icon}
                  </span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="hidden items-center gap-2.5 border-t border-line-dark px-6 pt-4 lg:flex">
        <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,#3a3a3a,#111)] text-xs font-bold">
          {initialsFrom(user.fullName ?? user.email)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">
            {user.fullName ?? "Admin"}
          </span>
          <span className="block text-[10px] text-[#7a7a7a]">
            {user.isDemo ? "Demo admin" : "Store owner"}
          </span>
        </span>
      </div>

      <Link
        href="/"
        className="up-xs ml-auto flex items-center gap-2 rounded px-3 py-2 text-[#c9c9c9] transition-colors hover:text-white lg:ml-0 lg:hidden"
      >
        <Store className="size-4" />
        Storefront
      </Link>
    </aside>
  );
}
