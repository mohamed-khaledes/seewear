import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { reportError } from "@/lib/error-report";
import { allowByAddress } from "@/lib/rate-limit";

const clientErrorSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).nullish(),
  path: z.string().max(300).nullish(),
});

/**
 * Where the error screens in the browser report what broke. Rate limited and
 * size-capped: this is an open endpoint, and it must not become a way to fill
 * the logs or spam the alert channel.
 */
export async function POST(request: NextRequest) {
  if (!(await allowByAddress("clientError"))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const parsed = clientErrorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await reportError({ where: "browser", ...parsed.data });
  return NextResponse.json({ ok: true });
}
