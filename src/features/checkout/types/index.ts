import { z } from "zod";

import { cartInputSchema } from "@/features/cart/types";

export const EGYPT_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Dakahlia",
  "Sharqia",
  "Qalyubia",
  "Beheira",
  "Gharbia",
  "Monufia",
  "Port Said",
  "Suez",
  "Ismailia",
  "Damietta",
  "Faiyum",
  "Beni Suef",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "New Valley",
  "Matrouh",
  "North Sinai",
  "South Sinai",
  "Kafr El Sheikh",
] as const;

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, "We need a name for the parcel").max(80),
  phone: z
    .string()
    .trim()
    .min(8, "A phone number helps the courier reach you")
    .max(20)
    .regex(/^[+\d][\d\s-]*$/, "Digits, spaces and a leading + only"),
  line1: z.string().trim().min(4, "Street and building, please").max(120),
  line2: z.string().trim().max(120),
  city: z.string().trim().min(2, "Which city?").max(60),
  governorate: z.string().trim().min(2, "Pick a governorate").max(60),
  postalCode: z.string().trim().max(12),
  country: z.string().trim().min(2).max(60),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const checkoutSchema = z.object({
  email: z.string().trim().min(1, "We send the receipt here").email("That email looks off"),
  shipping: shippingAddressSchema,
  discountCode: z.string().trim().max(40),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** What the browser POSTs to /api/checkout. Prices are deliberately absent. */
export const checkoutRequestSchema = checkoutSchema.extend({
  items: cartInputSchema,
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export type CheckoutResponse =
  | { ok: true; orderNumber: string; redirectUrl: string }
  | { ok: false; error: string; unavailable?: { variantId: string; stock: number }[] };

export type DiscountPreview = {
  code: string;
  discountCents: number;
  label: string;
};
