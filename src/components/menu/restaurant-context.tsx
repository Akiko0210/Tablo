"use client";

import * as React from "react";
import type { Restaurant } from "@/lib/types";

/** Serializable restaurant snapshot the guest menu renders from. Resolved
 * server-side by slug and passed down — menu components must not import the
 * demo mock directly, or every tenant would see the same menu. */
export interface GuestRestaurant extends Restaurant {
  slug: string;
}

const RestaurantContext = React.createContext<GuestRestaurant | null>(null);

export function RestaurantProvider({
  restaurant,
  children,
}: {
  restaurant: GuestRestaurant;
  children: React.ReactNode;
}) {
  return (
    <RestaurantContext.Provider value={restaurant}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant(): GuestRestaurant {
  const value = React.useContext(RestaurantContext);
  if (!value) {
    throw new Error("useRestaurant must be used inside <RestaurantProvider>");
  }
  return value;
}
