import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { guestRestaurantForSlug } from "@/lib/menu/guest";

interface Params {
  restaurant: string;
  table: string;
}

// Next 16: params is async and must be awaited.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { restaurant } = await params;
  const guest = await guestRestaurantForSlug(decodeURIComponent(restaurant));
  if (!guest) return { title: "Menu — Tablo" };
  return {
    title: `${guest.name} — Menu`,
    description: `Browse the menu and order from your table at ${guest.name}.`,
  };
}

export default async function TableMenuPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { restaurant, table } = await params;
  const guest = await guestRestaurantForSlug(decodeURIComponent(restaurant));
  if (!guest) notFound();
  return <MenuApp tableId={decodeURIComponent(table)} restaurant={guest} />;
}
