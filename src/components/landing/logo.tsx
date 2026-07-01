import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-brand text-[15px] font-extrabold text-brand-foreground">
        T
      </span>
      <span className="text-lg font-bold tracking-tight">Tablo</span>
    </span>
  );
  if (href === null) return inner;
  return <Link href={href}>{inner}</Link>;
}
