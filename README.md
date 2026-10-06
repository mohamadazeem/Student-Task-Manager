# Student Task Manager frontend

Run `npm install` then `npm run dev`. Open the URL Vite prints. Backend should listen on localhost:5000 during development. See API contract below.

## API contract
- `GET /api/tasks` -> JSON array of tasks
- `POST /api/tasks` -> create task (JSON body)
- `PUT /api/tasks/:id` -> update task (JSON body, full task fields)
- `DELETE /api/tasks/:id` -> 204 or other successful response

Task fields: `id` (integer), `title` (string), `description` (string), `deadline` (`YYYY-MM-DD`), `priority` (`Low`, `Medium`, `High`), `status` (`Pending`, `In Progress`, `Completed`). Return JSON for GET/POST/PUT; DELETE may return 204. Errors should return `{ "error": "message" }`. This first version assumes one shared task list; adding accounts later requires coordinated authentication and student ownership changes.
