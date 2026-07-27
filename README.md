# Petronas Claim & Expenses Tracking System

A responsive web application for a Petronas station to track staff claims and
expenses digitally — TNG eWallet transaction imports, manual expense entries,
receipt attachments, categorization, and reporting.

- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT, role-based (Staff / Manager)
- **Exports**: CSV, XLSX (ExcelJS), PDF (PDFKit)

## Project structure

```
petronas-tracker/
├── backend/     # Express API, Prisma schema + seed, uploads
├── frontend/    # React + Vite SPA
└── docker-compose.yml
```

## 1. Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use the provided Docker setup)

## 2. Quick start with Docker (recommended)

```bash
cp backend/.env.example backend/.env
# edit backend/.env with a real JWT_SECRET

docker compose up --build
```

This starts Postgres, runs migrations, seeds the 46 categories and two demo
users, then starts the API on `:4000` and the frontend on `:5173`.

## 3. Manual setup (without Docker)

### Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env       # set VITE_API_URL if not default
npm install
npm run dev                 # http://localhost:5173
```

## 4. Default seeded accounts

| Role    | Username | Password (change in .env before seeding) |
|---------|----------|--------------------------------------------|
| Manager | manager  | ChangeMe123!                                |
| Staff   | staff    | ChangeMe123!                                |

**Change these credentials in `backend/.env` before seeding a real
deployment**, and rotate them immediately if the defaults were ever used.

## 5. Core features

- **TNG Import** — upload a CSV, XLSX, **or PDF** export from TNG eWallet,
  preview parsed rows, then confirm to create draft transactions for
  enrichment. PDF statements are parsed by extracting their text and matching
  transaction lines with a regex (see "TNG PDF format" below — you will
  likely need to tune this to your actual statement layout).
- **Enrichment** — every imported or manual transaction can be tagged with a
  category, category-specific fields (e.g. mileage, staff name), a receipt,
  and remarks.
- **46 merged categories** with parent/child grouping, seeded automatically;
  Managers can add/edit/deactivate categories and their dynamic fields from
  the Categories page.
- **Dashboard** (Manager only) — summary cards, category breakdown bar chart,
  and a 12-month spending trend line chart.
- **Transactions list** — filter by date range, category, source, or search;
  Managers can edit/delete any transaction, Staff can view and enrich.
- **Export** (Manager only) — CSV, XLSX, and PDF, with optional extra fields
  and category summary totals, filtered by date/category/source.
- **Reports** (Manager only) — monthly by category, weekly totals, and a
  12-month YTD view.

## 6. Deployment notes (VPS + Nginx + PM2)

1. Provision a VPS (Exabytes NVMe or similar) with Node.js 20 and PostgreSQL.
2. Clone the repo, set up `backend/.env` with production values (strong
   `JWT_SECRET`, real `DATABASE_URL`, `FRONTEND_URL` set to your domain).
3. Backend:
   ```bash
   cd backend && npm install --omit=dev
   npx prisma migrate deploy
   npm run seed   # first deploy only
   pm2 start src/app.js --name petronas-api
   ```
4. Frontend:
   ```bash
   cd frontend && npm install && npm run build
   # serve the dist/ folder via Nginx
   ```
5. Configure Nginx as a reverse proxy: serve the frontend's static `dist/`
   directly, and proxy `/api` and `/uploads` to the backend on port 4000.
6. Point DNS at the VPS, add TLS with certbot, and set `FRONTEND_URL` in the
   backend `.env` to your HTTPS domain so CORS works correctly.

## 7. Security notes

- Passwords are hashed with bcrypt (12 rounds).
- JWTs expire after 24 hours (configurable via `JWT_EXPIRES_IN`).
- All mutating category/export/dashboard routes are restricted to the
  `manager` role via the `checkRole` middleware.
- Uploaded receipts are validated by MIME type and capped at 5MB by default.
- Rate limiting is applied globally and more strictly on `/api/auth/login`.
- Uploaded files are served from `/uploads` behind the same JWT auth
  middleware as the rest of the API, so receipts aren't publicly guessable.

## 8. TNG PDF statement format

`backend/src/services/tngImportService.js` extracts text from the uploaded
PDF and matches each line against `TNG_LINE_REGEX`, which expects lines
shaped like:

```
19/07/2026  Grab - Ride Payment            -15.50
19/07/2026 09:14  Payment to ABC Sdn Bhd    RM 42.00
```

If your real TNG statement has a different layout (extra columns, a
different date position, multi-line descriptions, etc.), upload a sample
file, check the `errors` returned in the import preview response (each
unmatched line is listed), and adjust `TNG_LINE_REGEX` to fit. This only
works for text-based PDFs — if TNG ever gives you a scanned/image PDF
instead, you'd need OCR (e.g. Tesseract), which isn't implemented here.

## 9. Extending the system

- **New category / fields**: use the Categories page in the UI (Manager
  role), or add entries to `backend/prisma/seed.js` and re-run `npm run
  seed` for a fresh environment.
- **New payment mode**: add it to the `PaymentMode` enum in
  `backend/prisma/schema.prisma`, run a new migration, and add it to
  `PAYMENT_MODES` in `frontend/src/components/transactions/TransactionFormDialog.tsx`.
- **New export format**: add a function to
  `backend/src/services/exportService.js` and a route in
  `backend/src/api/export/routes.js`.
