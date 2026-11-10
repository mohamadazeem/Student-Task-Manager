# Student Task Manager

## Run with Docker

Install and start Docker Desktop with Linux containers enabled. If `backend/.env`
does not exist, copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET`
to a strong secret.

From the project directory, run:

```sh
docker compose up --build -d
```

Open http://localhost:3000. The API runs at http://localhost:5000.
The backend connects to the MongoDB container at `mongodb://mongodb:27017`.
It waits for MongoDB to become healthy before starting.

MongoDB stores data in the `mongodb_data` Docker volume. `docker compose down`
keeps this data; `docker compose down -v` deletes it. This local development
database has no authentication and its published port is bound to localhost.
Existing Atlas data is not copied into the local database.

## Run the backend outside Docker

Start only the database:

```sh
docker compose up -d mongodb
```

Use `MONGODB_URI=mongodb://127.0.0.1:27017` in `backend/.env`, with
`DB_NAME=student_task_manager` and your existing `JWT_SECRET`. Then run:

```sh
cd backend
npm ci
npm run dev
```

Docker Compose overrides the connection URI with the database service hostname
when running the backend in its container.
