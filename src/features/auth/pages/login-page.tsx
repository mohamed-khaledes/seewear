import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { DemoLoginButtons } from "@/features/auth/components/demo-login-buttons";
import { GoogleButton } from "@/features/auth/components/google-button";
import { LoginForm } from "@/features/auth/components/login-form";

export function LoginPage({ next }: { next?: string }) {
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          New here?{" "}
          <Link href={signupHref} className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid gap-6">
        <DemoLoginButtons />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="up-xs text-grey">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <GoogleButton next={next} label="Continue with Google" />

        <LoginForm next={next} />
      </div>
    </AuthShell>
  );
}
