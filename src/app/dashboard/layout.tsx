import { redirect } from "next/navigation";

import { SessionProvider } from "@/features/auth/components/session-provider";
import { getSessionUser } from "@/features/auth/server";
import { DashboardSidebar } from "@/features/dashboard";

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gated this; the second check is the one that counts if
  // the matcher ever changes.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "admin") redirect("/");

  return (
    <SessionProvider user={user}>
      <div className="grid min-h-dvh bg-concrete lg:grid-cols-[230px_1fr] print:block print:bg-white">
        <DashboardSidebar user={user} />
        <div className="min-w-0">{children}</div>
      </div>
    </SessionProvider>
  );
}
