# Allo Inventory


## What It Does

- Shows live product stock across multiple warehouses.
- Lets a user reserve available stock for a short checkout window.
- Holds pending reservations for 10 minutes.
- Automatically releases expired reservations back into inventory.
- Lets users confirm purchase or cancel a pending order.
- Includes a reservations dashboard at `/reservations`.
- Supports filtering reservations by status.
- Supports searching by product name or reservation ID.
- Auto-refreshes reservation data every 10 seconds.
- Uses local product images so the UI does not depend on remote image URLs.

## Main Pages

| Page | Purpose |
| --- | --- |
| `/` | Product inventory page. Users can select a warehouse, choose quantity, and reserve stock. |
| `/checkout/:id` | Checkout page for a single reservation with countdown, confirm, and cancel actions. |
| `/reservations` | Reservation dashboard for monitoring pending, confirmed, and released reservations. |

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- Redis / Upstash-compatible Redis
- Tailwind CSS
- shadcn-style toast components

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a local environment file:

```bash
cp .env.example .env
```

Then update the values for your own database and Redis instance.

Required variables:

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Main PostgreSQL connection string used by Prisma. |
| `DIRECT_URL` | Direct PostgreSQL connection string for migrations. |
| `REDIS_URL` | Redis connection string used for stock reservation locks. |
| `CRON_SECRET` | Optional secret for protecting the expiry cron endpoint. |

### 3. Set Up the Database

Push the Prisma schema:

```bash
npm run db:push
```

Seed sample warehouses, products, stock, and product image paths:

```bash
npm run db:seed
```

### 4. Run the App

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The reservations dashboard is available at:

```text
http://localhost:3000/reservations
```

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Build the production app. |
| `npm run start` | Start the production build. |
| `npm run lint` | Run Next.js ESLint checks. |
| `npm run db:push` | Push the Prisma schema to the database. |
| `npm run db:migrate` | Create and apply a Prisma migration. |
| `npm run db:seed` | Reset and seed sample app data. |
| `npm run db:studio` | Open Prisma Studio. |

## Reservation Flow

1. A user chooses a product, warehouse, and quantity.
2. The app checks available stock for that product and warehouse.
3. If enough stock exists, a pending reservation is created.
4. The reserved quantity is added to `Stock.reserved`.
5. The user gets a 10-minute checkout window.
6. If the user confirms, the reservation becomes `CONFIRMED` and the stock is permanently consumed.
7. If the user cancels or the reservation expires, it becomes `RELEASED` and the reserved stock is returned.

## How Expiry Works

Expired reservations are handled in two ways.

First, the app performs lazy cleanup before important reads. When product or reservation data is requested, the app checks for old pending reservations and releases them before returning fresh data.

Second, there is a Vercel cron route at `/api/cron/expire`. The included `vercel.json` runs this endpoint every minute, so expired reservations are also cleaned up even when nobody is browsing the product page.

This combination keeps the UI accurate while still having a background safety net.

## Concurrency and Stock Safety

The critical path is `POST /api/reservations`.

Before changing stock, the app acquires a Redis lock for the specific product and warehouse pair. That means two users trying to reserve the last unit from the same warehouse cannot both succeed.

Inside the lock, Prisma creates the reservation and updates the reserved stock in one transaction. If stock is no longer available, the API returns a conflict response instead of overselling.

## Idempotency

The reservation and confirm endpoints support an optional `Idempotency-Key` header.

This helps protect against duplicate submissions caused by retries, slow networks, or double-clicks. If the same idempotency key is sent again for the same endpoint, the app returns the saved response instead of running the operation twice.

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List products with current stock per warehouse. |
| `GET` | `/api/warehouses` | List warehouses. |
| `POST` | `/api/reservations` | Create a new reservation. |
| `GET` | `/api/reservations/all` | List all reservations for the dashboard. |
| `GET` | `/api/reservations/:id` | Fetch one reservation. |
| `POST` | `/api/reservations/:id/confirm` | Confirm a pending reservation. |
| `POST` | `/api/reservations/:id/release` | Cancel or release a pending reservation. |
| `GET` | `/api/cron/expire` | Release expired reservations. |

## Notes

- There is no authentication in this version. In a real deployment, the reservation dashboard should be admin-only.
- Checkout confirmation is simulated from the browser. In production, this would usually be handled through a payment provider webhook.
- The seed script clears and recreates sample reservation, stock, product, and warehouse data.
- Product images live under `public/images/products`, so they are served locally by Next.js.
