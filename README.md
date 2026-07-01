# Tablo

Restaurant operations platform — this repo contains the **guest-facing QR menu ordering experience** plus a **marketing landing page**, built with Next.js 16 (App Router), React 19, Tailwind v4, and shadcn/ui (Base UI primitives).

The design follows the Tablo design system: neutral/white base, a single orange accent (`#F67522`), Inter, 12px radius.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Routes

| Route               | What it is                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| `/`                 | Marketing landing page (hero + dashboard mock, features, menu spotlight).  |
| `/m/[table]`        | The guest menu for a table. e.g. `/m/7`. The full ordering flow.           |
| `/m`                | Redirects to `/m/1`.                                                       |
| `/qr`               | Generates a scannable QR code per table (PNG download + open link).        |
| `/login`            | Staff sign-in (demo account prefilled).                                    |
| `/dashboard`        | Restaurant overview — live stats + active orders (auth required).          |
| `/dashboard/orders` | Live orders board (New → Preparing → Ready → Served) (auth required).      |

### API

| Endpoint                 | Method | Access | Purpose                              |
| ------------------------ | ------ | ------ | ------------------------------------ |
| `/api/orders`            | POST   | public | Guests submit an order.              |
| `/api/orders`            | GET    | staff  | List all orders (dashboard polls).   |
| `/api/orders/[id]`       | PATCH  | staff  | Advance an order's status.           |
| `/api/auth/login`        | POST   | public | Verify credentials, set session.     |
| `/api/auth/logout`       | POST   | public | Clear session.                       |

## Menu scanning

`/qr` renders a real, scannable QR code for each table. Each code encodes an
**absolute** URL to that table's menu (`<origin>/m/<table>`), built from the
live `window.location.origin` — so a code works whether you open the generator
on `localhost` or over your LAN IP (e.g. `http://192.168.1.10:3000/m/7`).

To test end-to-end on a real phone:

1. Run `npm run dev` and find your machine's LAN IP.
2. Open `http://<LAN-IP>:3000/qr` on your laptop.
3. Scan any table's code with your phone camera — it opens that table's menu.

## The ordering flow (`/m/[table]`)

1. **Browse** — search, category chips, dietary tags, live sold-out state.
2. **Item detail** — sizes, add-ons, special requests, quantity; live price.
3. **Order review** — editable cart, per-line notes, kitchen note, totals.
4. **Confirmation & feedback** — order status, star rating + quick feedback,
   loyalty prompt, reorder. Payment is handled separately (at the table with a
   server), so the flow ends at "Send order to kitchen".

On send, the order is POSTed to `/api/orders` and appears on the dashboard.
Menu data is mock data in [`src/lib/menu-data.ts`](src/lib/menu-data.ts).

## Restaurant dashboard

Sign in at `/login`, then:

- **`/dashboard`** — overview with live stats (sales, order count, avg order,
  orders in the kitchen) and the active orders.
- **`/dashboard/orders`** — a live kanban board. New guest orders appear
  automatically (polled every few seconds); advance each through
  New → Preparing → Ready → Served.

**Demo account:** `sofia@bella.com` / `tablo123` (prefilled on the login form).

### How orders flow

1. A guest sends an order from `/m/[table]` → `POST /api/orders`.
2. The order lands in an in-memory server store
   ([`src/lib/orders/store.ts`](src/lib/orders/store.ts)).
3. The dashboard polls `GET /api/orders` and renders orders live.
4. Staff advance status via `PATCH /api/orders/[id]`.

The store is in-memory — orders persist while the server runs but reset on
restart (a couple are seeded so the board isn't empty). Swapping in SQLite or
Postgres is a change isolated to `store.ts`.

### Auth

Login verifies credentials against in-repo mock users
([`src/lib/auth/users.ts`](src/lib/auth/users.ts)) and issues a signed
(`jose` / HS256) session in an httpOnly cookie. The `/dashboard` layout and the
staff API routes verify the session and redirect / return 401 when it's absent.
Set `AUTH_SECRET` in the environment for production; a dev fallback keeps local
setup at zero config.

## Testing

```bash
npm run test         # Vitest unit + component tests
npm run lint         # ESLint
npm run build        # Type-check + production build
```

Tests cover the cart math, money formatting, QR/menu URL building, menu-data
integrity, the cart reducer, and the quantity stepper component.

## Project structure

```
src/
  app/
    page.tsx            landing page
    m/[table]/page.tsx  guest menu (server component -> MenuApp)
    qr/page.tsx         QR code generator
  components/
    landing/            marketing sections
    menu/               ordering flow (browse, item sheet, review, confirmation)
    ui/                 shadcn/ui components
  lib/
    menu-data.ts        mock restaurant + menu
    cart.ts             pure cart math
    format.ts           money formatting
    menu-url.ts         QR/menu URL helpers
    types.ts            domain model
```
