import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

/**
 * Photo stand-in for a menu item. Uses the item's emoji on a soft gradient
 * tile — production would drop in the restaurant's uploaded photo here.
 */
export function ItemVisual({
  item,
  className,
  emojiClassName,
}: {
  item: MenuItem;
  className?: string;
  emojiClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden bg-gradient-to-br from-muted to-secondary text-2xl",
        className,
      )}
      aria-hidden
    >
      <span className={emojiClassName}>{item.emoji ?? "🍽️"}</span>
    </div>
  );
}
