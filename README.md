(# Fetan Delivery

Fetan Delivery is a food delivery web application built for AASTU students to order meals from on-campus vendors. The project includes a React + Vite frontend and a Node/Express backend with Prisma for database access and migrations.

**Project structure**

- `frontend/` — React + Vite app (client-side UI, push notifications, service worker)
- `backend/` — Node.js server (API routes, authentication, order management, SMS/push integrations)
- `prisma/` — Prisma schema and migrations (inside `backend/prisma`)

**Key features**

- User registration, login, and JWT-based authentication
- Place and track orders with real-time updates via WebSockets
- Admin dashboard for availability and order management
- Push notifications and SMS integration for order updates
- Configurable pricing and item availability
