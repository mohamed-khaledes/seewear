import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The sticky page header: title, subtitle and whatever actions the page needs. */
export function DashboardTopbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-4 lg:px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-grey-2">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2.5">
        {actions}
        <Button asChild variant="outline" size="lg" className="h-10 text-xs font-semibold">
          <Link href="/" target="_blank">
            <ExternalLink />
            Storefront
          </Link>
        </Button>
      </div>
    </div>
  );
}
