"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestStockAlertAction } from "@/features/products/services/api/stock-alert-actions";

/**
 * Shown where "Add to bag" would be when the chosen size is sold out, so a
 * dead end becomes a way back.
 */
export function StockAlertForm({
  variantId,
  label,
  defaultEmail = "",
}: {
  variantId: string;
  /** "Black · M", for the confirmation line. */
  label: string;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (savedFor === variantId) {
    return (
      <p className="flex items-center gap-2 border border-line bg-concrete px-4 py-3 text-sm">
        <Check className="size-4 text-ok" />
        We will email {email} when {label || "it"} is back.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestStockAlertAction(variantId, email);
          if (result.ok) setSavedFor(variantId);
          else setError(result.error);
        });
      }}
      className="grid gap-2 border border-line bg-concrete p-4"
    >
      <label htmlFor="stock-alert-email" className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="size-4" strokeWidth={1.6} />
        Email me when {label || "this"} is back
      </label>
      <div className="flex gap-2">
        <Input
          id="stock-alert-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 bg-white"
        />
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-xs h-11 shrink-0 px-5 font-semibold"
        >
          {pending ? <Loader2 className="animate-spin" /> : "Notify me"}
        </Button>
      </div>
      {error ? <p className="text-xs text-sale">{error}</p> : null}
      <p className="text-[11px] text-grey">One email when it returns. Nothing else.</p>
    </form>
  );
}
