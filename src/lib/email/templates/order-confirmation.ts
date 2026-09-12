import "server-only";

import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/utils";

export type OrderEmailLine = {
  name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  priceCents: number;
};

export type OrderEmailData = {
  orderNumber: string;
  email: string;
  lines: OrderEmailLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    governorate?: string;
    postalCode?: string;
    country?: string;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addressLines(address: OrderEmailData["shippingAddress"]): string[] {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.governorate].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
    address.phone,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

export function orderConfirmationSubject(orderNumber: string): string {
  return `${siteConfig.name} order ${orderNumber} — confirmed`;
}

export function orderConfirmationText(data: OrderEmailData): string {
  const lines = data.lines
    .map(
      (line) =>
        `  ${line.quantity} × ${line.name}${
          [line.color, line.size].filter(Boolean).length
            ? ` (${[line.color, line.size].filter(Boolean).join(" / ")})`
            : ""
        } — ${formatMoney(line.priceCents * line.quantity)}`,
    )
    .join("\n");

  return [
    `Thanks — order ${data.orderNumber} is confirmed.`,
    "",
    "What you bought",
    lines,
    "",
    `Subtotal   ${formatMoney(data.subtotalCents)}`,
    data.discountCents > 0 ? `Discount   -${formatMoney(data.discountCents)}` : null,
    `Shipping   ${data.shippingCents === 0 ? "Free" : formatMoney(data.shippingCents)}`,
    `VAT        ${formatMoney(data.taxCents)}`,
    `Total      ${formatMoney(data.totalCents)}`,
    "",
    "Shipping to",
    addressLines(data.shippingAddress)
      .map((line) => `  ${line}`)
      .join("\n"),
    "",
    `Track it: ${siteConfig.url}/account/orders`,
    "",
    `${siteConfig.name} — ${siteConfig.support.email}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function orderConfirmationHtml(data: OrderEmailData): string {
  const rows = data.lines
    .map((line) => {
      const variant = [line.color, line.size].filter(Boolean).join(" · ");
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e4e4e2;">
            <div style="font-size:14px;font-weight:600;color:#0a0a0a;">${escapeHtml(line.name)}</div>
            ${
              variant
                ? `<div style="font-size:12px;color:#6b6b67;margin-top:3px;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(variant)}</div>`
                : ""
            }
            <div style="font-size:12px;color:#6b6b67;margin-top:3px;">Qty ${line.quantity}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e4e4e2;text-align:right;font-size:14px;font-weight:600;color:#0a0a0a;white-space:nowrap;">
            ${formatMoney(line.priceCents * line.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:5px 0;font-size:${strong ? "16px" : "13px"};color:${strong ? "#0a0a0a" : "#6b6b67"};${strong ? "font-weight:700;padding-top:14px;" : ""}">${label}</td>
      <td style="padding:5px 0;text-align:right;font-size:${strong ? "16px" : "13px"};color:#0a0a0a;${strong ? "font-weight:700;padding-top:14px;" : ""}white-space:nowrap;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f2f2f0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;">
    <div style="background:#0a0a0a;color:#ffffff;padding:26px;text-align:center;">
      <div style="font-size:18px;font-weight:700;letter-spacing:.34em;">${siteConfig.name}</div>
    </div>

    <div style="padding:32px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">Order confirmed</p>
      <h1 style="margin:8px 0 0;font-size:24px;color:#0a0a0a;letter-spacing:-.01em;">${escapeHtml(data.orderNumber)}</h1>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#6b6b67;">
        Payment went through and we are packing it now. You will get a second note
        the moment it leaves us.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:28px;">
        <thead>
          <tr>
            <th colspan="2" style="text-align:left;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;border-bottom:1px solid #0a0a0a;padding-bottom:10px;font-weight:600;">
              What you bought
            </th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:20px;">
        ${totalRow("Subtotal", formatMoney(data.subtotalCents))}
        ${data.discountCents > 0 ? totalRow("Discount", `-${formatMoney(data.discountCents)}`) : ""}
        ${totalRow("Shipping", data.shippingCents === 0 ? "Free" : formatMoney(data.shippingCents))}
        ${totalRow("VAT", formatMoney(data.taxCents))}
        ${totalRow("Total", formatMoney(data.totalCents), true)}
      </table>

      <div style="margin-top:30px;padding-top:22px;border-top:1px solid #e4e4e2;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b67;">Shipping to</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#0a0a0a;">
          ${addressLines(data.shippingAddress).map(escapeHtml).join("<br/>")}
        </p>
      </div>

      <a href="${siteConfig.url}/account/orders"
         style="display:inline-block;margin-top:28px;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 26px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
        Track this order
      </a>
    </div>

    <div style="background:#0a0a0a;color:#8a8a86;padding:22px 28px;font-size:11px;line-height:1.7;">
      Questions? <a href="mailto:${siteConfig.support.email}" style="color:#ffffff;">${siteConfig.support.email}</a><br/>
      ${siteConfig.name} — all prices in EGP.
    </div>
  </div>
</body>
</html>`;
}
