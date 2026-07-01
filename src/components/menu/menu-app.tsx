"use client";

import * as React from "react";
import { toast } from "sonner";
import type { MenuItem } from "@/lib/types";
import { cartSubtotal } from "@/lib/cart";
import { CartProvider, useCart } from "./cart-context";
import { BrowseScreen } from "./browse-screen";
import { ItemDetailSheet } from "./item-detail-sheet";
import { OrderBar } from "./order-bar";
import { ReviewScreen } from "./review-screen";
import { SentScreen, type SentOrder } from "./sent-screen";

type Screen = "browse" | "review" | "sent";

function MenuFlow({ tableId }: { tableId: string }) {
  const { lines, clear } = useCart();
  const [screen, setScreen] = React.useState<Screen>("browse");
  const [activeItem, setActiveItem] = React.useState<MenuItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sentOrder, setSentOrder] = React.useState<SentOrder | null>(null);

  function openItem(item: MenuItem) {
    setActiveItem(item);
    setSheetOpen(true);
  }

  async function handleSend(kitchenNote: string): Promise<boolean> {
    // Snapshot the order before clearing so the confirmation screen can show it.
    const snapshotLines = [...lines];
    const subtotal = cartSubtotal(snapshotLines);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableId,
          subtotal,
          kitchenNote,
          lines: snapshotLines.map((l) => ({
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            sizeLabel: l.sizeLabel,
            addonLabels: l.addonLabels,
            note: l.note,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch {
      toast.error("Couldn't send your order. Please try again.");
      return false;
    }

    setSentOrder({ lines: snapshotLines, subtotal });
    clear();
    setScreen("sent");
    scrollTop();
    return true;
  }

  function handleNewOrder() {
    clear();
    setSentOrder(null);
    setScreen("browse");
    scrollTop();
  }

  return (
    <>
      {screen === "browse" && (
        <BrowseScreen tableId={tableId} onSelectItem={openItem} />
      )}
      {screen === "review" && (
        <ReviewScreen
          tableId={tableId}
          onBack={() => {
            setScreen("browse");
            scrollTop();
          }}
          onSend={handleSend}
        />
      )}
      {screen === "sent" && sentOrder && (
        <SentScreen
          tableId={tableId}
          order={sentOrder}
          onNewOrder={handleNewOrder}
        />
      )}

      {screen === "browse" && (
        <OrderBar
          onView={() => {
            setScreen("review");
            scrollTop();
          }}
        />
      )}

      <ItemDetailSheet
        item={activeItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}

function scrollTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0 });
}

/** Full customer menu experience for a table, mounted at /m/[table]. */
export function MenuApp({ tableId }: { tableId: string }) {
  return (
    <div className="flex min-h-dvh justify-center bg-background">
      <div className="relative flex min-h-dvh w-full max-w-[480px] flex-col bg-card sm:border-x sm:border-border sm:shadow-sm">
        <CartProvider>
          <MenuFlow tableId={tableId} />
        </CartProvider>
      </div>
    </div>
  );
}
