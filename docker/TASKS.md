# Lab tasks — Docker

You work on the [`app/`](app/) directory (application skeleton) and create Docker files in the repository root. Each task has a clear acceptance criterion.

---

## Task 1 — Dockerfile for the backend (Node.js)

**Goal:** build an image that runs the REST API from `app/backend/`.

**Requirements:**
1. Base image: `node:20-alpine` (a specific version, not `latest`).
2. Working directory: `/app`.
3. **Order of `COPY` instructions** must be cache-friendly: copy `package*.json` first, then `npm ci`, and only afterwards the rest of the code.
4. Install production dependencies only: `npm ci --omit=dev`.
5. Expose port `3000` with `EXPOSE`.
6. Default `CMD` runs `node src/server.js`.
7. **Bonus:** run the process as a non-root user (`USER node`).

**File:** `backend/Dockerfile` in the repository root (build context: `./app/backend`).

**Test:**
```bash
docker build -t clinic-backend ./app/backend -f backend/Dockerfile
docker run --rm -p 3000:3000 clinic-backend
# in another terminal:
curl http://localhost:3000/health   # → {"status":"ok"} (won't actually return without the DB — that's fine, check the logs)
```

**Acceptance:**
- `docker images clinic-backend` shows an image < 250 MB.
- Logs show DB connection attempts (`[db] not ready ...`) — meaning the application started.

---

## Task 2 — Dockerfile for frontend and admin (multi-stage)

**Goal:** build the React static assets and serve them through `nginx`.

**Requirements:**
1. **Stage 1 (builder):** `node:20-alpine` → `npm ci` → `npm run build` (produces `dist/`).
2. **Stage 2 (runtime):** `nginx:1.27-alpine` → copy only `/app/dist` into `/usr/share/nginx/html`.
3. The `VITE_API_URL` variable must be available in **the builder stage** as `ARG` + `ENV` (Vite bakes it into the bundle).
4. `EXPOSE 80`.
5. The nginx config must fall back to `index.html` for SPA routing. **A ready-made `nginx.conf` is provided in `app/frontend/` and `app/admin/`** — just copy it inside the Dockerfile to `/etc/nginx/conf.d/default.conf`.

**Files:**
- `frontend/Dockerfile` (context: `./app/frontend`)
- `admin/Dockerfile` (context: `./app/admin`)

**Test:**
```bash
docker build -t clinic-frontend ./app/frontend -f frontend/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:3000
docker run --rm -p 8080:80 clinic-frontend
# in the browser: http://localhost:8080 — you should see the registration form
```

**Acceptance:**
- The `clinic-frontend` image weighs **< 80 MB** (`docker images`).
- The image contains no `node_modules` or `.jsx` sources (check: `docker run --rm clinic-frontend ls /usr/share/nginx/html`).

---

## Task 3 — `docker-compose.yml`

**Goal:** define the 4 services in a single compose file and start them with one command.

**Requirements:**
1. Services: `db`, `backend`, `frontend`, `admin`.
2. Every service has its `image` (with the `clinic-` prefix) and/or `build` with a context.
3. Port mapping: `frontend → 8080`, `admin → 8081`, `backend → 3000`. **Do not** expose `db` on the host — communication goes through the Docker network.
4. A **custom network** named `clinic-net`, all services attached to it.
5. Restart policy `unless-stopped` for `db` and `backend`.

**Test:**
```bash
docker compose up -d --build
docker compose ps    # all 4 services "running"
```

**Acceptance:**
- `http://localhost:8080` opens the chat and shows the seeded conversation for the demo user (John Smith).
- `http://localhost:8081` shows the user list with the 5 seeded users.
- Sending a message from the patient frontend persists it (`docker compose exec db psql -U app -d registration -c "SELECT count(*) FROM messages;"` returns a higher count).

---

## Task 4 — volumes, healthcheck, depends_on

**Goal:** make data persistent and start services in the correct order.

**Requirements:**
1. A **named volume** `db-data` mounted at `/var/lib/postgresql/data`.
2. Mount `app/db/init.sql` as `:ro` under `/docker-entrypoint-initdb.d/` (it is executed on the first start).
3. **Healthcheck** for `db`:
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
     interval: 5s
     timeout: 5s
     retries: 10
   ```
4. `backend.depends_on.db.condition: service_healthy`.
5. **Bonus:** healthcheck for `backend` (`curl -f http://localhost:3000/health`).

**Persistence test:**
```bash
docker compose up -d
# send a chat message from http://localhost:8080
docker compose down
docker compose up -d
# reload the page — the message you sent is still there
```

**Fresh-start test:**
```bash
docker compose down -v
docker compose up -d
# the database starts from init.sql — only the 5 seeded users and the sample conversation exist
```

---

## Task 5 — environment variables, `.env`, `.dockerignore`

**Goal:** move configuration out of `docker-compose.yml` and shrink the build context.

**Requirements:**
1. Create an `.env` file in the repository root containing:
   ```
   POSTGRES_USER=app
   POSTGRES_PASSWORD=...strong...
   POSTGRES_DB=registration
   API_PORT=3000
   FRONTEND_PORT=8080
   ADMIN_PORT=8081
   VITE_API_URL=http://localhost:3000
   ```
2. In `docker-compose.yml` reference `${POSTGRES_PASSWORD}`, `${API_PORT}`, etc. — **no hard-coded values**.
3. Add `.env` to `.gitignore`.
4. Create a `.dockerignore` in **every** build-context directory (`app/backend/`, `app/frontend/`, `app/admin/`) containing at least:
   ```
   node_modules
   npm-debug.log
   .env
   .env.*
   .git
   .gitignore
   Dockerfile
   .dockerignore
   dist
   build
   ```

**Test:**
```bash
docker compose config    # rendered compose — secrets should be substituted
docker compose build --no-cache backend   # build should be fast (small context)
```

**Acceptance:**
- `git grep "POSTGRES_PASSWORD" docker-compose.yml` finds no literal value, only `${POSTGRES_PASSWORD}`.
- `docker compose build` with `node_modules` deleted has a context < 1 MB (`Sending build context to Docker daemon: ...`).

---

## Bonus tasks (for a higher grade)

### B6 — Reverse proxy (nginx) as a single entry point
Add a `proxy: nginx:alpine` service listening on :80 that routes:
- `/` → `frontend`
- `/admin` → `admin`
- `/api` → `backend`

Expose only port 80 on the host. The other services stay on the internal network.

### B7 — Compose profiles
Add a `tools` profile with a `pgadmin` service (port 5050). It should not start by default. Launch it with `docker compose --profile tools up -d`.

### B8 — File-based secrets
Pass the Postgres password through `secrets:` (file) instead of an env variable. The backend reads the password from `/run/secrets/db_password`.

### B9 — BuildKit cache mounts
Enable the npm cache with `RUN --mount=type=cache,target=/root/.npm npm ci ...` and measure the difference in rebuild time.

---

## Review questions

Put your answers (short, 1–3 sentences) in `REPORT.md`.

1. What is the **difference** between `COPY` and `ADD` in a Dockerfile? When should each be used?
2. Why do we **NOT** copy `node_modules` from the first stage into the second stage in a multi-stage build for a React app?
3. What happens if in `docker-compose.yml` you use a bind mount `./data:/var/lib/postgresql/data` (in the project folder on macOS/Windows) instead of a named volume `db-data`, and why?
4. Why is `depends_on` **without** `condition: service_healthy` **not enough** for a database?
5. The `.env` file is in `.gitignore`. How does a teammate find out which variables they need to set locally? What is the conventional answer?
6. The `VITE_API_URL` variable is baked into the bundle at **build time**. What are the consequences for deploying to multiple environments (dev/staging/prod) and how can it be worked around?
7. Give **3 reasons** why a Docker image can grow unnecessarily from 50 MB to 1 GB.
8. `docker compose down` vs `docker compose down -v` — what is the difference?
9. Should a production image contain `curl`? Argue both sides.
10. How does **layer caching** work in Docker? Why does putting `COPY package.json` before `COPY . .` matter?

---

## Submission checklist

- [ ] `docker compose up -d --build` brings up all 4 services without errors.
- [ ] All criteria from sections 6.1 and 6.2 of [`LAB_INSTRUKCJA.md`](LAB_INSTRUKCJA.md) are met.
- [ ] `REPORT.md` contains answers to all 10 review questions.
- [ ] The repo does not contain `node_modules/`, `.env`, or any Postgres data.
- [ ] `git log` shows meaningful commits (not a single "final" one at midnight).
