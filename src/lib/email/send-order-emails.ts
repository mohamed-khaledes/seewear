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

/** Sent from the dashboard when an order is marked fulfilled. */
export async function sendFulfilmentNotice(args: {
  email: string;
  orderNumber: string;
  totalCents: number;
}): Promise<boolean> {
  const { email, orderNumber, totalCents } = args;

  return sendEmail({
    to: email,
    subject: `${siteConfig.name} order ${orderNumber} is on its way`,
    text: [
      `Order ${orderNumber} has left us.`,
      "",
      `Total paid: ${formatMoney(totalCents)}`,
      "",
      `Track it: ${siteConfig.url}/account/orders`,
    ].join("\n"),
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
      <a href="${siteConfig.url}/account/orders"
         style="display:inline-block;margin-top:26px;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 26px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
        Track this order
      </a>
    </div>
  </div>
</body>
</html>`,
  });
}
