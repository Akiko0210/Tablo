import { describe, it, expect } from "vitest";
import { priceOrder } from "../price";
import type { MenuItem } from "@/lib/types";
import type { NewOrderRequest } from "../types";

const menu: MenuItem[] = [
  {
    id: "bowl",
    name: "Bibimbap",
    description: "",
    price: 15,
    categoryId: "mains",
    tags: [],
    modifierGroups: [
      {
        id: "protein",
        label: "Protein",
        min: 1,
        max: 1,
        required: true,
        options: [
          { id: "beef", label: "Beef", priceDelta: 3 },
          { id: "tofu", label: "Tofu", priceDelta: 0 },
        ],
      },
      {
        id: "extras",
        label: "Extras",
        min: 0,
        max: 2,
        required: false,
        options: [
          { id: "egg", label: "Fried egg", priceDelta: 1.5 },
          { id: "kimchi", label: "Extra kimchi", priceDelta: 2 },
        ],
      },
    ],
  },
  {
    id: "tea",
    name: "Barley tea",
    description: "",
    price: 3,
    categoryId: "drinks",
    tags: [],
  },
  {
    id: "gone",
    name: "Seasonal special",
    description: "",
    price: 20,
    categoryId: "mains",
    tags: [],
    soldOut: true,
  },
];

function request(lines: NewOrderRequest["lines"]): NewOrderRequest {
  return { table: "7", lines };
}

describe("priceOrder", () => {
  it("recomputes unit prices and the subtotal from the menu", () => {
    const result = priceOrder(
      menu,
      request([
        { itemId: "bowl", quantity: 2, optionIds: ["beef", "egg"] },
        { itemId: "tea", quantity: 1, optionIds: [] },
      ]),
    );
    expect(result.error).toBeUndefined();
    expect(result.data!.lines[0]).toMatchObject({
      name: "Bibimbap",
      unitPrice: 19.5,
      optionLabels: ["Beef", "Fried egg"],
    });
    expect(result.data!.subtotal).toBe(19.5 * 2 + 3);
  });

  it("orders option labels by the menu, not the request", () => {
    const result = priceOrder(
      menu,
      request([{ itemId: "bowl", quantity: 1, optionIds: ["kimchi", "tofu"] }]),
    );
    expect(result.data!.lines[0].optionLabels).toEqual([
      "Tofu",
      "Extra kimchi",
    ]);
  });

  it("rejects unknown items and sold-out items", () => {
    expect(
      priceOrder(menu, request([{ itemId: "??", quantity: 1, optionIds: [] }]))
        .error,
    ).toBeTruthy();
    expect(
      priceOrder(menu, request([{ itemId: "gone", quantity: 1, optionIds: [] }]))
        .error,
    ).toBeTruthy();
  });

  it("rejects option ids that don't belong to the item", () => {
    const result = priceOrder(
      menu,
      request([{ itemId: "tea", quantity: 1, optionIds: ["beef"] }]),
    );
    expect(result.error).toBeTruthy();
  });

  it("rejects duplicate option ids", () => {
    const result = priceOrder(
      menu,
      request([{ itemId: "bowl", quantity: 1, optionIds: ["beef", "beef"] }]),
    );
    expect(result.error).toBeTruthy();
  });

  it("enforces a required group even when its min is 0", () => {
    const result = priceOrder(
      menu,
      request([{ itemId: "bowl", quantity: 1, optionIds: [] }]),
    );
    expect(result.error).toMatch(/Protein/);
  });

  it("enforces a group's max", () => {
    const overMax = priceOrder(
      menu,
      request([
        { itemId: "bowl", quantity: 1, optionIds: ["beef", "tofu"] },
      ]),
    );
    expect(overMax.error).toMatch(/Protein/);
  });

  it("rounds money to cents", () => {
    const menuWithThirds: MenuItem[] = [
      { ...menu[1], id: "odd", price: 3.333 },
    ];
    const result = priceOrder(
      menuWithThirds,
      request([{ itemId: "odd", quantity: 3, optionIds: [] }]),
    );
    expect(result.data!.lines[0].unitPrice).toBe(3.33);
    expect(result.data!.subtotal).toBe(9.99);
  });

  it("passes table, notes, and quantities through", () => {
    const result = priceOrder(menu, {
      table: "12",
      kitchenNote: "rush",
      lines: [{ itemId: "tea", quantity: 4, optionIds: [], note: "iced" }],
    });
    expect(result.data).toMatchObject({
      table: "12",
      kitchenNote: "rush",
      lines: [{ quantity: 4, note: "iced" }],
    });
  });
});
