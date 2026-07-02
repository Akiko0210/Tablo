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

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional: set `ANTHROPIC_API_KEY` (or run `ant auth login`) so the AI
photo → menu generation works; everything else runs with zero config.

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
| `/api/kitchen/workers`      | GET          | kitchen | Presence list for the clock screen (no PINs).  |
| `/api/kitchen/clock`        | POST         | kitchen | Clock in/out (`workerId` + 4-digit PIN).       |
| `/api/kitchen/orders[/[id]]`| GET/PATCH    | kitchen | Live queue / advance an order.                 |
| `/api/auth/login|logout|signup` | POST     | public  | Session management.                            |
| `/api/uploads[/[id]]`       | GET/POST/DELETE | staff (GET by id public) | Menu photos.            |
| `/api/account/profile`      | PATCH        | staff   | Finish onboarding (also fires AI generation).  |

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

**Dashboard → Analysis** shows: revenue/orders/avg-order for the last 7 days
vs the 7 before; revenue by week (8 weeks); revenue by day of week; orders by
hour; and a per-item table (orders, revenue, trend vs the previous 28 days).
Above the charts, plain-language **suggestions** are computed from the same
numbers ([`src/lib/analysis/insights.ts`](src/lib/analysis/insights.ts)):
items selling low for a month (“maybe change the menu”), rising stars, dishes
that never sell, strongest/weakest day, weekend lift, peak hour.

So the page is meaningful from day one, each restaurant gets deterministic
sample sales history generated from its own menu
([`src/lib/analysis/seed-history.ts`](src/lib/analysis/seed-history.ts)) the
first time Analysis is opened; real served orders fold into the same numbers.
Sample history never appears on the live orders board.

## Team & the kitchen app

**Dashboard → Team**: manager-maintained worker profiles (name, role, phone,
email, 4-digit PIN) with live presence — who's on shift, since when, hours
worked today.

**`/kitchen`** is the separate app for kitchen staff, meant for a shared
tablet: sign the device in once with the restaurant's **kitchen code** (shown
on Team/Settings), then workers tap their name and enter their PIN to clock
in/out, and the **Orders** tab is a live queue where they advance orders
(New → Preparing → Ready → Served). Device auth is a separate short-lived
cookie ([`src/lib/kitchen/session.ts`](src/lib/kitchen/session.ts)); PINs are
checked per action and never sent to the kitchen client.

## Menu scanning

QR codes encode an **absolute** URL to a table's menu
(`<origin>/m/<slug>/<table>`), built from the live `window.location.origin` —
so codes work on `localhost` or over your LAN IP. To test on a real phone:
run `npm run dev`, open `http://<LAN-IP>:3000/dashboard/qr`, scan a code.

## The ordering flow (`/m/[restaurant]/[table]`)

1. **Browse** — search, category chips, dietary tags, live sold-out state.
2. **Item detail** — sizes, add-ons, special requests, quantity; live price.
3. **Order review** — editable cart, per-line notes, kitchen note, totals.
4. **Confirmation & feedback** — star rating + quick feedback, loyalty
   prompt, reorder. Payment is handled separately (at the table), so the flow
   ends at “Send order to kitchen”.

Menu edits in the dashboard (price, sold-out, new items) appear on guests'
menus on the next page load.

### Auth

Two account sources, unified by
[`src/lib/auth/directory.ts`](src/lib/auth/directory.ts): the seeded demo
user (plaintext password, mock login) and `/signup` accounts (scrypt-hashed).
Login issues a signed (`jose`/HS256) httpOnly session cookie; every staff
route resolves the session **and its restaurant** via `getStaffContext()` so
all reads/writes are tenant-scoped. Set `AUTH_SECRET` in production.

### Storage

All stores (restaurants, menu items, orders, workers/time entries, uploads,
accounts) are in-memory and survive dev HMR via `globalThis` — data persists
while the server runs and resets on restart. Each store is a single file, so
swapping in SQLite/Postgres is localized.

## Testing

```bash
npm run test         # Vitest — 187 unit + component tests
npm run lint         # ESLint
npm run build        # Type-check + production build
```

Tests cover cart math, money/URL formatting, menu queries and validation,
the restaurant registry (slugs, kitchen codes), tenant-scoped order and menu
stores, analysis stats + insights + deterministic history seeding, worker
time math / store / validation, and the auth/signup layer.

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
    analysis/                    stats, insights, deterministic sample history
    workers/                     worker registry, time clock math, validation
    kitchen/                     kitchen-device session
    auth/ uploads/               accounts, sessions, photo store
    cart.ts format.ts menu-url.ts types.ts
```
