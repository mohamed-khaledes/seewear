import { Skeleton } from "@/components/ui/skeleton";

/**
 * Scoped to the listing on purpose. A Suspense boundary above a route that can
 * call notFound() flushes a 200 shell first, which turns a real 404 into a soft
 * one — so /product/[slug] deliberately has no loading file.
 */
export default function Loading() {
  return (
    <div className="bg-concrete">
      <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line bg-concrete p-3 sm:gap-4 sm:p-5 md:grid-cols-3 lg:p-6 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="border border-line bg-paper">
            <Skeleton className="aspect-[1/1.05] rounded-none" />
            <div className="grid gap-2 border-t border-line p-3.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
