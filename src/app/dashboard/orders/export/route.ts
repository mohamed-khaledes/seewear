import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/features/auth/server";
import { exportOrdersCsv } from "@/features/dashboard/server";

export const dynamic = "force-dynamic";

/**
 * CSV download for the accountant. Middleware already limits /dashboard to
 * admins; the check here is the one that holds if the matcher ever changes.
 * Demo admins may export too — it is read-only, and it is demo data.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const csv = await exportOrdersCsv({ from, to });

  const stamp = [from, to].filter(Boolean).join("_to_") || "all";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="seewear-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
