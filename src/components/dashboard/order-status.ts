import type { OrderStatus } from "@/lib/orders/types";

interface StatusMeta {
  label: string;
  /** Tailwind classes for the status badge. */
  badge: string;
  /** Tailwind classes for the column accent dot. */
  dot: string;
  /** The status this one advances to, if any. */
  next?: OrderStatus;
  /** Label for the advance action. */
  nextLabel?: string;
}

export const statusMeta: Record<OrderStatus, StatusMeta> = {
  new: {
    label: "New",
    badge: "bg-brand-soft text-brand-strong border-brand-border",
    dot: "bg-brand",
    next: "preparing",
    nextLabel: "Start preparing",
  },
  preparing: {
    label: "Preparing",
    badge: "bg-secondary text-foreground",
    dot: "bg-foreground",
    next: "ready",
    nextLabel: "Mark ready",
  },
  ready: {
    label: "Ready",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    next: "served",
    nextLabel: "Mark served",
  },
  served: {
    label: "Served",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};
