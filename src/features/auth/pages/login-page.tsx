import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { DemoLoginButtons } from "@/features/auth/components/demo-login-buttons";
import { GoogleButton } from "@/features/auth/components/google-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { getT } from "@/lib/i18n/server";

export async function LoginPage({ next }: { next?: string }) {
  const t = await getT();
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <AuthShell
      eyebrow={t("auth.welcomeBack")}
      title={t("auth.signIn")}
      footer={
        <>
          {t("auth.newHere")}{" "}
          <Link href={signupHref} className="font-medium text-ink underline underline-offset-4">
            {t("auth.createAccount")}
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

        <LoginForm next={next} />
      </div>
    </AuthShell>
  );
}
