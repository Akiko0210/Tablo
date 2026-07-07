// Domain model for the Tablo customer menu.

export type DietaryTag =
  | "Vegetarian"
  | "Vegan"
  | "Contains gluten"
  | "Gluten-free"
  | "Dairy"
  | "Nuts"
  | "Spicy";

export interface ModifierOption {
  id: string;
  label: string;
  /** Added to the item's base price when selected. 0 = included. */
  priceDelta: number;
  /** Small note shown next to the option (e.g. "Included"). */
  note?: string;
}

/**
 * A guest-facing choice on a menu item — sizes, protein choice, spice level,
 * sides, add-ons… `max === 1` renders as radios, anything else as checkboxes.
 */
export interface ModifierGroup {
  id: string;
  label: string;
  /** Minimum number of selections a guest must make (0 = optional group). */
  min: number;
  /** Maximum number of selections allowed. */
  max: number;
  /** Required groups block add-to-cart until at least `min` picks are made. */
  required: boolean;
  options: ModifierOption[];
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
  modifierGroups?: ModifierGroup[];
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
  /** Stable id for this specific configuration (item + selected options). */
  lineId: string;
  itemId: string;
  name: string;
  quantity: number;
  /** Unit price including the selected options (before quantity). Display
   * only — the server recomputes prices from `optionIds` on submit. */
  unitPrice: number;
  /** Selected modifier option ids, sent to the server to price the order. */
  optionIds: string[];
  /** Selected option labels in menu order, for display. */
  optionLabels: string[];
  note?: string;
}
