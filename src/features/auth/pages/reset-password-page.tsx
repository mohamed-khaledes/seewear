import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getSessionUser } from "@/features/auth/services/api/session.server";
import { getT } from "@/lib/i18n/server";

/**
 * Reached from the reset email through the auth callback, which has already
 * swapped the link's code for a session. No session means the link was old,
 * already used, or opened in a different browser.
 */
export async function ResetPasswordPage() {
  const [user, t] = await Promise.all([getSessionUser(), getT()]);

  return (
    <AuthShell
      eyebrow={t("account.account")}
      title={t("auth.newPasswordTitle")}
      footer={
        <>
          {t("auth.needHelp")}{" "}
          <Link href="/help/contact" className="font-medium text-ink underline underline-offset-4">
            {t("auth.contactUs")}
          </Link>
        </>
      }
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="grid gap-4 text-sm leading-relaxed text-grey-2">
          <p>{t("auth.linkExpired")}</p>
          <Link
            href="/forgot-password"
            className="up-sm w-fit border-b border-ink pb-0.5 font-semibold text-ink"
          >
            {t("auth.sendNewLink")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
