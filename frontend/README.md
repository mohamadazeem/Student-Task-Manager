# Student Task Manager frontend

React frontend for the Student Task Manager. API requests use `/api`; Vite proxies them to `http://localhost:5000` during development, and Nginx proxies them to the backend container in Docker.

## Local development

Configure `backend/.env` using `backend/.env.example`. Keep real credentials out of Git. The backend requires MongoDB Atlas access and a JWT secret.

In one terminal, from the project root:

```powershell
cd backend
npm.cmd ci
npm.cmd start
```

In another terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. The root `.env` is legacy configuration; the backend and Docker Compose use `backend/.env`.

## Checks

From `frontend`:

```powershell
npm.cmd run lint
npm.cmd run build
```

From `backend`:

```powershell
npm.cmd test
```

Backend tests use mocked database operations and real Mongoose validation, bcrypt, and JWT logic. They do not verify Atlas connectivity or database persistence.

## Docker

Start Docker Desktop with its Linux engine running, then run from the project root:

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose logs backend
```

Open http://localhost:3000. Allow the host's public IP in Atlas network access and provide a database user with access to the configured database. No local PostgreSQL or MongoDB installation is required.

On non-Windows systems, use `npm` in place of `npm.cmd`.
