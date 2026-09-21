import type { Metadata } from "next";

import { ReturnsPage } from "@/features/content/server";

export const metadata: Metadata = {
  title: "Returns and exchanges",
  description:
    "Fourteen days to return, thirty to exchange a size. How to start a return and what we cannot take back.",
};

export default function Page() {
  return <ReturnsPage />;
}
