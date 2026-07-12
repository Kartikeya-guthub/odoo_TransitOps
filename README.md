<div align="center">
  <h1>🚛 TransitOps</h1>
  <p><strong>Next-Generation Fleet Management & AI Copilot</strong></p>

  [![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://odoo-transit-ops-rho.vercel.app/vehicles)
  [![Video Demo](https://img.shields.io/badge/Video_Demo-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://youtu.be/Z15d_GwRLUo)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
</div>

<br />

## 🌟 Overview
TransitOps is a modern, enterprise-grade fleet management dashboard designed to streamline logistics operations. Built with Next.js App Router, it features real-time tracking, granular Role-Based Access Control (RBAC), comprehensive analytics, and an integrated **AI Fleet Copilot** that leverages Groq's Llama 3 for instant operational intelligence.

🔗 **[View the Live Application](https://odoo-transit-ops-rho.vercel.app/vehicles)**
*(Login as Fleet Manager: `fleet@example.com` / `admin123`)*

📺 **[Watch the Full Video Demo on YouTube](https://youtu.be/Z15d_GwRLUo)**

---

## ⚡ Core Features

- **🤖 AI Fleet Copilot:** A context-aware RAG-lite AI assistant that instantly calculates ROI, tracks vehicles in the shop, and monitors driver statuses based on real-time database conditions.
- **🔐 Granular RBAC:** Complete role-based authentication (`FLEET_MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, etc.) using NextAuth. The UI dynamically adapts to permissions.
- **📊 Interactive Analytics:** Beautiful, real-time Recharts dashboards for trip efficiency, fuel consumption, and ROI metrics.
- **🚛 Comprehensive Fleet Tracking:** Full CRUD interfaces for Vehicles, Drivers, Trips, and Maintenance Logs, complete with data tables and modal forms.

## 🛠 Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Base UI, Lucide Icons, Recharts
- **Backend:** Next.js Server Actions & API Routes, NextAuth.js
- **Database:** Prisma ORM, PostgreSQL (Hosted on Neon)
- **AI Infrastructure:** Groq Cloud API (Llama 3 70B)
- **Deployment:** Vercel

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables (.env)
# DATABASE_URL="your_neon_or_docker_postgres_url"
# NEXTAUTH_SECRET="your_secret"
# GROQ_API_KEY="your_groq_api_key"

# 3. Push schema & seed data
npx prisma db push
npx tsx prisma/seed.ts

# 4. Start the development server
npm run dev
```
