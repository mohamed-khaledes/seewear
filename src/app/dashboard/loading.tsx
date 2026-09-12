import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-5 py-6 lg:px-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
