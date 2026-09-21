"use client";

import { ErrorScreen } from "@/components/common/error-screen";

/**
 * Catches a failure inside one dashboard screen and keeps the sidebar, so an
 * admin can still get to every other screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} scope="dashboard" homeHref="/dashboard" homeLabel="Back to the overview" />;
}
