# Tablo

Multi-tenant restaurant operations platform: a **guest QR menu ordering
experience**, a **per-restaurant dashboard** (orders, AI-generated menu,
analysis, QR codes, team), a **kitchen companion app**, and a **marketing
landing page**. Built with Next.js 16 (App Router), React 19, Tailwind v4,
shadcn/ui (Base UI primitives), Recharts, and the Anthropic API for menu
extraction from photos.

The design follows the Tablo design system: neutral/white base, a single
orange accent (`#F67522`), Inter, 12px radius.

## Getting started

Tablo stores everything in **Postgres via Prisma**. For local dev, run
Postgres in Docker and point `DATABASE_URL` at it (see `.env.example`):

```bash
docker run -d --name tablo-postgres -p 5432:5432 \
  -e POSTGRES_USER=tablo -e POSTGRES_PASSWORD=tablo -e POSTGRES_DB=tablo \
  postgres:16

npm install
cp .env.example .env          # then fill in DATABASE_URL (and optional keys)
npx prisma migrate dev        # create the schema
npx prisma db seed            # demo account + Bella Trattoria
npm run dev                   # http://localhost:3000
```

Optional: set `ANTHROPIC_API_KEY` (or run `ant auth login`) so the AI
photo → menu generation works. Without `RESEND_API_KEY` emails are logged to
the console; without `R2_*` vars upload bytes stay in Postgres.

**Demo account:** `sofia@bella.com` / `tablo123` (prefilled on the login
form) — owns the seeded demo restaurant *Bella Trattoria* (slug `bella`,
kitchen code `BELLA-1234`, worker PINs 1111/2222/3333).

## Multi-tenancy

Every dashboard account owns exactly one restaurant, and **nothing is shared
between restaurants**: orders, menu items, analysis, QR codes, workers, and
the kitchen queue are all scoped by restaurant
([`src/lib/restaurants/store.ts`](src/lib/restaurants/store.ts) is the
tenancy root). Signing up creates a new restaurant with its own URL slug
(`/m/<slug>/<table>`) and kitchen code; the demo account sees only Bella
Trattoria's data.

## Routes

| Route                  | What it is                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| `/`                    | Marketing landing page.                                                 |
| `/m/[restaurant]/[table]` | The guest menu, e.g. `/m/bella/7`. The full ordering flow.           |
| `/m/[restaurant]`      | Redirects to table 1; bare table numbers (legacy `/m/7`) go to the demo restaurant. |
| `/qr`                  | Public demo QR generator (demo restaurant).                             |
| `/kitchen`             | Kitchen companion app — clock in/out + order queue (kitchen code auth). |
| `/login` / `/signup`   | Staff sign-in / 4-step registration wizard.                             |
| `/dashboard`           | Overview — live stats + active orders.                                  |
| `/dashboard/orders`    | Live orders board (New → Preparing → Ready → Served).                   |
| `/dashboard/menu`      | Menu manager — edit AI-generated items, add/delete, sold-out toggles.   |
| `/dashboard/analysis`  | Revenue charts, per-item performance, AI suggestions.                   |
| `/dashboard/qr`        | Per-table QR codes for *your* restaurant (PNG download, print).         |
| `/dashboard/team`      | Worker profiles, live presence, hours today.                            |
| `/dashboard/settings`  | Edit the onboarding info + manage menu photos.                          |

All `/dashboard/*` pages require a staff session (the layout redirects to
`/login`).

### API

| Endpoint                    | Method       | Access  | Purpose                                        |
| --------------------------- | ------------ | ------- | ---------------------------------------------- |
| `/api/orders?restaurant=<slug>` | POST     | public  | Guests submit an order to that restaurant.     |
| `/api/orders`               | GET          | staff   | Your restaurant's live orders (dashboard polls). |
| `/api/orders/[id]`          | PATCH        | staff   | Advance an order (tenant-guarded).             |
| `/api/menu`                 | GET/POST     | staff   | List / add menu items (+ AI job status).       |
| `/api/menu/[id]`            | PATCH/DELETE | staff   | Edit / remove a menu item.                     |
| `/api/menu/generate`        | GET/POST     | staff   | Poll / (re-)run the AI photo analysis.         |
| `/api/restaurant`           | PATCH        | staff   | Save Settings (name, tagline, tables, …).      |
| `/api/workers`              | GET/POST     | staff   | Worker profiles + presence / add worker.       |
| `/api/workers/[id]`         | PATCH/DELETE | staff   | Edit / remove a worker.                        |
| `/api/kitchen/session`      | GET/POST/DELETE | device | Kitchen-code sign-in for the shared device.  |
| `/api/kitchen/clock`        | POST         | kitchen | Clock in/out with the 4-digit PIN alone (the server resolves the worker; no roster is ever sent to the device). |
| `/api/kitchen/orders[/[id]]`| GET/PATCH    | kitchen | Live queue / advance an order.                 |
| `/api/auth/login|logout|signup` | POST     | public  | Session management (DB-backed, revocable sessions). |
| `/api/auth/forgot-password|reset-password` | POST | public | Password reset (hashed single-use tokens; reset revokes all sessions). |
| `/api/auth/verify-email`    | GET/POST     | public  | Email verification links.                      |
| `/api/uploads[/[id]]`       | GET/POST/DELETE | staff (GET by id public) | Menu photos (R2 or Postgres). |
| `/api/account/profile`      | PATCH        | staff   | Finish onboarding (also fires AI generation).  |
| `/api/export/orders`        | GET          | staff   | CSV of order lines (`?from&to&includeSeeded=1`), streamed. |
| `/api/export/analytics`     | GET          | staff   | CSV reports: `?report=daily` or `?report=items`. |

All auth-adjacent and guest-facing endpoints are rate-limited
(Postgres-backed fixed window, [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)).

## AI menu generation (photos → menu items)

During signup the owner uploads photos of dishes or printed menus. When
onboarding completes, the server sends those photos to **Claude
(`claude-opus-4-8`, vision + structured outputs)** and extracts menu items —
name, description, price (never invented; `$0` when not visible), category,
emoji ([`src/lib/menu/generate.ts`](src/lib/menu/generate.ts)). The job runs
in the background; its status shows as a banner on **Dashboard → Menu**,
where every generated item is editable (they're tagged “AI”). “Generate from
photos” re-runs the analysis (replacing previous AI items, never manual
ones). Without API credentials the job fails gracefully with a hint and
items can be added by hand.

## Analysis

**Dashboard → Analysis** is built around one **explorer chart**
([`revenue-explorer.tsx`](src/components/dashboard/revenue-explorer.tsx)):

- Toggle the metric between **Revenue / Orders / Avg order / Items-per-order**.
- Toggle the granularity between **Day / Week / Month / Year**, and step
  through time with the ‹ › range navigator — Day shows one calendar day by
  hour (next → the next day), Week shows Mon–Sun, Month shows every day of the
  month, Year shows all 12 months. "Next" is disabled on the current period.
- Bars for Day/Week (few discrete buckets); a filled trend line (area chart)
  for Month/Year, which reads far better than bars at that density.
- The headline shows the selected period's total with its change vs the
  immediately preceding period.

All bucketing is pure and unit-tested
([`src/lib/analysis/series.ts`](src/lib/analysis/series.ts)). Below the chart,
plain-language **suggestions** are computed from the order data
([`src/lib/analysis/insights.ts`](src/lib/analysis/insights.ts)) — items
selling low for a month (“maybe change the menu”), rising stars, dishes that
never sell, strongest day, weekend lift, peak hour — followed by a per-item
performance table (orders, revenue, trend vs the previous 28 days).

The suggestions are **volume-aware**: with under ~30 orders or a week of
history the strip shows a single "insights unlock as orders come in" note;
under ~200 orders thresholds widen and whatever fires renders muted as
"based on limited data". Baselines scale with order volume, item trends need
sales on 3+ distinct days, and day-of-week claims need at least two weekend
days of data.

**Sample history is demo-only.** The seeded Bella Trattoria gets roughly a
year of deterministic sample sales generated from its menu
([`src/lib/analysis/seed-history.ts`](src/lib/analysis/seed-history.ts)) on
first Analysis visit; real restaurants start empty and rely on the guards
above. Sample history never appears on the live orders board, and CSV exports
exclude it unless `includeSeeded=1`.

## Team & the kitchen app

**Dashboard → Team**: manager-maintained worker profiles (name, role, phone,
email, 4-digit PIN) with live presence — who's on shift, since when, hours
worked today.

**`/kitchen`** is the separate app for kitchen staff, meant for a shared
tablet: sign the device in once with the restaurant's **kitchen code** (shown
on the Team page), then workers clock in/out on a **PIN keypad** — the server
resolves who the PIN belongs to, so the device never sees the roster or any
worker PII. The **Orders** tab is a live queue where they advance orders
(New → Preparing → Ready → Served); waiting orders escalate visually (amber
at 10 minutes, red at 20). Device auth is a separate short-lived cookie
([`src/lib/kitchen/session.ts`](src/lib/kitchen/session.ts)); PINs are
scrypt-hashed, unique per restaurant, and rate-limited.

## Menu scanning

QR codes encode an **absolute** URL to a table's menu
(`<origin>/m/<slug>/<table>`), built from the live `window.location.origin` —
so codes work on `localhost` or over your LAN IP. To test on a real phone:
run `npm run dev`, open `http://<LAN-IP>:3000/dashboard/qr`, scan a code.

## The ordering flow (`/m/[restaurant]/[table]`)

1. **Browse** — search, category chips, dietary tags, live sold-out state.
2. **Item detail** — cuisine-flexible **choice groups** (sizes, protein,
   spice level, add-ons…) rendered as radios or checkboxes with min/max
   enforcement, special requests, quantity; live price.
3. **Order review** — editable cart, per-line notes, kitchen note, totals.
4. **Confirmation & feedback** — star rating + quick feedback, loyalty
   prompt, reorder. Payment is handled separately (at the table), so the flow
   ends at “Send order to kitchen”.

Orders are **priced server-side**: the guest sends item + option ids only,
and the server validates selections against the live menu and recomputes
every price ([`src/lib/orders/price.ts`](src/lib/orders/price.ts)).

Menu edits in the dashboard (price, sold-out, new items) appear on guests'
menus on the next page load.

### Auth

Accounts are Postgres rows with **scrypt-hashed passwords** (the demo account
included). Login issues an opaque token in an httpOnly cookie whose SHA-256
hash lives in the Session table — sliding 7-day expiry, revocable
([`src/lib/auth/session.ts`](src/lib/auth/session.ts)); password reset
revokes every session. Signup sends an email-verification link (Resend, or
console in dev). Every staff route resolves the session **and its
restaurant** via `getStaffContext()` so all reads/writes are tenant-scoped.
`AUTH_SECRET` is required in production — both session modules fail fast at
boot without it.

### Storage

Everything lives in **Postgres via Prisma**
([`prisma/schema.prisma`](prisma/schema.prisma)); the store modules under
`src/lib/*/store.ts` keep their original names/shapes, just async. Upload
bytes go to **Cloudflare R2** when the `R2_*` env vars are set (the
`/api/uploads/[id]` URL 307-redirects to the bucket), with a zero-config
Postgres fallback for dev.

## Testing

```bash
npm run test         # Vitest unit + component tests
npm run lint         # ESLint
npm run build        # Type-check + production build
```

Tests cover cart math, server-side order pricing, money/URL/CSV formatting,
menu queries and validation (incl. modifier groups), the restaurant registry
(slugs, kitchen codes), analysis stats + the explorer's period
bucketing/navigation (`series.ts`) + volume-aware insights + deterministic
history seeding, worker time math / validation, and the auth/signup layer.

## Deploying (Vercel + Neon + R2 + Resend)

1. Create a Postgres database (e.g. Neon) and set `DATABASE_URL` (pooled URL).
2. Set the environment variables — see [`.env.example`](.env.example):
   `AUTH_SECRET` (required), `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
   `EMAIL_FROM`, `APP_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
3. Run `npx prisma migrate deploy` on release (Prisma Client is generated by
   the `postinstall` hook).
4. Seed (`npx prisma db seed`) **only** on demo environments — it creates the
   demo account and restaurant.

## Project structure

```
src/
  app/
    page.tsx                     landing page
    m/[restaurant]/[table]/      guest menu (tenant-scoped)
    kitchen/page.tsx             kitchen companion app
    qr/page.tsx                  public demo QR generator
    login/ signup/               auth pages
    dashboard/                   overview, orders, menu, analysis, qr, team, settings
    api/                         route handlers (orders, menu, workers, kitchen, …)
  components/
    landing/ menu/ auth/ ui/     marketing, ordering flow, wizard, shadcn/ui
    dashboard/                   nav, boards, menu manager, team, charts, settings
  lib/
    restaurants/                 tenancy root: registry, slugs, validation
    menu/                        per-restaurant menu store, AI generation, queries
    orders/                      tenant-scoped order store + validation
    analysis/                    series bucketing, stats, insights, sample history
    workers/                     worker registry, time clock math, validation
    kitchen/                     kitchen-device session
    auth/ uploads/               accounts, sessions, photo store
    cart.ts format.ts menu-url.ts types.ts
```
