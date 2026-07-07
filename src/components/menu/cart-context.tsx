"use client";

import * as React from "react";
import type { CartLine } from "@/lib/types";
import { buildLineId } from "@/lib/cart";

type AddPayload = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  optionIds: string[];
  optionLabels: string[];
  note?: string;
};

type Action =
  | { type: "add"; payload: AddPayload }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "setNote"; lineId: string; note: string }
  | { type: "remove"; lineId: string }
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "clear" };

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const p = action.payload;
      const lineId = buildLineId(p.itemId, p.optionIds);
      const existing = state.find((l) => l.lineId === lineId);
      // Merge identical configurations; a note makes a line distinct enough
      // that we keep the incoming note rather than silently dropping it.
      if (existing) {
        return state.map((l) =>
          l.lineId === lineId
            ? {
                ...l,
                quantity: l.quantity + p.quantity,
                note: p.note?.trim() ? p.note.trim() : l.note,
              }
            : l,
        );
      }
      const line: CartLine = {
        lineId,
        itemId: p.itemId,
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        optionIds: p.optionIds,
        optionLabels: p.optionLabels,
        note: p.note?.trim() || undefined,
      };
      return [...state, line];
    }
    case "setQuantity": {
      if (action.quantity <= 0) {
        return state.filter((l) => l.lineId !== action.lineId);
      }
      return state.map((l) =>
        l.lineId === action.lineId ? { ...l, quantity: action.quantity } : l,
      );
    }
    case "setNote":
      return state.map((l) =>
        l.lineId === action.lineId
          ? { ...l, note: action.note.trim() || undefined }
          : l,
      );
    case "remove":
      return state.filter((l) => l.lineId !== action.lineId);
    case "hydrate":
      return action.lines;
    case "clear":
      return [];
    default:
      return state;
  }
}

// --- localStorage persistence ------------------------------------------------
// A guest who refreshes, backgrounds the tab, or reopens the QR link mid-meal
// should find their order intact. Scoped per restaurant+table and time-bounded
// so a cart doesn't resurrect on a later visit.

/** A table cart shouldn't outlive the visit. */
const CART_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface StoredCart {
  savedAt: number;
  lines: CartLine[];
}

function isValidLine(l: unknown): l is CartLine {
  if (!l || typeof l !== "object") return false;
  const line = l as Record<string, unknown>;
  return (
    typeof line.lineId === "string" &&
    typeof line.itemId === "string" &&
    typeof line.name === "string" &&
    typeof line.quantity === "number" &&
    typeof line.unitPrice === "number" &&
    Array.isArray(line.optionIds) &&
    Array.isArray(line.optionLabels)
  );
}

function loadCart(key: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    const fresh =
      parsed &&
      typeof parsed.savedAt === "number" &&
      Date.now() - parsed.savedAt <= CART_TTL_MS &&
      Array.isArray(parsed.lines);
    if (!fresh) {
      window.localStorage.removeItem(key);
      return [];
    }
    // Drop anything that doesn't match the current line shape (stale format,
    // hand-edited storage). Prices here are display-only — the server
    // re-prices every line on submit — so a stale cached price is harmless.
    return parsed.lines.filter(isValidLine);
  } catch {
    return [];
  }
}

function saveCart(key: string, lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    if (lines.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const payload: StoredCart = { savedAt: Date.now(), lines };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Private mode / quota exceeded — the cart just won't persist. Not fatal.
  }
}

interface CartContextValue {
  lines: CartLine[];
  add: (payload: AddPayload) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setNote: (lineId: string, note: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  storageKey,
}: {
  children: React.ReactNode;
  /** Per restaurant+table key so different tables don't share a cart. */
  storageKey: string;
}) {
  const [lines, dispatch] = React.useReducer(reducer, []);

  // Load the saved cart after mount (not in a lazy initializer) so the server
  // and first client render both start empty — no hydration mismatch — then
  // the saved lines fold in.
  React.useEffect(() => {
    const saved = loadCart(storageKey);
    if (saved.length > 0) dispatch({ type: "hydrate", lines: saved });
  }, [storageKey]);

  // Persist on every change, skipping the initial mount render so we never
  // clobber the saved cart with the empty starting state before it loads.
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCart(storageKey, lines);
  }, [lines, storageKey]);

  const value = React.useMemo<CartContextValue>(
    () => ({
      lines,
      add: (payload) => dispatch({ type: "add", payload }),
      setQuantity: (lineId, quantity) =>
        dispatch({ type: "setQuantity", lineId, quantity }),
      setNote: (lineId, note) => dispatch({ type: "setNote", lineId, note }),
      remove: (lineId) => dispatch({ type: "remove", lineId }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [lines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
