import { z } from "zod";

export const CONTACT_TOPICS = [
  "An order I have placed",
  "Sizing and fit",
  "Returns or an exchange",
  "Stock and restocks",
  "Something else",
] as const;

/**
 * Shared by the form and the server action. No `.default()` or `.transform()`
 * here — either one splits the schema's input and output types and breaks the
 * react-hook-form generics.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name"),
  email: z.string().trim().min(1, "Enter your email").email("That email looks off"),
  orderNumber: z.string().trim().max(32, "That is longer than an order number"),
  topic: z.enum(CONTACT_TOPICS, { message: "Pick the closest topic" }),
  message: z
    .string()
    .trim()
    .min(20, "A little more detail helps us answer properly")
    .max(2000, "That is longer than we can take — email us the rest"),
});

export type ContactValues = z.infer<typeof contactSchema>;

export type ContactResult = { ok: true } | { ok: false; error: string };
