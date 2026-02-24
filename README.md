# Fintech Investment Platform

A full-stack fintech application that simulates an investment platform with daily ROI distribution and a multi-level referral commission system. Built with Express 5 + TypeScript (backend) and Next.js 16 + React 19 (frontend).

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [What We Built](#what-we-built)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Feature Deep-Dives](#feature-deep-dives)
  - [1. Authentication](#1-authentication)
  - [2. Investment Creation](#2-investment-creation)
  - [3. Daily ROI Cron Job](#3-daily-roi-cron-job)
  - [4. Dashboard](#4-dashboard)
  - [5. Referral Tree](#5-referral-tree)
- [How Multi-Level Referral Income Works](#how-multi-level-referral-income-works)
- [Idempotency and Safety Guarantees](#idempotency-and-safety-guarantees)
- [Frontend Components](#frontend-components)
- [Security](#security)
- [Scripts Reference](#scripts-reference)

---

## Problem Statement

Design and build a fintech investment platform where:

1. Users can **register and log in** with JWT-based authentication.
2. Users can **create investments** in tiered plans (Basic, Standard, Premium) that earn daily ROI.
3. A **scheduled cron job** runs at midnight UTC every day to calculate and distribute ROI to all users with active investments, crediting their wallet balances.
4. A **multi-level referral system** rewards users when people they referred (up to 3 levels deep) invest or earn ROI.
5. A **React dashboard** displays total investments, daily ROI history, level income breakdowns, and a nested referral tree.
6. The system must be **idempotent** — re-running the daily job must never double-credit ROI.

---

## What We Built

### Backend (Express + TypeScript + Mongoose)

- **Auth system** with bcrypt password hashing, JWT token generation (7-day expiry), and middleware that protects all private endpoints.
- **Investment service** that creates investments, snapshots the daily ROI rate at creation time, computes end dates (365 days), and immediately distributes first-level referral income up the referral chain.
- **Daily ROI cron job** (`node-cron`, runs at `0 0 * * *` UTC) that iterates every active investment, calculates `amount * dailyRoiRate / 100`, creates an `RoiHistory` record, credits the investor's `walletBalance`, then walks the referral chain to distribute level income to ancestors — all wrapped in MongoDB transactions for atomicity.
- **Dashboard aggregation** that runs 6 parallel queries (user wallet, investments, ROI aggregation, referral aggregation, recent ROI, recent referrals) and returns a single response with summary metrics and detail lists.
- **Referral tree builder** that recursively walks `User.referredBy` relationships to produce a nested tree structure, capped at a configurable max depth (default 3, hard max 10).
- **Manual ROI trigger endpoint** (`POST /api/roi/process-daily`) for testing without waiting for midnight.

### Frontend (Next.js 16 + React 19 + Tailwind CSS 4)

- **Login / Register page** with form toggle, referral code input, and error handling.
- **Auth context** (`AuthProvider`) that persists JWT + user data in localStorage and provides `login`/`logout` across the app.
- **Dashboard page** that fetches dashboard + referral tree data in parallel with full loading skeleton states and error handling with retry.
- **5 stat cards**: Wallet Balance, Total Invested, ROI Earned, Referral Income, Total Income.
- **Investments table** with plan and status badges, daily ROI rates, and date ranges.
- **ROI bar chart** (Recharts) showing the last 10 daily ROI payments.
- **Level income tables**: one for the per-level breakdown (count, total, share %), one for recent referral payouts with source user details.
- **Referral tree** component with collapsible nodes, level badges, and join dates.
- **Create Investment form** with plan picker (shows ROI rate per plan) and amount input, which refreshes the entire dashboard on success.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT (Next.js 16 — port 3000)                                    │
│                                                                     │
│  /login ──────── AuthProvider ──────── /dashboard                   │
│     │                │                     │                        │
│     │         localStorage                 ├── StatsCards (5)       │
│     │         (token + user)               ├── CreateInvestmentForm │
│     │                                      ├── InvestmentsTable     │
│     ▼                                      ├── RoiChart (Recharts)  │
│  lib/api.ts ──── Bearer token ────────────►├── LevelIncomeTable     │
│                                            └── ReferralTree         │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ HTTP (JSON)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SERVER (Express 5 — port 5000)                                     │
│                                                                     │
│  Middleware: helmet → cors → rateLimit → json → requestLogger       │
│                                                                     │
│  Routes (/api)                                                      │
│  ├── /auth          POST /register, POST /login                     │
│  ├── /investments   POST /           (auth)                         │
│  ├── /dashboard     GET  /           (auth)                         │
│  ├── /referrals     GET  /tree       (auth)                         │
│  ├── /roi           POST /process-daily (auth)                      │
│  └── /health        GET  /                                          │
│                                                                     │
│  Controllers → Services → Mongoose Models → MongoDB                 │
│                                                                     │
│  Jobs                                                               │
│  └── dailyRoiJob (node-cron, 00:00 UTC)                             │
│       └── roiService.processDailyRoi()                              │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  MongoDB (Atlas)  │
              │                  │
              │  Collections:    │
              │  ├── users       │
              │  ├── investments │
              │  ├── roihistories│
              │  ├── referral-   │
              │  │   incomes     │
              │  └── level-      │
              │      settings    │
              └──────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >= 20 |
| Backend Framework | Express | 5.2 |
| Language | TypeScript | 5.9 |
| Database | MongoDB (Mongoose ODM) | 9.2 |
| Auth | jsonwebtoken + bcryptjs | 9.0 / 3.0 |
| Scheduler | node-cron | 4.2 |
| Logging | Winston | 3.19 |
| Security | Helmet + express-rate-limit | 8.1 / 8.2 |
| Frontend Framework | Next.js (App Router) | 16.1 |
| UI Library | React | 19.2 |
| Styling | Tailwind CSS | 4 |
| Charts | Recharts | 3.7 |

---

## Project Structure

```
fintech-assessment/
│
├── server/
│   ├── src/
│   │   ├── server.ts                 # Entry point — connects DB, starts cron, listens
│   │   ├── app.ts                    # Express app — middleware + route mounting
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts               # Environment variable loader with defaults
│   │   │   ├── db.ts                # MongoDB connection via Mongoose
│   │   │   └── logger.ts            # Winston logger (console + file transports)
│   │   │
│   │   ├── models/
│   │   │   ├── User.ts              # User schema (name, email, password, referralCode, walletBalance)
│   │   │   ├── Investment.ts        # Investment schema (plan, amount, dailyRoiRate, status)
│   │   │   ├── RoiHistory.ts        # Daily ROI payout records (unique per investment+date)
│   │   │   ├── ReferralIncome.ts    # Referral commission records (unique per investment+user)
│   │   │   ├── LevelSetting.ts     # Configurable referral level percentages
│   │   │   └── index.ts             # Barrel exports for all models, types, constants
│   │   │
│   │   ├── routes/
│   │   │   ├── index.ts             # Mounts all sub-routers under /api
│   │   │   ├── auth.ts              # /api/auth — register, login
│   │   │   ├── investment.ts        # /api/investments — create investment
│   │   │   ├── dashboard.ts         # /api/dashboard — get dashboard data
│   │   │   ├── referral.ts          # /api/referrals — get referral tree
│   │   │   ├── roi.ts               # /api/roi — manual trigger for daily ROI
│   │   │   └── health.ts            # /api/health — server + DB health check
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.ts    # Register + Login handlers
│   │   │   ├── investmentController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── referralController.ts
│   │   │   └── roiController.ts     # Manual ROI trigger handler
│   │   │
│   │   ├── services/
│   │   │   ├── authService.ts       # Password hashing, JWT generation, referral code validation
│   │   │   ├── investmentService.ts # Investment creation + initial referral distribution
│   │   │   ├── dashboardService.ts  # 6-query parallel aggregation
│   │   │   ├── referralService.ts   # Recursive tree builder + level summary
│   │   │   └── roiService.ts        # Daily ROI calculation, wallet credits, level income
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification, user lookup, active check
│   │   │   ├── errorHandler.ts      # Global error handler (AppError + generic)
│   │   │   └── requestLogger.ts     # Logs method, URL, status, duration per request
│   │   │
│   │   ├── jobs/
│   │   │   └── dailyRoiJob.ts       # node-cron scheduler (00:00 UTC daily)
│   │   │
│   │   └── utils/
│   │       └── AppError.ts          # Custom error class with HTTP status codes
│   │
│   ├── logs/                         # Winston log files (auto-created)
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   └── .env.example
│
├── client/
│   ├── app/
│   │   ├── layout.tsx               # Root layout — wraps everything in AuthProvider
│   │   ├── page.tsx                 # Root page — redirects to /dashboard or /login
│   │   ├── globals.css              # Tailwind imports + CSS variables
│   │   ├── login/
│   │   │   └── page.tsx             # Login + Register form (togglable)
│   │   └── dashboard/
│   │       └── page.tsx             # Main dashboard — fetches data, renders all sections
│   │
│   ├── components/
│   │   ├── AuthProvider.tsx         # React Context — user, token, login(), logout()
│   │   └── dashboard/
│   │       ├── StatsCards.tsx       # 5 KPI cards (wallet, invested, ROI, referral, total)
│   │       ├── InvestmentsTable.tsx # Table with plan/status badges
│   │       ├── RoiChart.tsx         # Recharts bar chart — last 10 ROI payments
│   │       ├── LevelIncomeTable.tsx # Level breakdown table + recent referral payouts
│   │       ├── ReferralTree.tsx     # Collapsible nested tree with level badges
│   │       ├── CreateInvestmentForm.tsx # Plan picker + amount input
│   │       └── Skeleton.tsx         # Animated loading placeholders for all sections
│   │
│   ├── lib/
│   │   ├── types.ts                 # TypeScript interfaces matching all API responses
│   │   └── api.ts                   # API client class — attaches Bearer token, all endpoints
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd fintech-assessment

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

1. Copy the server env template and fill in your values:

```bash
cd server
cp .env.example .env
```

2. Edit `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fintech-db
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=replace-with-a-strong-random-string
JWT_EXPIRES_IN=7d
```

3. Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Running

```bash
# Terminal 1 — Start the backend
cd server
npm run dev

# Terminal 2 — Start the frontend
cd client
npm run dev
```

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`
- Open `http://localhost:3000` in your browser

---

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `5000` | Server listening port |
| `MONGODB_URI` | `mongodb://localhost:27017/fintech-db` | MongoDB connection string |
| `LOG_LEVEL` | `debug` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `JWT_SECRET` | (insecure default) | Secret key for JWT signing — **must change in production** |
| `JWT_EXPIRES_IN` | `7d` | Token expiration (e.g. `7d`, `24h`, `1h`) |

### Client (`client/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | Backend API base URL |

---

## API Reference

All responses follow the format `{ success: boolean, message?: string, data: T }`.

Protected endpoints require the header: `Authorization: Bearer <token>`

### Authentication

#### `POST /api/auth/register`

Create a new user account.

**Request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "referralCode": "A1B2C3D4"    // optional — code of the person who referred you
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": "665f...",
      "name": "John Doe",
      "email": "john@example.com",
      "referralCode": "E5F6G7H8"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### `POST /api/auth/login`

Authenticate and receive a JWT token.

**Request body:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response (200):** Same shape as register.

---

### Investments

#### `POST /api/investments` (protected)

Create a new investment. Immediately distributes referral income to the investor's upline.

**Request body:**
```json
{
  "amount": 1000,
  "plan": "premium"
}
```

| Plan | Daily ROI Rate |
|------|---------------|
| `basic` | 0.5% |
| `standard` | 1.0% |
| `premium` | 1.5% |

**Response (201):**
```json
{
  "success": true,
  "message": "Investment created successfully.",
  "data": {
    "investment": {
      "id": "665f...",
      "amount": 1000,
      "plan": "premium",
      "dailyRoiRate": 1.5,
      "startDate": "2026-02-24T00:00:00.000Z",
      "endDate": "2027-02-24T00:00:00.000Z",
      "status": "active"
    }
  }
}
```

---

### Dashboard

#### `GET /api/dashboard` (protected)

Returns the authenticated user's full dashboard data.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "walletBalance": 150.75,
      "totalInvested": 5000,
      "activeInvestmentsCount": 2,
      "totalInvestmentsCount": 3,
      "totalRoiEarned": 125.50,
      "totalRoiPayments": 10,
      "totalReferralIncome": 25.25,
      "totalIncome": 150.75
    },
    "investments": [
      {
        "_id": "...", "amount": 1000, "plan": "premium",
        "dailyRoiRate": 1.5, "startDate": "...", "endDate": "...",
        "status": "active", "createdAt": "..."
      }
    ],
    "levelIncome": [
      { "level": 1, "totalAmount": 15.00, "count": 3 },
      { "level": 2, "totalAmount": 7.50, "count": 2 }
    ],
    "recentRoi": [
      {
        "_id": "...", "amount": 15.00, "date": "...",
        "investment": { "plan": "premium", "amount": 1000 }
      }
    ],
    "recentReferrals": [
      {
        "_id": "...", "amount": 5.00, "level": 1, "percentage": 5,
        "fromUser": { "name": "Jane", "email": "jane@example.com" },
        "investment": { "plan": "standard", "amount": 500 }
      }
    ]
  }
}
```

---

### Referral Tree

#### `GET /api/referrals/tree?maxLevel=3` (protected)

Returns the nested referral tree for the authenticated user.

**Query params:** `maxLevel` (optional, default 3, max 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "referralCode": "A1B2C3D4",
    "directReferrals": 3,
    "levelSummary": [
      { "level": 1, "totalIncome": 50.00, "referralCount": 5 },
      { "level": 2, "totalIncome": 20.00, "referralCount": 3 }
    ],
    "tree": [
      {
        "id": "...",
        "name": "User B",
        "email": "b@example.com",
        "referralCode": "X1Y2Z3",
        "level": 1,
        "joinedAt": "2026-01-15T...",
        "children": [
          {
            "id": "...",
            "name": "User C",
            "email": "c@example.com",
            "referralCode": "M4N5O6",
            "level": 2,
            "joinedAt": "2026-02-01T...",
            "children": []
          }
        ]
      }
    ]
  }
}
```

---

### ROI Processing (Manual Trigger)

#### `POST /api/roi/process-daily` (protected)

Manually triggers the daily ROI processing job. Useful for testing.

**Response (200):**
```json
{
  "success": true,
  "message": "Daily ROI processing completed.",
  "data": {
    "processedInvestments": 15,
    "totalRoiDistributed": 225.50,
    "totalLevelIncomeDistributed": 18.75,
    "maturedInvestments": 2,
    "errors": []
  }
}
```

---

### Health Check

#### `GET /api/health`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "timestamp": "2026-02-24T12:00:00.000Z",
    "database": "connected"
  }
}
```

---

## Database Schema

### User

| Field | Type | Details |
|-------|------|---------|
| `name` | String | Required, trimmed, max 100 chars |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, min 8, bcrypt-hashed, `select: false` |
| `referralCode` | String | Required, unique, auto-generated (8-char hex) |
| `referredBy` | ObjectId (ref: User) | Nullable — the user who referred this user |
| `walletBalance` | Number | Default 0, min 0 — credited by ROI job + referral income |
| `isActive` | Boolean | Default true |

**Indexes:** `{ referralCode: 1 }` unique, `{ referredBy: 1 }`

### Investment

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId (ref: User) | Required |
| `amount` | Number | Required, min 1 |
| `plan` | String | Enum: `basic` / `standard` / `premium` |
| `dailyRoiRate` | Number | Snapshot at creation (0.5 / 1.0 / 1.5) |
| `startDate` | Date | Defaults to now |
| `endDate` | Date | startDate + 365 days |
| `status` | String | Enum: `active` / `matured` / `cancelled`, default `active` |

**Indexes:** `{ user: 1, status: 1 }`, `{ status: 1, endDate: 1 }`

### RoiHistory

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId (ref: User) | Required |
| `investment` | ObjectId (ref: Investment) | Required |
| `amount` | Number | Daily ROI credited |
| `date` | Date | Normalized to midnight UTC |

**Indexes:** `{ user: 1, date: -1 }`, `{ investment: 1, date: 1 }` **unique** — prevents double-crediting

### ReferralIncome

| Field | Type | Details |
|-------|------|---------|
| `user` | ObjectId (ref: User) | Who **receives** the commission |
| `fromUser` | ObjectId (ref: User) | Whose activity triggered it |
| `investment` | ObjectId (ref: Investment) | The triggering investment |
| `level` | Number | 1 = direct referral, 2 = second level, etc. |
| `percentage` | Number | Snapshot of % applied |
| `amount` | Number | Actual income credited |

**Indexes:** `{ user: 1, createdAt: -1 }`, `{ investment: 1, user: 1 }` **unique** — prevents duplicate payout per investment per ancestor

### LevelSetting (Singleton Config)

| Field | Type | Details |
|-------|------|---------|
| `key` | String | Always `"referral_levels"`, unique |
| `levels` | Array of `{ level, percentage }` | Ordered, min 1 entry |
| `isActive` | Boolean | Default true |
| `updatedBy` | String | Audit trail, default `"system"` |

**Default seed:** Level 1 = 5%, Level 2 = 3%, Level 3 = 1%

---

## Feature Deep-Dives

### 1. Authentication

**Why JWT + bcrypt:** Stateless authentication works well for an API-first architecture. The token is stored client-side (localStorage), sent as a Bearer header on every request, and verified by the auth middleware. bcrypt with 12 salt rounds provides strong one-way hashing.

**Registration flow:**
1. Validate inputs (name, email, password required)
2. Check for duplicate email (409 Conflict if exists)
3. If a `referralCode` is provided, look up the referrer — reject if invalid
4. Hash password with bcrypt (12 rounds)
5. Generate a unique 8-character hex referral code for the new user
6. Create user with `referredBy` pointing to the referrer (or null)
7. Sign a JWT with the user ID, return `{ user, token }`

**Login flow:**
1. Find user by email (case-insensitive), explicitly select the password field
2. Check account is active (403 if deactivated)
3. Compare submitted password against bcrypt hash
4. Sign and return JWT

**Auth middleware (`src/middleware/auth.ts`):**
- Extracts `Bearer <token>` from the Authorization header
- Verifies JWT signature and checks expiration
- Looks up the user by the ID in the token payload
- Verifies the user is still active
- Attaches the full user document to `req.user`

### 2. Investment Creation

**Why snapshot `dailyRoiRate`:** Rates could theoretically change in the future. By snapshotting the rate at creation time, each investment locks in its ROI rate for its entire lifetime — no surprises.

**Flow:**
1. Validate `amount >= 1` and `plan` is one of basic/standard/premium
2. Look up `dailyRoiRate` from the `PLAN_DAILY_ROI` constant map
3. Set `startDate = now`, `endDate = now + 365 days`
4. Create the `Investment` document
5. **Distribute initial referral income:** Walk up the investor's referral chain (`referredBy` links), and for each ancestor within the configured levels, create a `ReferralIncome` record: `income = investmentAmount * levelPercentage / 100`

**Example:** User C invests $1,000. C was referred by B, who was referred by A.
- B (Level 1, 5%) receives: $50
- A (Level 2, 3%) receives: $30

### 3. Daily ROI Cron Job

**Why node-cron:** Lightweight, runs in-process, no external scheduler needed. The job is registered at server startup and stopped on graceful shutdown.

**Schedule:** `0 0 * * *` — every day at 00:00 UTC.

**Processing steps (`roiService.processDailyRoi`):**

1. **Mark matured investments:** Bulk-update all investments where `status === "active"` and `endDate <= today` to `status: "matured"`. These are excluded from ROI going forward.

2. **Fetch remaining active investments:** All documents with `status: "active"`.

3. **Load level settings:** Fetch the `LevelSetting` document (or fall back to defaults: 5%, 3%, 1%).

4. **For each active investment:**
   - Calculate `roiAmount = (amount * dailyRoiRate) / 100`
   - **Idempotency check:** Query `RoiHistory.findOne({ investment, date: today })`. If it exists, skip — this investment was already processed today.
   - **Atomic credit:** Open a MongoDB session/transaction:
     - Create `RoiHistory` record (the unique compound index `{ investment, date }` acts as a second safety net)
     - Increment `User.walletBalance` by `roiAmount`
   - **Distribute level income:** Walk the referral chain. For each ancestor, calculate `levelAmount = roiAmount * percentage / 100`, use `findOneAndUpdate` with `$inc` to accumulate into the `ReferralIncome` document, and credit the ancestor's `walletBalance`.

5. **Return summary:** Counts of processed investments, total ROI distributed, total level income distributed, matured investments count, and any per-investment errors.

**Example daily run:** 100 active investments, 15 of them just matured.
- 85 investments get ROI credited
- Each investor's wallet goes up by their daily ROI
- Referral ancestors get their cut
- Result logged with duration and statistics

### 4. Dashboard

**Why parallel queries:** The dashboard needs data from 4 different collections (Users, Investments, RoiHistory, ReferralIncome). Running 6 queries in parallel via `Promise.all` keeps response times low.

**The 6 parallel queries:**
1. `User.findById(userId).select("walletBalance")` — current wallet balance
2. `Investment.find({ user: userId })` — all investments, sorted newest first
3. `RoiHistory.aggregate(...)` — sum of all ROI amounts + count
4. `ReferralIncome.aggregate(...)` — grouped by level with sum + count
5. `RoiHistory.find(...)` — last 10 ROI entries with populated investment details
6. `ReferralIncome.find(...)` — last 10 referral entries with populated user + investment details

**Computed summary fields:**
- `totalInvested` = sum of all investment amounts
- `activeInvestmentsCount` = count of investments with status "active"
- `totalIncome` = totalRoiEarned + totalReferralIncome

### 5. Referral Tree

**Why recursive building:** The tree structure (parent → children → grandchildren) maps directly to the `referredBy` chain in the database. The recursive function `buildReferralTree` walks downward from the current user, finding all users whose `referredBy` equals the current node, then recurses for each.

**Depth limiting:** `maxLevel` parameter (default 3, hard cap 10) prevents unbounded recursion and keeps query count manageable.

**Data returned per node:** `id`, `name`, `email`, `referralCode`, `level`, `joinedAt`, `children[]`

---

## How Multi-Level Referral Income Works

The platform implements a 3-level referral commission system. Here is the full flow:

```
User A (original user)
  └── refers User B (Level 1)
        └── refers User C (Level 2)
              └── refers User D (Level 3)
```

**When User D invests $1,000:**

| Recipient | Level | Rate | Income |
|-----------|-------|------|--------|
| User C | Level 1 (direct referrer) | 5% | $50.00 |
| User B | Level 2 | 3% | $30.00 |
| User A | Level 3 | 1% | $10.00 |

**When the daily ROI job runs and User D earns $15 ROI (1.5% of $1,000):**

| Recipient | Level | Rate | Daily Level Income |
|-----------|-------|------|--------------------|
| User C | Level 1 | 5% of $15 | $0.75 |
| User B | Level 2 | 3% of $15 | $0.45 |
| User A | Level 3 | 1% of $15 | $0.15 |

The level percentages are configurable via the `LevelSetting` collection. Changes take effect on the next cron run.

---

## Idempotency and Safety Guarantees

The daily ROI job is designed to be safe to re-run:

1. **Pre-check:** Before creating a `RoiHistory` record, the service queries for an existing record with the same `investment` + `date`. If found, it skips that investment entirely.

2. **Unique compound index:** `RoiHistory` has a unique index on `{ investment: 1, date: 1 }`. Even if the pre-check is bypassed due to a race condition, the database will reject a duplicate insert.

3. **Atomic transactions:** The `RoiHistory` creation and `User.walletBalance` increment happen inside a MongoDB session transaction. Either both succeed or neither does — no partial state.

4. **Referral income upsert:** Level income uses `findOneAndUpdate` with `$inc` and `upsert: true`, keyed by the unique index `{ investment, user }`. This accumulates correctly even if called multiple times.

5. **Error isolation:** If one investment fails to process (e.g., a validation error), the error is logged and the job continues to the next investment. The failed investment can be retried on the next run.

---

## Frontend Components

| Component | Location | What it renders |
|-----------|----------|-----------------|
| `AuthProvider` | `components/AuthProvider.tsx` | React Context — provides `user`, `token`, `login()`, `logout()`, `isLoading` to the entire app |
| `StatsCards` | `components/dashboard/StatsCards.tsx` | 5 color-coded KPI cards: Wallet Balance (emerald), Total Invested (blue), ROI Earned (green), Referral Income (purple), Total Income (amber) |
| `CreateInvestmentForm` | `components/dashboard/CreateInvestmentForm.tsx` | Expandable form — plan picker (Basic/Standard/Premium with ROI rates shown) + amount input. Calls `POST /api/investments` and refreshes dashboard on success |
| `InvestmentsTable` | `components/dashboard/InvestmentsTable.tsx` | Table of all investments with columns: Plan (badge), Amount, Daily ROI %, Start Date, End Date, Status (badge). Shows "No investments yet" when empty |
| `RoiChart` | `components/dashboard/RoiChart.tsx` | Recharts `BarChart` showing the last 10 daily ROI payments with date on X-axis and dollar amount on Y-axis |
| `LevelIncomeTable` | `components/dashboard/LevelIncomeTable.tsx` | Two tables: (1) Level income breakdown — level badge, payout count, total earned, share %. (2) Recent referral payouts — from user name, level, rate %, amount, date |
| `ReferralTree` | `components/dashboard/ReferralTree.tsx` | Collapsible tree — each node shows name, email, level badge, join date. Header shows referral code + direct referral count + level summary chips. Auto-expands first 2 levels |
| `Skeleton` | `components/dashboard/Skeleton.tsx` | Animated pulse placeholders: `StatsCardsSkeleton` (5 cards), `TableSkeleton` (configurable rows), `ChartSkeleton`, `TreeSkeleton` |

**Dashboard page flow:**
1. On mount, check auth state. If not logged in, redirect to `/login`.
2. Fetch `GET /api/dashboard` and `GET /api/referrals/tree` in parallel.
3. While loading, render skeleton placeholders for every section.
4. On error, show a red banner with a "Retry" button.
5. On success, render all components with the fetched data.
6. When a new investment is created via the form, the entire dashboard re-fetches.

---

## Security

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt with 12 salt rounds |
| Password hiding | `select: false` on the password field — never returned in queries unless explicitly requested |
| JWT authentication | Signed tokens with configurable secret and expiry |
| Token validation | Middleware verifies signature, checks expiry, confirms user exists and is active |
| HTTP headers | Helmet.js sets Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc. |
| Rate limiting | 100 requests per 15 minutes per IP address |
| CORS | Restricted to a single configurable origin |
| Input validation | Mongoose schema validation (required, min, max, enum constraints) |
| Request body limit | 10 KB max (`express.json({ limit: "10kb" })`) |
| Error suppression | Production mode returns generic error messages (no stack traces) |
| Logging | All requests logged with method, URL, status code, duration, and client IP |

---

## Scripts Reference

### Server

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `nodemon` | Starts the dev server with auto-reload on file changes (uses `tsx` under the hood) |
| `npm run build` | `tsc` | Compiles TypeScript to JavaScript in `dist/` |
| `npm start` | `node dist/server.js` | Runs the compiled production server |
| `npm run lint` | `eslint src --ext .ts` | Lints all TypeScript files |

### Client

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `next dev` | Starts Next.js dev server on port 3000 |
| `npm run build` | `next build` | Creates an optimized production build |
| `npm start` | `next start` | Serves the production build |
| `npm run lint` | `eslint` | Lints all source files |
