import type { Metadata } from "next";

import { OrderDetailPage } from "@/features/orders/server";

type Params = Promise<{ orderNumber: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}`, robots: { index: false } };
}

export default async function Page({ params }: { params: Params }) {
  const { orderNumber } = await params;
  return <OrderDetailPage orderNumber={orderNumber} />;
}
