import { redirect } from "next/navigation";
import { DEMO_RESTAURANT_SLUG } from "@/lib/restaurants/store";

// A bare /m has no restaurant or table — send guests to the demo menu.
export default function MenuIndex() {
  redirect(`/m/${DEMO_RESTAURANT_SLUG}/1`);
}
