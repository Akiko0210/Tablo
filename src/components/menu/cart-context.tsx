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
    case "clear":
      return [];
    default:
      return state;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, dispatch] = React.useReducer(reducer, []);

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
