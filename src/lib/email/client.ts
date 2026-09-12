import "server-only";

import { Resend } from "resend";

let resend: Resend | undefined;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  resend ??= new Resend(apiKey);
  return resend;
}

export function emailFrom(): string {
  return process.env.RESEND_FROM ?? "SEEWEAR <orders@seewear.store>";
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Who a reply should go to — the customer, on a contact-form message. */
  replyTo?: string;
};

/**
 * Sends, and never throws. Email is a side effect of a paid order — a bounced
 * send must not fail the webhook or leave the order unmarked.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendArgs): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn(`[email] skipped "${subject}" — Resend is not configured`);
    return false;
  }

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(),
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("[email] send failed", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] send threw", error);
    return false;
  }
}
