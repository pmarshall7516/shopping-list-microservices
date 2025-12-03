# Smart Shopping List - Microservices Starter

Starter monorepo for a cloud-native Smart Shopping List system built with FastAPI, MongoDB, React, and Docker Compose. Each service is isolated with its own container and MongoDB namespace while communicating over REST inside a local compose network.

## Services
- **User Service (`backend/user_service`, :8001)** – account registration/login, JWT issuance, password hashing, `/users/me` profile lookup. Mongo collection: `users`.
- **List Service (`backend/list_service`, :8002)** – CRUD for shopping lists and list items, scoped by authenticated user. Mongo collection: `lists` (items embedded in list docs).
- **Inventory Service (`backend/inventory_service`, :8003)** – global catalog of items and categories. Mongo collections: `items`, `categories`.
- **Stats Service (`backend/stats_service`, :8004)** – receives metrics from other services and returns simple aggregations. Mongo collection: `metrics`.
- **Recommendation Service (`backend/recommender_service`, :8005)** – stubbed recommender using historical lists. Mongo collection: `list_history`.
- **Frontend (`frontend`, :5173)** – React + Vite client with auth, lists, list detail + recommendations, and a stats dashboard.

All services expose `/health` and add a lightweight middleware hook that can emit metrics to the Stats Service (`STATS_SERVICE_URL`). Auth tokens flow via `Authorization: Bearer <token>`.

## Quick Start
**Prereqs:** Docker, Docker Compose (and optionally Node/NPM for local frontend dev).

```bash
docker-compose up --build
```
Then browse the UI at http://localhost:5173. FastAPI UIs: http://localhost:8001/docs, http://localhost:8002/docs, etc.

Environment defaults (see `docker-compose.yml` or `.env.example`):
- `MONGO_URI=mongodb://mongodb:27017`
- `JWT_SECRET=supersecret`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRES_MIN=60`
- `STATS_SERVICE_URL=http://stats_service:8004`

## Service Notes
### User Service
- Endpoints: `POST /auth/register`, `POST /auth/login` (returns JWT), `GET /users/me`.
- Uses `passlib[bcrypt]` for password hashing and `python-jose` for JWT creation/verification.

### List Service
- Endpoints: `GET/POST /lists`, `GET/PUT/DELETE /lists/{id}`, item routes under `/lists/{id}/items`.
- Embeds list items in the list document and enforces ownership using the JWT `sub` claim.

### Inventory Service
- Global catalog (per-user scoping can be added later). Endpoints for `/items` and `/categories` with simple text/category filtering.

### Stats Service
- `POST /metrics` accepts `{service_name, endpoint, method, status_code, latency_ms, timestamp}`.
- `GET /metrics/summary` aggregates avg latency and counts by service/endpoint/method.

### Recommendation Service
- `POST /recommendations` accepts `{user_id, list_id?, current_items[]}` and returns ranked dummy suggestions.
- Placeholder frequency-based logic over `list_history`; comments indicate where to plug in real ML training/inference.

## Frontend
- Vite + React Router pages: Login/Register, Lists, List Detail (with recommendations), Stats Dashboard.
- API base URLs are configurable via `VITE_*` vars (see `docker-compose.yml`).

## Local Development (optional)
- Backend: run any service locally with `uvicorn main:app --reload --port 8001` from its folder (set env vars or add a `.env`).
- Frontend: `cd frontend && npm install && npm run dev`.

## Extending
- Replace metrics stub with real instrumentation (middleware already wraps requests).
- Introduce shared auth library/package if secrets/config diverge.
- Add integration tests per service and seed scripts for catalog data.
- Build a load generator that calls each service and posts metrics into Stats Service to stress test latency aggregation.
