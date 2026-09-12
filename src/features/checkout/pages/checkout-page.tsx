"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { useSessionUser } from "@/features/auth/components/session-provider";
import { useCart } from "@/features/cart/hooks/use-cart";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import type { DiscountPreview } from "@/features/checkout/types";

export function CheckoutPage() {
  const { items, hydrated, clear } = useCart();
  const user = useSessionUser();
  const [discount, setDiscount] = useState<DiscountPreview | null>(null);

  if (!hydrated) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4 px-5 py-16">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-paper px-6 py-28 text-center">
        <ShoppingBag className="mx-auto size-8 text-grey" strokeWidth={1.3} />
        <h1 className="mt-4 text-lg font-semibold">There is nothing to check out</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">
          Add a piece to your bag and this page will have something to price.
        </p>
        <Button asChild size="lg" className="up-sm mt-6 h-12 px-8 font-semibold">
          <Link href="/products">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
      <div className="bg-paper px-5 py-10 lg:px-[6vw] lg:py-12">
        <Link
          href="/"
          className="up mb-8 inline-block text-base font-bold tracking-[0.32em]"
        >
          {siteConfig.name}
        </Link>

        <nav aria-label="Checkout steps" className="up-xs mb-6 text-grey-2">
          <Link href="/cart" className="hover:text-ink">
            Cart
          </Link>{" "}
          ›{" "}
          <span className="font-semibold text-ink">Information &amp; payment</span> ›
          Confirmation
        </nav>

        <CheckoutForm
          items={items}
          discount={discount}
          defaultEmail={user?.email ?? ""}
          defaultName={user?.fullName ?? ""}
          onOrderPlaced={clear}
        />
      </div>

      <OrderSummary items={items} discount={discount} onDiscountChange={setDiscount} />
    </div>
  );
}
