import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

/**
 * Photo for a menu item. Shows the restaurant's uploaded image when one is set,
 * otherwise a neutral placeholder on a soft gradient tile.
 */
export function ItemVisual({
  item,
  className,
  iconClassName,
}: {
  item: MenuItem;
  className?: string;
  /** Sizing for the placeholder icon, e.g. "size-8" on larger tiles. */
  iconClassName?: string;
}) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user upload served from /api/uploads
      <img
        src={item.imageUrl}
        alt={item.name}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden bg-gradient-to-br from-muted to-secondary text-muted-foreground",
        className,
      )}
      role="img"
      aria-label={`${item.name} photo placeholder`}
    >
      <ImageIcon className={cn("size-6", iconClassName)} strokeWidth={1.5} />
    </div>
  );
}
