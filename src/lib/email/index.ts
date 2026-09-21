export { isEmailConfigured, sendEmail } from "./client";
export {
  sendBackInStockNotice,
  sendCancelledNotice,
  sendDeliveredNotice,
  sendFulfilmentNotice,
  sendOrderConfirmation,
  sendRefundNotice,
} from "./send-order-emails";
export type { OrderEmailData, OrderEmailLine } from "./templates/order-confirmation";
