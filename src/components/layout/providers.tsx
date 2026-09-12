"use client";

import type { ReactNode } from "react";
import { Tooltip } from "radix-ui";

import { ReactQueryProvider } from "@/lib/react-query";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <Tooltip.Provider delayDuration={200}>{children}</Tooltip.Provider>
      <Toaster position="bottom-right" richColors closeButton />
    </ReactQueryProvider>
  );
}
