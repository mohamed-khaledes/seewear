import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { DemoLoginButtons } from "@/features/auth/components/demo-login-buttons";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignupForm } from "@/features/auth/components/signup-form";

export function SignupPage({ next }: { next?: string }) {
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthShell
      eyebrow="Join the club"
      title="Create an account"
      footer={
        <>
          Already have one?{" "}
          <Link href={loginHref} className="font-medium text-ink underline underline-offset-4">
            Sign in
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

        <SignupForm next={next} />
      </div>
    </AuthShell>
  );
}
