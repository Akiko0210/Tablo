// Domain model for the Tablo customer menu.

export type DietaryTag =
  | "Vegetarian"
  | "Vegan"
  | "Contains gluten"
  | "Gluten-free"
  | "Dairy"
  | "Nuts"
  | "Spicy";

export interface SizeOption {
  id: string;
  label: string;
  /** Added to the base price when selected. 0 = included. */
  priceDelta: number;
  /** Small note shown next to the option (e.g. "Included"). */
  note?: string;
}

export interface AddOn {
  id: string;
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Base price in the restaurant's currency (major units). */
  price: number;
  categoryId: string;
  tags: DietaryTag[];
  /** Emoji/photo stand-in — the design uses a soft photo tile. */
  emoji?: string;
  /** Uploaded photo, served from /api/uploads/[id]. Shown in place of the
   * placeholder tile when present. */
  imageUrl?: string;
  soldOut?: boolean;
  /** Surfaced in the "Popular" tab and flagged with a "Most loved" badge. */
  popular?: boolean;
  sizes?: SizeOption[];
  addons?: AddOn[];
}

export interface Category {
  id: string;
  label: string;
}

export interface Restaurant {
  id: string;
  name: string;
  initials: string;
  tagline: string;
  currency: string; // ISO 4217, e.g. "USD"
  /** Number of tables that have a QR code. */
  tableCount: number;
  categories: Category[];
  items: MenuItem[];
}

/** A configured line in the guest's order. */
export interface CartLine {
  /** Stable id for this specific configuration (item + size + addons). */
  lineId: string;
  itemId: string;
  name: string;
  quantity: number;
  /** Unit price including the selected size + add-ons (before quantity). */
  unitPrice: number;
  sizeLabel?: string;
  addonLabels: string[];
  note?: string;
}
