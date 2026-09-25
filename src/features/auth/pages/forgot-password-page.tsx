import Link from "next/link";

import { getT } from "@/lib/i18n/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export async function ForgotPasswordPage() {
  const t = await getT();

  return (
    <AuthShell
      eyebrow={t("account.account")}
      title={t("auth.resetTitle")}
      footer={
        <>
          {t("auth.rememberedIt")}{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-4">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-grey-2">{t("auth.resetBody")}</p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
