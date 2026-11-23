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

## Jenkins deployment on the Ubuntu lab PC

The root `Jenkinsfile` checks out the repository, builds both Docker images, runs
the backend tests, deploys the application, and checks the frontend and API proxy.
It polls Git for changes approximately every five minutes after the first run.

Before running the job on the lab PC:

1. Install Jenkins directly on Ubuntu, along with Git, curl, Docker Engine, and
   a recent Docker Compose plugin supporting `up --wait`.
2. Allow the Jenkins service user to access Docker:

   ```sh
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   sudo -u jenkins -H docker ps
   sudo -u jenkins -H docker compose version
   ```

   Docker group membership grants root-level access; restrict this job and its
   repository to trusted users. Run the job on this Ubuntu node.
3. Confirm `student-task-postgres` already exists and was created with Compose.
   The pipeline automatically reads its Compose project name to reuse the current
   database volume. It stops if the container is missing or has no project label.
   If the existing database was started using `docker run`, arrange its volume
   migration before using this pipeline.
4. Create the deployment environment file outside the Jenkins checkout:

   ```sh
   sudo install -d -o root -g jenkins -m 0750 /opt/student-task-manager
   sudo touch /opt/student-task-manager/deploy.env
   sudo chown root:jenkins /opt/student-task-manager/deploy.env
   sudo chmod 0640 /opt/student-task-manager/deploy.env
   sudo nano /opt/student-task-manager/deploy.env
   ```

   Set these values, replacing both password placeholders and the JWT secret
   with the existing deployment's values:

   ```dotenv
   POSTGRES_DB=student_task_manager
   POSTGRES_USER=student_user
   POSTGRES_PASSWORD=YOUR_EXISTING_DATABASE_PASSWORD
   DB_HOST=postgres
   DB_PORT=5432
   DB_NAME=student_task_manager
   DB_USER=student_user
   DB_PASSWORD=YOUR_EXISTING_DATABASE_PASSWORD
   JWT_SECRET=YOUR_EXISTING_JWT_SECRET
   ```

   Keep this file out of Git. Changing `POSTGRES_PASSWORD` here does not change
   the password in an already initialized database.
5. Push `Jenkinsfile` and the project source to GitHub. In Jenkins, create a
   **Pipeline** job with **Pipeline script from SCM**, select **Git**, enter the
   repository URL and branch, and set **Script Path** to `Jenkinsfile`. Add a Git
   credential if the repository is private. Click **Build Now** for the first run.

The app remains available at `http://LAB_PC_IP:3000`. Existing pgAdmin is not
updated by this job. Tests must pass before deployment begins. Container updates
can briefly interrupt service; deployment failures do not automatically roll back.
Never use `docker compose down -v` to deploy, because it deletes database volumes.
