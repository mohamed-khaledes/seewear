import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-concrete px-6 py-24 text-center">
      <div>
        <Link href="/" className="up text-base font-bold tracking-[0.32em]">
          {siteConfig.name}
        </Link>
        <p className="up-xs mt-10 text-grey-2">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          This rail is empty
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-grey-2">
          The page you were after has moved or never existed. The shop is still where
          you left it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild size="lg" className="up-sm h-12 px-8 font-semibold">
            <Link href="/products">Browse the shop</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-12 px-8 font-semibold">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
