import { z } from "zod";

import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

/** The shape the UI actually cares about — never trust it for authorisation. */
export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: Profile["role"];
  isDemo: boolean;
};

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("That email looks off"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name"),
  email: z.string().trim().min(1, "Enter your email").email("That email looks off"),
  password: z
    .string()
    .min(8, "Passwords need at least 8 characters")
    .max(72, "That is longer than we can store"),
});

export type SignupValues = z.infer<typeof signupSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(80),
  phone: z.string().trim().max(24),
});

export type ProfileValues = z.infer<typeof profileSchema>;

/* -------------------------------------------------------------- addresses */

export type SavedAddress = Tables<"addresses">;

export const addressSchema = z.object({
  label: z.string().trim().max(30),
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
  isDefault: z.boolean(),
});

export type AddressValues = z.infer<typeof addressSchema>;

/* ------------------------------------------------------ password recovery */

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("That email looks off"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Passwords need at least 8 characters")
      .max(72, "That is longer than we can store"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Those two do not match",
    path: ["confirm"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
