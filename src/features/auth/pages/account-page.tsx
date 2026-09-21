import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, LayoutDashboard, Package } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AddressBook } from "@/features/auth/components/address-book";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { getMyAddresses } from "@/features/auth/services/api/addresses.server";
import { getSessionUser } from "@/features/auth/services/api/session.server";

export async function AccountPage({ passwordUpdated = false }: { passwordUpdated?: boolean }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  let phone = "";
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    phone = data?.phone ?? "";
  }

  const addresses = await getMyAddresses();

  return (
    <div className="bg-concrete">
      <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <p className="up-xs text-grey-2">Account</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
          {user.fullName ?? "Your account"}
        </h1>
        {user.isDemo ? (
          <p className="up-xs mt-2 text-grey">
            Demo session — you can browse and shop, but store settings stay locked.
          </p>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-4xl gap-5 px-5 py-8 lg:px-6">
        {passwordUpdated ? (
          <p className="border border-ok/30 bg-ok-bg px-4 py-3 text-sm text-ok">
            Password changed. Use the new one next time you sign in.
          </p>
        ) : null}

        <nav className="grid gap-px bg-line sm:grid-cols-3">
          <AccountLink href="/account/orders" icon={<Package className="size-4" />}>
            Orders
          </AccountLink>
          <AccountLink href="/wishlist" icon={<Heart className="size-4" />}>
            Wishlist
          </AccountLink>
          {user.role === "admin" ? (
            <AccountLink
              href="/dashboard"
              icon={<LayoutDashboard className="size-4" />}
            >
              Dashboard
            </AccountLink>
          ) : (
            <AccountLink href="/products" icon={<Package className="size-4" />}>
              Keep shopping
            </AccountLink>
          )}
        </nav>

        <section className="border border-line bg-paper p-6">
          <h2 className="up-sm mb-5 text-grey-2">Your details</h2>
          <ProfileForm
            email={user.email ?? ""}
            defaultValues={{ fullName: user.fullName ?? "", phone }}
          />
        </section>

        <AddressBook addresses={addresses} />
      </div>
    </div>
  );
}

function AccountLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="up-sm flex items-center gap-2.5 bg-paper px-5 py-4 font-semibold transition-colors hover:bg-white hover:text-ink"
    >
      {icon}
      {children}
    </Link>
  );
}
