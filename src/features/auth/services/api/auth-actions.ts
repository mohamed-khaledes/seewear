"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from "@/features/auth/types";

export type AuthResult = { error: string } | undefined;

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
    return { error: "That email and password do not match an account." };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(next));
}

export async function signupAction(
  values: SignupValues,
  next?: string,
): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteConfig.url}/auth/callback`,
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

  revalidatePath("/", "layout");
  redirect(safeRedirect(next));
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
