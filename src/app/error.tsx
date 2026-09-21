"use client";

import { ErrorScreen } from "@/components/common/error-screen";

/**
 * The last boundary before the root layout.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} scope="root" />;
}
