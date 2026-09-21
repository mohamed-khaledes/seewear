import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account"
      title="Reset your password"
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-grey-2">
        Enter the email you shop with and we will send a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
