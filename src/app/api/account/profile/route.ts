import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import {
  findAccountById,
  toSafeAccount,
  updateAccountProfile,
} from "@/lib/auth/accounts";
import { parseProfileInput } from "@/lib/auth/validate-signup";
import { runMenuGeneration } from "@/lib/menu/generate";

// PATCH /api/account/profile — step 3 of the wizard: save restaurant details
// and mark onboarding complete. Only accounts created via /signup have a
// profile to update (the seeded demo user does not).
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseProfileInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid profile" },
      { status: 400 },
    );
  }

  if (!findAccountById(session.userId)) {
    return NextResponse.json(
      { error: "This account can't be updated." },
      { status: 404 },
    );
  }

  const account = updateAccountProfile(session.userId, parsed.data);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Onboarding is complete — analyze the uploaded menu photos with Claude in
  // the background so the items are (usually) ready by the time the owner
  // opens the Menu section. Fire-and-forget; the job records its own status.
  void runMenuGeneration(account.id, account.restaurantId);

  return NextResponse.json({ account: toSafeAccount(account) });
}
