import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { DemoLoginButtons } from "@/features/auth/components/demo-login-buttons";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getT } from "@/lib/i18n/server";

export async function SignupPage({ next }: { next?: string }) {
  const t = await getT();
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthShell
      eyebrow={t("auth.joinTheClub")}
      title={t("auth.createAccount")}
      footer={
        <>
          {t("auth.haveAccountQuestion")}{" "}
          <Link href={loginHref} className="font-medium text-ink underline underline-offset-4">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      <div className="grid gap-6">
        <DemoLoginButtons />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="up-xs text-grey">{t("auth.or")}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <GoogleButton next={next} label={t("auth.continueWithGoogle")} />

        <SignupForm next={next} />
      </div>
    </AuthShell>
  );
}
