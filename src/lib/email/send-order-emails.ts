import "server-only";

import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/utils";
import { sendEmail } from "./client";
import {
  orderConfirmationHtml,
  orderConfirmationSubject,
  orderConfirmationText,
  type OrderEmailData,
} from "./templates/order-confirmation";

export async function sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: orderConfirmationSubject(data.orderNumber),
    html: orderConfirmationHtml(data),
    text: orderConfirmationText(data),
  });
}

/**
 * Sent when an order is marked shipped in the dashboard. The consignment number
 * is the point of the email, so it appears as text as well as behind a button —
 * courier references get typed into the courier's own site as often as clicked.
 */
export async function sendFulfilmentNotice(args: {
  email: string;
  orderNumber: string;
  totalCents: number;
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): Promise<boolean> {
  const { email, orderNumber, totalCents, courier, trackingNumber, trackingUrl } = args;
  const trackHere = `${siteConfig.url}/track?order=${encodeURIComponent(orderNumber)}`;
  const consignment = [courier, trackingNumber].filter(Boolean).join(" · ");

  const consignmentBlock = consignment
    ? `<table style="margin-top:22px;border-collapse:collapse;width:100%;background:#f2f2f0;">
         <tr>
           <td style="padding:14px 16px;">
             <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">${courier ?? "Courier"}</div>
             <div style="margin-top:4px;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#0a0a0a;">${trackingNumber ?? ""}</div>
           </td>
           ${
             trackingUrl
               ? `<td align="right" style="padding:14px 16px;"><a href="${trackingUrl}" style="font-size:12px;font-weight:600;color:#0a0a0a;">Courier tracking &rarr;</a></td>`
               : ""
           }
         </tr>
       </table>`
    : "";

  return sendEmail({
    to: email,
    subject: `${siteConfig.name} order ${orderNumber} is on its way`,
    text: [
      `Order ${orderNumber} has left us.`,
      "",
      consignment ? `Courier: ${consignment}` : "",
      trackingUrl ? `Courier tracking: ${trackingUrl}` : "",
      consignment ? "" : "",
      `Total paid: ${formatMoney(totalCents)}`,
      "",
      `Follow every step here: ${trackHere}`,
    ]
      .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
      .join("\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f2f2f0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;">
    <div style="background:#0a0a0a;color:#ffffff;padding:26px;text-align:center;">
      <div style="font-size:18px;font-weight:700;letter-spacing:.34em;">${siteConfig.name}</div>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">On its way</p>
      <h1 style="margin:8px 0 0;font-size:24px;color:#0a0a0a;">${orderNumber}</h1>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#6b6b67;">
        Your order has left us and is with the courier. Delivery across Egypt usually
        takes two to four working days.
      </p>
      ${consignmentBlock}
      <a href="${trackHere}"
         style="display:inline-block;margin-top:26px;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 26px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
        Track this order
      </a>
    </div>
  </div>
</body>
</html>`,
  });
}

/* ------------------------------------------------------------ status notices */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The shared frame for the short status emails: one eyebrow, the order number,
 * a paragraph or two, and the way back to the order. Paragraphs are escaped
 * here, so a note typed in the dashboard cannot inject markup.
 */
function statusNotice(args: {
  email: string;
  orderNumber: string;
  subject: string;
  eyebrow: string;
  paragraphs: string[];
}): Promise<boolean> {
  const trackHere = `${siteConfig.url}/track?order=${encodeURIComponent(args.orderNumber)}`;

  return sendEmail({
    to: args.email,
    subject: args.subject,
    text: [...args.paragraphs, "", `Your order: ${trackHere}`].join("\n\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f2f2f0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;">
    <div style="background:#0a0a0a;color:#ffffff;padding:26px;text-align:center;">
      <div style="font-size:18px;font-weight:700;letter-spacing:.34em;">${siteConfig.name}</div>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">${escapeHtml(args.eyebrow)}</p>
      <h1 style="margin:8px 0 0;font-size:24px;color:#0a0a0a;">${escapeHtml(args.orderNumber)}</h1>
      ${args.paragraphs
        .map(
          (paragraph) =>
            `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#6b6b67;">${escapeHtml(paragraph)}</p>`,
        )
        .join("")}
      <a href="${trackHere}"
         style="display:inline-block;margin-top:26px;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 26px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
        View the order
      </a>
    </div>
  </div>
</body>
</html>`,
  });
}

export function sendDeliveredNotice(args: { email: string; orderNumber: string }) {
  return statusNotice({
    ...args,
    subject: `${siteConfig.name} order ${args.orderNumber} has arrived`,
    eyebrow: "Delivered",
    paragraphs: [
      "Your order has been delivered.",
      "If anything is not right, you have fourteen days from today to return unworn pieces with their tags on.",
    ],
  });
}

export function sendCancelledNotice(args: {
  email: string;
  orderNumber: string;
  reason?: string | null;
  paid: boolean;
}) {
  return statusNotice({
    ...args,
    subject: `${siteConfig.name} order ${args.orderNumber} was cancelled`,
    eyebrow: "Cancelled",
    paragraphs: [
      "Your order has been cancelled.",
      args.reason ? `Reason: ${args.reason}` : "",
      args.paid
        ? "Any payment taken will be refunded to the original card; banks usually show it within five to ten working days."
        : "Nothing was charged.",
    ].filter(Boolean),
  });
}

export function sendRefundNotice(args: {
  email: string;
  orderNumber: string;
  amountCents: number;
  full: boolean;
  method: "card" | "cod";
}) {
  return statusNotice({
    ...args,
    subject: `${siteConfig.name} refund for ${args.orderNumber}`,
    eyebrow: args.full ? "Refunded" : "Partly refunded",
    paragraphs: [
      `We have refunded ${formatMoney(args.amountCents)}${args.full ? "" : " of this order"}.`,
      args.method === "card"
        ? "It goes back to the card you paid with. Banks usually show it within five to ten working days."
        : "As you paid in cash, we will be in touch to arrange how you would like it returned.",
    ],
  });
}

export function sendBackInStockNotice(args: {
  email: string;
  productName: string;
  variantLabel: string;
  productUrl: string;
}) {
  const detail = args.variantLabel ? `${args.productName} (${args.variantLabel})` : args.productName;
  return sendEmail({
    to: args.email,
    subject: `${args.productName} is back`,
    text: [
      `${detail} is back in stock.`,
      "Stock is limited and we do not hold it — it goes to whoever checks out first.",
      "",
      args.productUrl,
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f2f2f0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;">
    <div style="background:#0a0a0a;color:#ffffff;padding:26px;text-align:center;">
      <div style="font-size:18px;font-weight:700;letter-spacing:.34em;">${siteConfig.name}</div>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">Back in stock</p>
      <h1 style="margin:8px 0 0;font-size:22px;color:#0a0a0a;">${escapeHtml(detail)}</h1>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#6b6b67;">
        You asked us to tell you. Stock is limited and we do not hold it — it goes to whoever checks out first.
      </p>
      <a href="${args.productUrl}"
         style="display:inline-block;margin-top:26px;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 26px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
        Shop it now
      </a>
    </div>
  </div>
</body>
</html>`,
  });
}
