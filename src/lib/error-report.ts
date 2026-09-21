import "server-only";

export type ErrorReport = {
  /** Where it happened: "server", "browser", a route, an action. */
  where: string;
  message: string;
  digest?: string | null;
  path?: string | null;
  stack?: string | null;
};

/**
 * Reports an error somewhere a person will see it.
 *
 * Always as one structured log line, which Vercel's log search can filter on
 * `"level":"error"`. And, when ERROR_WEBHOOK_URL is set, as a message to a
 * Slack or Discord incoming webhook — both accept this body — so a checkout
 * failure at 2am is a notification rather than a line nobody reads.
 *
 * Never throws and never waits long: reporting an error must not become the
 * second error, or hold up the response the customer is waiting on.
 */
export async function reportError(report: ErrorReport): Promise<void> {
  const entry = {
    level: "error",
    at: new Date().toISOString(),
    ...report,
    stack: report.stack?.split("\n").slice(0, 8).join("\n") ?? null,
  };
  console.error(JSON.stringify(entry));

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;

  const summary = [
    `SEEWEAR error — ${report.where}`,
    report.path ? `Path: ${report.path}` : null,
    `Message: ${report.message.slice(0, 500)}`,
    report.digest ? `Digest: ${report.digest}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `text` for Slack, `content` for Discord; each ignores the other.
      body: JSON.stringify({ text: summary, content: summary }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // The log line above already has it.
  }
}
