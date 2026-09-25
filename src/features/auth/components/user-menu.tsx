"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Heart, LayoutDashboard, LogOut, Package, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsFrom } from "@/lib/utils";
import { signOutAction } from "@/features/auth/services/api/auth-actions";
import type { SessionUser } from "@/features/auth/types";
import { useT } from "@/lib/i18n";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label={t("auth.signIn")}
        className="text-white/85 transition-opacity hover:text-white"
      >
        <User className="size-[17px]" strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("account.menu")}
        className="grid size-[26px] place-items-center rounded-full bg-white/12 text-[10px] font-bold text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {initialsFrom(user.fullName ?? user.email)}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="text-sm font-semibold">
            {user.fullName ?? t("account.title")}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
          {user.isDemo ? (
            <span className="up-xs mt-1 text-grey">{t("account.demoSession")}</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard />
              {t("account.dashboard")}
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/account">
            <User />
            {t("account.account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package />
            {t("account.orders")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">
            <Heart />
            {t("account.wishlist")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
