import { Skeleton } from "@/components/ui/skeleton";

// Instant loading state for every dashboard tab: shown the moment a
// navigation starts, while the server-rendered page streams in. Child
// segments without their own loading file fall back to this one.
export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-44 rounded-lg" />
      <Skeleton className="mt-2.5 h-4 w-72 rounded" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-2xl" />
    </div>
  );
}
