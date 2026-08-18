# Kusai-max API (Render migration)

This minimal backend provides endpoints used by the frontend after migrating off Firebase.

Quick start (local)

1. Install dependencies

   cd api
   npm install

2. Copy .env.example -> .env and set DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

3. Generate Prisma client and run migration

   npx prisma generate
   npx prisma migrate dev --name init

4. Start dev server

   npm run dev

Endpoints

- POST /api/auth/login  { name, phone }  -> creates or returns client, returns { user, token }
- POST /api/auth/admin-login { login, password } -> returns admin user and token if matches env
- GET  /api/clients?phone=... -> get client by phone
- PUT  /api/clients/:id  (Authorization: Bearer <token>) -> update client profile

Deploy on Render

- Create a Managed Postgres instance and set DATABASE_URL in the Web Service environment.
- Create a Web Service for this api folder. Build: npm install && npx prisma generate && npm run start
- Set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD in Render env.

