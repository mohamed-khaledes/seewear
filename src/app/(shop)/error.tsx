"use client";

import { ErrorScreen } from "@/components/common/error-screen";

/**
 * Catches a failure inside one storefront page, so the header, footer and bag
 * around it stay usable instead of the whole site going blank.
 */
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} scope="shop" />;
}
