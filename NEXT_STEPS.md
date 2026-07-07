# Tablo — Production Hardening: Status & Next Steps

Full plan: `~/.claude/plans/here-s-todo-list-1-mossy-cerf.md`. Stack decisions
(fixed): Postgres + Prisma (Neon in prod), deploy on Vercel, email via Resend,
uploads on Cloudflare R2.

## ✅ Done

### Phase 1 — Postgres + Prisma foundation
- All in-memory `globalThis` stores replaced with Prisma repositories, same
  export names, now async: `src/lib/{restaurants,menu,orders,workers,uploads}/store.ts`,
  `src/lib/auth/accounts.ts`, `src/lib/menu/generation-store.ts`.
- Schema: `prisma/schema.prisma` — includes ModifierGroup/ModifierOption
  (already stores sizes/add-ons as groups; the store converts back to legacy
  `sizes`/`addons` until Phase 4), `Order.updatedAt` + index (ready for SSE
  later), Session / VerificationToken / RateLimit tables.
- Orders: external id stays `ord-NNNN` (per-restaurant `displayId`, atomic
  `orderSeq` increment); order lines stay denormalized so history survives menu edits.
- Seed: `npx prisma db seed` → demo account `sofia@bella.com`/`tablo123`
  (scrypt-hashed; plaintext STAFF_USERS deleted), Bella Trattoria (`demo: true`),
  menu, workers (PINs 1111/2222/3333, hashed), 2 live orders. Synthetic
  analysis history seeds lazily on the Analysis page — **demo restaurant only**;
  real restaurants never get synthetic orders.
- `runMenuGeneration` now runs inside `after()` (survives serverless response).
- Local dev: Postgres 16 in Docker (`tablo-postgres`, user/pw/db = `tablo`),
  `DATABASE_URL` in `.env`.

### Phase 2 — Kitchen check-in leak fixed
- `GET /api/kitchen/workers` **deleted** (it exposed names/roles/phones/emails
  with only the kitchen code).
- Clock-in is PIN-first: `POST /api/kitchen/clock {pin, action?}` — server
  resolves the worker from the PIN (`findWorkerByPin`), toggles the shift when
  `action` omitted, returns first name only. Kitchen ClockTab is now a keypad
  (`src/app/kitchen/page.tsx`), no roster ever rendered.
- PINs scrypt-hashed (`Worker.pinHash`), unique per restaurant (checked in
  `createWorker`/`updateWorker`, 409 on collision). Manager API never returns
  PINs; the editor treats blank PIN as "keep current".
- Rate limits: kitchen code entry 10/min/IP, clock attempts 8/min/device.

### Phase 3 — Auth & infra hardening
- **Sessions are DB-backed** (`src/lib/auth/session.ts`): opaque 32-byte token
  in `tablo_session`, SHA-256 hash in Session table, sliding 7-day expiry,
  `revokeSession`/`revokeAllSessions`. Logout revokes; password reset revokes all.
- **AUTH_SECRET fail-fast** in production (both session modules throw at boot).
- **Email** (`src/lib/email/mailer.ts`): Resend REST API when `RESEND_API_KEY`
  set, console logging otherwise. Flows: signup sends verification link;
  `GET/POST /api/auth/verify-email`; `/forgot-password` + `/reset-password`
  pages and routes; hashed single-use tokens (`src/lib/auth/tokens.ts`,
  24h verify / 1h reset); dashboard banner nags until verified.
- **Rate limiting** (`src/lib/rate-limit.ts`): Postgres fixed-window, atomic
  upsert, swappable interface. Applied to login/signup/forgot/reset/verify,
  kitchen session+clock, guest `POST /api/orders`, uploads.
- **Uploads → R2** (`src/lib/uploads/storage.ts`, S3 SDK): bytes go to R2 when
  `R2_*` env vars are set, else stay in Postgres (dev fallback).
  `GET /api/uploads/[id]` 307-redirects to the R2 public URL when applicable,
  so stored `imageUrl`s never change. AI generation fetches bytes via
  `getUploadData()`.

All verified end-to-end: tsc clean, manual flows (login, guest order, kitchen
PIN clock-in, order advance, token replay rejection, session revocation,
uploads).

### Phase 4 — Cuisine-flexible modifier groups
- `src/lib/types.ts`: `ModifierGroup {id,label,min,max,required,options}` /
  `ModifierOption {id,label,priceDelta,note?}` on `MenuItem.modifierGroups`;
  legacy `SizeOption`/`AddOn` types **deleted**. `CartLine` carries
  `optionIds` (for server pricing) + `optionLabels` (display).
- `src/lib/cart.ts`: `unitPriceFor(item, selectedOptions)`,
  `selectedOptionsFor(item, ids)` (resolves in menu order),
  `buildLineId(itemId, optionIds)`.
- **Server-side pricing** (`src/lib/orders/price.ts`, pure + tested): guests
  POST `{itemId, quantity, optionIds}` only; `priceOrder()` validates against
  the live menu (unknown/sold-out item, foreign/duplicate option ids, per-group
  min/max, required ⇒ ≥1) and recomputes unit prices + subtotal. Client prices
  are never parsed (`orders/validate.ts` shape-checks with hard caps: ≤50
  lines, qty ≤99, ≤40 option ids, notes ≤300).
- `OrderLine.optionLabels` (new column, migration
  `20260707120413_order_line_option_labels`); old `sizeLabel`/`addonLabels`
  kept read-only and folded into `optionLabels` on read so history renders
  (seed's ord-1001/1002 exercise this on purpose).
- Guest sheet: groups render as radios (max=1) / checkboxes with "Pick up to
  N" hint; required single-choice groups preselect the first option; Add
  disabled with "Choose <group> first" until mins met; max cap blocks extra
  picks; optional radio can deselect.
- Menu editor: "Guest choices" group CRUD (label, required switch, min/max,
  options with delta+note, ≤6 groups); min/max clamped client-side to the
  option count. `menu/validate.ts` enforces the same rules server-side
  (hand-rolled parse like the rest of the file, not zod).
- AI generation: schema + prompt emit optional modifierGroups (size/protein/
  spice/sides); `sanitizeGroups()` clamps model output to store-valid shapes.
- Legacy conversion layer in `menu/store.ts` (`isSizeGroup`, size/addon
  `groupsCreate`) removed; store speaks groups natively.
- Verified: tsc + eslint clean, 171 tests passing; Playwright drive of guest
  flow (price updates, radio replace, required gate, max cap, review, send →
  server-priced 201) and dashboard editor round-trip; curl probes for price
  tampering / invalid selections all rejected.

### Phase 5 — Live order timers (SSE deferred per user)
- `src/lib/use-now.ts`: shared `useNow(30s)` hook — visibility-aware (interval
  stops while the tab is hidden, snaps to fresh time on return).
- `OrderCard` takes `now` (from useNow in orders board / overview / kitchen)
  + `escalate`: kitchen cards go amber ≥10 min, red ≥20 min (non-served only).
- (Still deferred: SSE dashboard updates. `Order.updatedAt` + index exist, so
  it can be added later without a migration.)

### Phase 6 — AOV & items-per-order + CSV export
- `stats.ts`: `periodSummary` gains items / itemsPerOrder / avgOrder+items
  trends; `series.ts`: `SalesEvent.items`, per-bucket `avgOrder`/
  `itemsPerOrder`, period `totalItems`/`avgItems`.
- Explorer metric toggle is now Revenue / Orders / Avg order / Items-per-order
  (per-period trend badge works for all four). Overview adds an Items/order
  tile (no trend arrows there — the live-orders feed has no baseline period).
- `src/lib/csv.ts` (pure, tested, incl. spreadsheet formula-injection guard).
  `GET /api/export/orders` streams one row per order line via cursor-paginated
  reads (`?from&to&includeSeeded=1`); `GET /api/export/analytics?report=daily|items`
  aggregates in paginated passes. Download buttons on Analysis (3 CSVs) +
  Orders board (Export CSV).

### Phase 7 — Volume-aware insights
- `stats.ts`: `ItemStat.distinctDays` + new `activitySummary()` (totalOrders,
  prevTotalOrders, activeDays, activeWeekendDays).
- `insights.ts`: global guard (<30 orders or <7 active days → single "insights
  unlock as orders come in"), baselines scale `max(8, ceil(0.02×prevTotalOrders))`
  (applied to decliners **and** rising stars), item trends need ≥3 distinct
  sale days, day-of-week rules need ≥2 active weekend days, peak hour needs
  ≥5 orders & ≥10% share; <200 orders → thresholds widen to −50%/+30% and
  `confidence: "low"` renders muted with a "based on limited data" caption.
- Table-driven vitest: empty / 20 / 3-busy-days / 100 / 200 / demo-scale.
- Analysis page: demo-only footnote about sample history (was unconditional).

### Cleanup / deploy
- README rewritten where stale: Postgres/Prisma setup + Docker quickstart,
  PIN-first kitchen (no roster endpoint), DB sessions/scrypt auth, R2 uploads,
  modifier groups + server-side pricing, volume-aware insights, export routes,
  a "Deploying (Vercel + Neon + R2 + Resend)" section.
- `.env.example` added (all env vars with comments). `postinstall: prisma
  generate` added for Vercel builds.
- **AUTH_SECRET fail-fast fix**: the module-load check now exempts
  `NEXT_PHASE=phase-production-build` — `next build` used to die collecting
  page data without secrets; the running server still refuses (verified:
  `next start` without secret → 500 + boot error; with secret → all flows 200).
- Dev test data wiped (min@seoul.com / Seoul Kitchen, test upload).
- Verified: `npm run build` clean, 190 tests, eslint clean; Playwright over
  analysis explorer metrics, overview tile, kitchen escalation (red at 3h),
  CSV endpoints (401 unauth, 400 bad params, 7k-row seeded stream, date
  filters); prod-mode smoke test (login, CSV, guest order, analysis).
- Nothing is committed yet — the whole change set is in the working tree.

## 🔜 Later (explicitly deferred)
- SSE live dashboard updates (schema ready: `Order.updatedAt` + index).
- Swap rate-limit Postgres backend for Upstash if serverless DB round-trips
  become a concern (interface already isolated in `src/lib/rate-limit.ts`).
