import { notFound, redirect } from "next/navigation";
import {
  DEMO_RESTAURANT_SLUG,
  findRestaurantBySlug,
} from "@/lib/restaurants/store";

// /m/<segment> without a table. Two cases:
//  - <segment> is a restaurant slug -> default to table 1 of that restaurant.
//  - <segment> is a bare table number (legacy /m/7 QR codes and landing-page
//    links from before menus were multi-tenant) -> demo restaurant, that table.
export default async function RestaurantMenuIndex({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const segment = decodeURIComponent(restaurant);

  if (findRestaurantBySlug(segment)) {
    redirect(`/m/${encodeURIComponent(segment)}/1`);
  }
  if (/^\d+$/.test(segment)) {
    redirect(`/m/${DEMO_RESTAURANT_SLUG}/${segment}`);
  }
  notFound();
}
