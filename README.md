# Student Task Manager

## Run with Docker

Install and start Docker Desktop with Linux containers enabled. If `backend/.env`
does not exist, copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET`
to a strong secret.

From the project directory, run:

```sh
docker compose up --build -d
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **pgAdmin 4 (Database GUI)**: http://localhost:5050

### pgAdmin GUI Access

- **URL**: http://localhost:5050
- **Email**: `admin@admin.com`
- **Password**: `admin`
- The PostgreSQL database ("Student Task PostgreSQL") is pre-configured in the server tree pointing to `postgres:5432` (`student_user` / `AZMazm123@`).

PostgreSQL stores data in the `postgres_data` Docker volume. pgAdmin preferences are stored in `pgadmin_data`. `docker compose down` keeps this data; `docker compose down -v` deletes it.

## Run the backend outside Docker

Start the database and pgAdmin:

```sh
docker compose up -d postgres pgadmin
```

Configure PostgreSQL credentials in `backend/.env` (default: `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_NAME=student_task_manager`, `DB_USER=student_user`, `DB_PASSWORD=AZMazm123@`) and your existing `JWT_SECRET`. Then run:

```sh
cd backend
npm install
npm run dev
```

Docker Compose automatically overrides `DB_HOST: postgres` and `DB_PORT: 5432` with the database service hostname when running the backend in its container.
