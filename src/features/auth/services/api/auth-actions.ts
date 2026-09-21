"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { allowByAddress, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type ResetPasswordValues,
  type SignupValues,
} from "@/features/auth/types";

export type AuthResult = { error: string } | undefined;

/** Signup either signs the person in, or says an email is waiting for them. */
export type SignupResult = { error: string } | { confirmEmail: string } | undefined;

/** Only ever redirect to a path on this site. */
function safeRedirect(target: string | undefined | null, fallback = "/"): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}

export async function loginAction(
  values: LoginValues,
  next?: string,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email first — the link is in your inbox."
          : "That email and password do not match an account.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(next));
}

export async function signupAction(
  values: SignupValues,
  next?: string,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();
  const callback = new URL("/auth/callback", siteConfig.url);
  callback.searchParams.set("next", safeRedirect(next));

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: callback.toString(),
    },
  });

  if (error) {
    return {
      error:
        error.message === "User already registered"
          ? "There is already an account with that email."
          : "We could not create that account. Try again in a moment.",
    };
  }

  // With email confirmation on (the Supabase default) signUp returns a user
  // but no session. Redirecting would land the person signed out with no idea
  // why, so tell them where the link went instead.
  if (!data.session) {
    return { confirmEmail: parsed.data.email };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(next));
}

/**
 * Sends a password reset link. Always answers the same way, whether or not the
 * email has an account: a different answer would let anyone check which
 * addresses shop here.
 */
export async function requestPasswordResetAction(
  values: ForgotPasswordValues,
): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the email and try again" };
  }

  if (!(await allowByAddress("passwordReset"))) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const callback = new URL("/auth/callback", siteConfig.url);
  callback.searchParams.set("next", "/reset-password");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callback.toString(),
  });

  // The likeliest failure is Supabase's own email limit. Log it, but still
  // answer generically for the reason above.
  if (error) console.error("[auth] reset email failed", error.message);
  return undefined;
}

/**
 * Sets a new password. Only works inside the session the reset link created:
 * the callback route exchanged its code before sending the person here.
 */
export async function updatePasswordAction(values: ResetPasswordValues): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "That reset link has expired. Ask for a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That is your current password. Choose a new one."
          : "We could not change the password. Ask for a new link and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/account?password=updated");
}

export async function signInWithGoogleAction(next?: string): Promise<AuthResult> {
  const supabase = await createClient();
  const callback = new URL("/auth/callback", siteConfig.url);
  callback.searchParams.set("next", safeRedirect(next));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) {
    return { error: "Google sign-in is not available right now." };
  }

  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Demo logins. The credentials never leave the server — the buttons on the
 * login page just call these.
 */
async function signInAsDemo(
  emailVar: string,
  passwordVar: string,
  destination: string,
): Promise<AuthResult> {
  const email = process.env[emailVar];
  const password = process.env[passwordVar];

  if (!email || !password) {
    return {
      error: "Demo accounts are not configured on this deployment.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "The demo account is unavailable right now." };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function loginAsDemoAdmin(): Promise<AuthResult> {
  return signInAsDemo("DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD", "/dashboard");
}

export async function loginAsDemoCustomer(): Promise<AuthResult> {
  return signInAsDemo("DEMO_CUSTOMER_EMAIL", "DEMO_CUSTOMER_PASSWORD", "/");
}
