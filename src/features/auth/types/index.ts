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
