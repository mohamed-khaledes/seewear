import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getSessionUser } from "@/features/auth/services/api/session.server";

/**
 * Reached from the reset email through the auth callback, which has already
 * swapped the link's code for a session. No session means the link was old,
 * already used, or opened in a different browser.
 */
export async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <AuthShell
      eyebrow="Account"
      title="Choose a new password"
      footer={
        <>
          Need help?{" "}
          <Link href="/help/contact" className="font-medium text-ink underline underline-offset-4">
            Contact us
          </Link>
        </>
      }
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="grid gap-4 text-sm leading-relaxed text-grey-2">
          <p>
            This link has expired or was already used. Reset links work once, for an hour,
            in the browser that opened them.
          </p>
          <Link
            href="/forgot-password"
            className="up-sm w-fit border-b border-ink pb-0.5 font-semibold text-ink"
          >
            Send a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
