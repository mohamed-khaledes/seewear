import type { Metadata } from "next";

import { ContactPage } from "@/features/content/server";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Message the SEEWEAR team about an order, sizing or a return. We answer within one working day.",
};

export default function Page() {
  return <ContactPage />;
}
