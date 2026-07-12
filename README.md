# TransitOps: Fleet Management Platform

TransitOps is a comprehensive fleet management and dispatch platform built for the hackathon. It manages vehicles, driver profiles, dispatching trips, maintenance logs, fuel tracking, and financial analytics.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS & shadcn/ui
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Forms**: react-hook-form & Zod

## Setup Instructions

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Database Setup**
   Ensure you have a PostgreSQL database running. Set your `DATABASE_URL` in `.env`.
   ```bash
   npx prisma db push
   ```

3. **Seed the Database**
   This script loads the full demo state (Roles, Vehicles, Drivers, Trips, Logs).
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Run the Application**
   ```bash
   npm run dev
   ```

## Assumptions & Design Decisions
To fulfill the hackathon specifications, the following design decisions and assumptions were made:

1. **Revenue Field**: Revenue is tracked at the **Trip** level (entered upon trip completion) rather than at a global or vehicle level, as it's directly tied to the payload and distance of a specific dispatch.
2. **Region Field**: Vehicle regions are stored as free text (e.g., "North", "South") rather than a normalized table to keep the schema simple while allowing cross-regional dashboard filtering.
3. **Fleet Utilization Denominator**: Fleet Utilization is calculated against the active fleet size (excluding `RETIRED` vehicles). Vehicles `IN_SHOP` are explicitly included in the denominator because they represent temporarily unavailable capital assets, penalizing the utilization score to encourage faster repairs.
4. **RBAC Role Naming**: The specification's "Driver" role was permanently renamed to **DISPATCHER** across the application to clarify that this role is a back-office staff member dispatching trips, not the physical driver of the truck.
5. **FuelLog Cost Handling**: Fuel costs entered during trip completion are explicitly separated from generic "Expenses" to ensure clean Operational Cost calculations (where Op Cost = Fuel + Maintenance only).
6. **Retire Vehicle Guard**: Vehicles cannot be retired while `ON_TRIP` or `IN_SHOP`. They must be returned to `AVAILABLE` status first.
7. **License Reminder Default**: The automated license expiry cron job specifically targets the Fleet Manager's email address by default, as they manage personnel compliance.
8. **Document Storage**: Uploaded files are mocked to local storage (`/public/uploads`) for the hackathon demo to avoid external cloud dependencies like AWS S3 or Vercel Blob failing during the live pitch.
9. **Email Automation**: Email reminders via Resend are conditionally mocked based on the presence of a valid `RESEND_API_KEY` to ensure the cron trigger works out-of-the-box.
