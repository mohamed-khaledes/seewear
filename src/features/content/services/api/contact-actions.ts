"use server";

import { siteConfig } from "@/config/site";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { contactSchema, type ContactResult, type ContactValues } from "@/features/content/types";

/** Customer-supplied text lands in an HTML email — escape all of it. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends a contact message to the support inbox, with the customer as reply-to
 * so answering is one click.
 *
 * Validation runs again here: the browser's copy of the schema is a convenience,
 * not a control.
 */
export async function sendContactMessage(values: ContactValues): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again",
    };
  }

  const { name, email, orderNumber, topic, message } = parsed.data;

  // Say so plainly rather than showing a success screen that sent nothing.
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error: `Our contact form is not connected yet. Email us directly at ${siteConfig.support.email} and we will pick it up.`,
    };
  }

  const reference = orderNumber ? ` · ${orderNumber}` : "";
  const rows: [string, string][] = [
    ["From", `${name} <${email}>`],
    ["Topic", topic],
    ["Order", orderNumber || "—"],
  ];

  const sent = await sendEmail({
    to: siteConfig.support.email,
    replyTo: email,
    subject: `Contact form — ${topic}${reference}`,
    text: [
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      message,
    ].join("\n"),
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#0a0a0a;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6b6b67;">
          ${escapeHtml(siteConfig.name)} contact form
        </p>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
          ${rows
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding:4px 16px 4px 0;color:#6b6b67;">${escapeHtml(label)}</td>
              <td style="padding:4px 0;font-weight:600;">${escapeHtml(value)}</td>
            </tr>`,
            )
            .join("")}
        </table>
        <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;border-top:1px solid #e4e4e2;padding-top:16px;">
${escapeHtml(message)}
        </div>
      </div>
    `,
  });

  if (!sent) {
    return {
      ok: false,
      error: `That did not send. Email us at ${siteConfig.support.email} and we will answer the same way.`,
    };
  }

  return { ok: true };
}
