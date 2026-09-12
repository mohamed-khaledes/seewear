"use client";

import { useTransition } from "react";
import { LayoutDashboard, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  loginAsDemoAdmin,
  loginAsDemoCustomer,
} from "@/features/auth/services/api/auth-actions";

/**
 * One tap into either side of the store. The passwords live in server-only env
 * vars — these buttons just invoke the server actions.
 */
export function DemoLoginButtons() {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string } | undefined>) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-line bg-concrete p-4">
      <p className="up-xs text-grey-2">Just looking?</p>
      <p className="mt-1.5 text-sm text-grey-2">
        Jump straight in with a pre-filled account — no signup.
      </p>

      {/* Always stacked: the auth panel caps at 520px, so a viewport-width
          breakpoint would put two long labels side by side in ~384px and clip
          the second one. */}
      <div className="mt-3 grid gap-2">
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() => run(loginAsDemoAdmin)}
          className="w-full justify-center"
        >
          <LayoutDashboard />
          View as demo admin
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => run(loginAsDemoCustomer)}
          className="w-full justify-center"
        >
          <ShoppingBag />
          View as demo customer
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-grey">
        Demo accounts can browse everything. Changes that would alter the store are
        blocked.
      </p>
    </div>
  );
}
