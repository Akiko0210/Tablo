import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../cart-context";
import { cartItemCount, cartSubtotal } from "@/lib/cart";

function setup() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
}

const base = {
  itemId: "margherita",
  name: "Margherita",
  quantity: 1,
  unitPrice: 14,
  optionIds: [] as string[],
  optionLabels: [] as string[],
};

const regular = { optionIds: ["reg"], optionLabels: ['Regular · 12"'] };
const large = { optionIds: ["lg"], optionLabels: ['Large · 16"'] };

describe("cart reducer via context", () => {
  it("starts empty", () => {
    const { result } = setup();
    expect(result.current.lines).toHaveLength(0);
  });

  it("merges identical configurations into one line", () => {
    const { result } = setup();
    act(() => result.current.add({ ...base, ...regular }));
    act(() => result.current.add({ ...base, ...regular, quantity: 2 }));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].quantity).toBe(3);
    expect(cartItemCount(result.current.lines)).toBe(3);
    expect(cartSubtotal(result.current.lines)).toBe(42);
  });

  it("keeps different configurations as separate lines", () => {
    const { result } = setup();
    act(() => result.current.add({ ...base, ...regular }));
    act(() =>
      result.current.add({
        ...base,
        unitPrice: 21,
        optionIds: ["lg", "mozz"],
        optionLabels: ['Large · 16"', "Extra mozzarella"],
      }),
    );
    expect(result.current.lines).toHaveLength(2);
  });

  it("removes a line when quantity drops to zero", () => {
    const { result } = setup();
    act(() => result.current.add({ ...base, ...regular }));
    const id = result.current.lines[0].lineId;
    act(() => result.current.setQuantity(id, 0));
    expect(result.current.lines).toHaveLength(0);
  });

  it("updates a line note", () => {
    const { result } = setup();
    act(() => result.current.add({ ...base, ...regular }));
    const id = result.current.lines[0].lineId;
    act(() => result.current.setNote(id, "  extra crispy  "));
    expect(result.current.lines[0].note).toBe("extra crispy");
  });

  it("clears the whole cart", () => {
    const { result } = setup();
    act(() => result.current.add({ ...base, ...regular }));
    act(() => result.current.add({ ...base, ...large, unitPrice: 18 }));
    act(() => result.current.clear());
    expect(result.current.lines).toHaveLength(0);
  });
});
