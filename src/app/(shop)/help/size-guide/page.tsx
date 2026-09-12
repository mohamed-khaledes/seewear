import type { Metadata } from "next";

import { SizeGuidePage } from "@/features/content";

export const metadata: Metadata = {
  title: "Size guide",
  description:
    "Garment measurements for every SEEWEAR size in centimetres or inches, and how to measure a piece you already own.",
};

export default function Page() {
  return <SizeGuidePage />;
}
