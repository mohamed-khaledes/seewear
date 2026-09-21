import type { Instrumentation } from "next";

/**
 * Next calls this for every uncaught error while rendering a page, running a
 * route handler or a server action — the errors that used to go only to a
 * log nobody was reading.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Imported here so the Edge runtime never loads Node-only reporting code.
  const { reportError } = await import("@/lib/error-report");
  const err = error as Error & { digest?: string };

  await reportError({
    where: `server · ${context.routerKind} ${context.routeType} ${context.routePath}`,
    message: err.message ?? String(error),
    digest: err.digest ?? null,
    path: request.path,
    stack: err.stack ?? null,
  });
};
