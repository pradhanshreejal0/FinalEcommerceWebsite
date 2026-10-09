# Foundry — Multi-Vendor Ecommerce Marketplace

Full-stack ecommerce platform with a **Premium (Foundry)** visual theme:
forest green + navy palette, Manrope / DM Sans typography, and a curated storefront home page.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, React Router |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Auth | JWT access + httpOnly refresh cookies |
| Media | Cloudinary |
| Payments | eSewa, Khalti (Nepal) |

## Features

- Customer: browse, search, cart, wishlist, checkout, orders, returns, chat
- Vendor: product management, analytics, payouts
- Admin: categories, vendors, ads, storefront settings
- Premium home: hero, trust strip, category tiles, product shelves, promo band

## Quick start

### 1. Backend

```bash
cd server
cp .env.example .env   # edit MONGO_URI, JWT secrets, Cloudinary, etc.
npm install
npm run seed:admin     # optional — creates admin from .env
npm run dev            # http://localhost:5000
```

### 2. Frontend

```bash
cd client
cp .env.example .env   # set VITE_API_URL=http://localhost:5000/api for local API
npm install
npm run dev            # http://localhost:5173
```

### 3. Seed sample catalog (optional)

```bash
cd server
npm run seed:catalog
```

## Environment

**Client** (`client/.env`):

- `VITE_API_URL` — API base including `/api` (default points at deployed backend)

**Server** (`server/.env`):

- `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` for seed
- Cloudinary + payment gateway keys as needed

## Theme

Colors and fonts live in `client/src/index.css` (Foundry Premium theme).
Home layout: `client/src/pages/customer/Home.jsx`.

Primary: `#174c45` · Paper: `#f7f8fa` · Ink: `#202b32`  
Fonts: Manrope (headings), DM Sans (body)

## Production

```bash
cd client && npm run build   # output: client/dist
cd server && npm start
```

Serve the API and point the frontend build at your API URL via `VITE_API_URL` at build time.
