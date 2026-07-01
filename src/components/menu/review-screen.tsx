"use client";

import * as React from "react";
import { ChevronLeft, Plus, Trash2, Send, Loader2 } from "lucide-react";
import { cartItemCount, cartSubtotal, lineTotal } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "./quantity-stepper";
import { useCart } from "./cart-context";

export function ReviewScreen({
  tableId,
  onBack,
  onSend,
}: {
  tableId: string;
  onBack: () => void;
  onSend: (kitchenNote: string) => Promise<boolean>;
}) {
  const { lines, setQuantity, remove } = useCart();
  const [kitchenNote, setKitchenNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const count = cartItemCount(lines);
  const subtotal = cartSubtotal(lines);

  async function handleSend() {
    setSending(true);
    const ok = await onSend(kitchenNote);
    // On success this screen unmounts; only reset if we're staying put.
    if (!ok) setSending(false);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-card/90 px-3 py-3 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to menu"
          className="rounded-full"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight">Your order</h1>
          <p className="text-[13px] text-muted-foreground">
            Table {tableId} · {count} {count === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Your order is empty. Add a few dishes to get started.
          </p>
          <Button onClick={onBack} className="rounded-xl">
            Browse the menu
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4 py-3">
            {lines.map((line) => (
              <div
                key={line.lineId}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{line.name}</div>
                    {(line.sizeLabel || line.addonLabels.length > 0) && (
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {[line.sizeLabel, ...line.addonLabels]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    {line.note && (
                      <div className="mt-1 text-[13px] italic text-muted-foreground">
                        “{line.note}”
                      </div>
                    )}
                  </div>
                  <div className="text-right font-semibold tabular-nums">
                    {formatMoney(lineTotal(line))}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <QuantityStepper
                    size="sm"
                    min={1}
                    value={line.quantity}
                    onChange={(n) => setQuantity(line.lineId, n)}
                    aria-label={`Quantity of ${line.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => remove(line.lineId)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={onBack}
              className="h-11 w-full rounded-xl"
            >
              <Plus className="size-4" /> Add more items
            </Button>

            {/* Kitchen note */}
            <div className="mt-1">
              <label
                htmlFor="kitchen-note"
                className="mb-2 block text-sm font-semibold"
              >
                Note for the kitchen
              </label>
              <Textarea
                id="kitchen-note"
                value={kitchenNote}
                onChange={(e) => setKitchenNote(e.target.value)}
                placeholder="Allergies, timing, anything the kitchen should know…"
                className="min-h-20 resize-none"
              />
            </div>
          </div>

          {/* Totals + send */}
          <div className="mt-auto">
            <div className="px-4 pb-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-foreground">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Estimated total</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Payment is handled at the table with your server.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-2">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="h-14 w-full rounded-2xl text-[15px] font-semibold shadow-lg shadow-brand/25"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> Send order to kitchen ·{" "}
                    {formatMoney(subtotal)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
