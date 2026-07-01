import type { MenuItem, Restaurant } from "./types";

// ---------------------------------------------------------------------------
// Mock data. In production this would be served from the Tablo dashboard API
// and mirror it in real time; here it lives in-repo so the demo runs with zero
// setup. Prices are in USD major units.
// ---------------------------------------------------------------------------

const PIZZA_SIZES = [
  { id: "reg", label: 'Regular · 12"', priceDelta: 0, note: "Included" },
  { id: "lg", label: 'Large · 16"', priceDelta: 4 },
];

const PIZZA_ADDONS = [
  { id: "mozz", label: "Extra mozzarella", price: 3 },
  { id: "truffle", label: "Truffle oil drizzle", price: 2 },
  { id: "nduja", label: "'Nduja", price: 3 },
];

const items: MenuItem[] = [
  // ---- Pizza ----
  {
    id: "margherita",
    name: "Margherita",
    description:
      "Naples-style sourdough base, San Marzano tomatoes, fior di latte, fresh basil, and a finish of cold-pressed olive oil.",
    price: 14,
    categoryId: "pizza",
    tags: ["Vegetarian", "Contains gluten", "Dairy"],
    emoji: "🍕",
    popular: true,
    sizes: PIZZA_SIZES,
    addons: PIZZA_ADDONS,
  },
  {
    id: "diavola",
    name: "Diavola",
    description: "Spicy salami, Calabrian chili, fior di latte, tomato.",
    price: 16,
    categoryId: "pizza",
    tags: ["Spicy", "Contains gluten", "Dairy"],
    emoji: "🍕",
    popular: true,
    sizes: PIZZA_SIZES,
    addons: PIZZA_ADDONS,
  },
  {
    id: "marinara",
    name: "Marinara",
    description: "Tomato, garlic, oregano, olive oil — no cheese, all depth.",
    price: 12,
    categoryId: "pizza",
    tags: ["Vegan", "Contains gluten"],
    emoji: "🍅",
    sizes: PIZZA_SIZES,
    addons: PIZZA_ADDONS,
  },
  {
    id: "quattro-formaggi",
    name: "Quattro Formaggi",
    description: "Mozzarella, gorgonzola, fontina, parmesan, cracked pepper.",
    price: 17,
    categoryId: "pizza",
    tags: ["Vegetarian", "Contains gluten", "Dairy"],
    emoji: "🧀",
    soldOut: true,
    sizes: PIZZA_SIZES,
    addons: PIZZA_ADDONS,
  },

  // ---- Pasta ----
  {
    id: "tagliatelle-ragu",
    name: "Tagliatelle al Ragù",
    description: "Slow-cooked beef ragù, hand-cut tagliatelle, parmesan.",
    price: 18,
    categoryId: "pasta",
    tags: ["Contains gluten", "Dairy"],
    emoji: "🍝",
    popular: true,
    addons: [
      { id: "parm", label: "Extra parmesan", price: 2 },
      { id: "chili", label: "Chili flakes", price: 0 },
    ],
  },
  {
    id: "cacio-e-pepe",
    name: "Cacio e Pepe",
    description: "Tonnarelli, pecorino romano, toasted black pepper.",
    price: 15,
    categoryId: "pasta",
    tags: ["Vegetarian", "Contains gluten", "Dairy"],
    emoji: "🧀",
  },
  {
    id: "vongole",
    name: "Spaghetti alle Vongole",
    description: "Clams, white wine, garlic, parsley, chili, olive oil.",
    price: 19,
    categoryId: "pasta",
    tags: ["Contains gluten"],
    emoji: "🍝",
  },
  {
    id: "gnocchi",
    name: "Gnocchi alla Sorrentina",
    description: "Potato gnocchi baked with tomato, basil, and molten mozzarella.",
    price: 16,
    categoryId: "pasta",
    tags: ["Vegetarian", "Contains gluten", "Dairy"],
    emoji: "🥔",
  },

  // ---- Dolci ----
  {
    id: "tiramisu",
    name: "Tiramisù",
    description: "Espresso-soaked savoiardi, mascarpone cream, cocoa.",
    price: 9,
    categoryId: "dolci",
    tags: ["Vegetarian", "Contains gluten", "Dairy"],
    emoji: "🍰",
  },
  {
    id: "panna-cotta",
    name: "Panna Cotta",
    description: "Vanilla bean set cream, seasonal berry compote.",
    price: 8,
    categoryId: "dolci",
    tags: ["Vegetarian", "Gluten-free", "Dairy"],
    emoji: "🍮",
  },

  // ---- Drinks ----
  {
    id: "negroni",
    name: "Negroni",
    description: "Gin, Campari, sweet vermouth, orange peel.",
    price: 13,
    categoryId: "drinks",
    tags: [],
    emoji: "🍸",
    popular: true,
  },
  {
    id: "aperol-spritz",
    name: "Aperol Spritz",
    description: "Aperol, prosecco, soda, fresh orange.",
    price: 11,
    categoryId: "drinks",
    tags: [],
    emoji: "🍹",
  },
  {
    id: "house-red",
    name: "House Red — Chianti",
    description: "Sangiovese, cherry and herb, by the glass.",
    price: 10,
    categoryId: "drinks",
    tags: ["Vegan"],
    emoji: "🍷",
  },
  {
    id: "san-pellegrino",
    name: "San Pellegrino",
    description: "Sparkling mineral water, 500ml.",
    price: 4,
    categoryId: "drinks",
    tags: ["Vegan", "Gluten-free"],
    emoji: "💧",
  },
  {
    id: "espresso",
    name: "Espresso",
    description: "Single origin, pulled to order.",
    price: 3,
    categoryId: "drinks",
    tags: ["Vegan", "Gluten-free"],
    emoji: "☕",
  },
];

export const restaurant: Restaurant = {
  id: "bella-trattoria",
  name: "Bella Trattoria",
  initials: "B",
  tagline: "Wood-fired · Dine in",
  currency: "USD",
  tableCount: 12,
  categories: [
    { id: "popular", label: "Popular" },
    { id: "pizza", label: "Pizza" },
    { id: "pasta", label: "Pasta" },
    { id: "dolci", label: "Dolci" },
    { id: "drinks", label: "Drinks" },
  ],
  items,
};

/** Items to show for a given category id. "popular" is a virtual category. */
export function itemsForCategory(categoryId: string): MenuItem[] {
  if (categoryId === "popular") return items.filter((i) => i.popular);
  return items.filter((i) => i.categoryId === categoryId);
}

export function findItem(itemId: string): MenuItem | undefined {
  return items.find((i) => i.id === itemId);
}

/** Case-insensitive search across name, description, and tags. */
export function searchItems(query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((i) => {
    const haystack = `${i.name} ${i.description} ${i.tags.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}
