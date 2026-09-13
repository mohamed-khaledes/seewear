import Link from "next/link";

import { ContentHero } from "@/features/content";
import { TrackOrderForm } from "@/features/orders/components/track-order-form";

/**
 * Public order tracking.
 *
 * Guest checkout is a headline promise of the store, and a guest order has no
 * `user_id` — so without this page the only people who could follow a parcel
 * were the ones who had made an account.
 */
export function TrackOrderPage({ orderNumber = "" }: { orderNumber?: string }) {
  return (
    <div className="bg-concrete">
      <ContentHero
        eyebrow="Orders"
        title="Track your order"
        lede="Your order number and the email you checked out with. No account needed."
        crumbs={[{ label: "Help", href: "/help" }, { label: "Track order" }]}
      />

      <div className="mx-auto max-w-2xl px-5 py-10 lg:px-6 lg:py-14">
        <TrackOrderForm defaultOrderNumber={orderNumber} />

        <p className="mt-6 text-center text-xs leading-relaxed text-grey-2">
          Have an account?{" "}
          <Link href="/account/orders" className="text-ink underline underline-offset-4">
            Every order you have placed
          </Link>{" "}
          is already there, with the same timeline.
        </p>
      </div>
    </div>
  );
}
