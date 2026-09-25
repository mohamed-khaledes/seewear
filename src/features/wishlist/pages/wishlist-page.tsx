import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/features/products";
import { getWishlistProducts } from "@/features/wishlist/services/api/wishlist.server";
import { getT } from "@/lib/i18n/server";

export async function WishlistPage() {
  const [products, t] = await Promise.all([getWishlistProducts(), getT()]);

  return (
    <div className="bg-concrete">
      <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <p className="up-xs text-grey-2">{t("account.account")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
          {t("wishlist.title")}
        </h1>
      </div>

      {products.length === 0 ? (
        <div className="bg-paper px-6 py-24 text-center">
          <Heart className="mx-auto size-8 text-grey" strokeWidth={1.3} />
          <h2 className="mt-4 text-base font-semibold">{t("wishlist.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">
            {t("wishlist.emptyBody")}
          </p>
          <Button asChild size="lg" className="up-sm mt-6 h-12 px-8 font-semibold">
            <Link href="/products">{t("wishlist.browse")}</Link>
          </Button>
        </div>
      ) : (
        <ProductGrid products={products} priorityCount={5} />
      )}
    </div>
  );
}
