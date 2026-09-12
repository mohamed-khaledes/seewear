import type { Metadata } from "next";

import { AboutPage } from "@/features/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why SEEWEAR keeps the range small, where the clothes are made, and how to visit the Cairo showroom.",
};

export default function Page() {
  return <AboutPage />;
}
