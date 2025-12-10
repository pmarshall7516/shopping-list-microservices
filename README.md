# Smart Shopping List - Microservices Starter

Starter monorepo for a cloud-native Smart Shopping List system built with FastAPI, MongoDB, React, and Docker Compose. Each service is isolated with its own container and MongoDB namespace while communicating over REST inside a local compose network.

## Stack & Services
- **User Service** (`backend/user_service`, :8001, DB `users` in `USER_DB_NAME`) – register/login, JWT issuance, `/users/me` profile lookup. Password hashing with bcrypt + JWT via python-jose.
- **List Service** (`backend/list_service`, :8002, collection `lists` in `LIST_DB_NAME`) – CRUD shopping lists and embedded list items, scoped by authenticated user.
- **Inventory Service** (`backend/inventory_service`, :8003, collections `items`, `categories` in `INVENTORY_DB_NAME`) – global catalog search + suggest endpoint.
- **Stats Service** (`backend/stats_service`, :8004, collection `metrics` in `STATS_DB_NAME`) – ingest metrics and expose summaries.
- **Recommendation Service** (`backend/recommender_service`, :8005, collection `list_history` in `RECOMMENDER_DB_NAME`) – simple co-occurrence recommender using list history + active items.
- **Frontend** (`frontend`, :5173) – React + Vite client with auth, lists, list detail + recommendations, and a stats dashboard (admin-only in UI).

All services expose `/health` and include middleware that can emit metrics to the Stats Service when `STATS_SERVICE_URL` is set. Auth tokens flow via `Authorization: Bearer <token>`.

## Environment
Create a `.env` in the repo root (used by Docker Compose):
```
MONGO_URI=mongodb://exampleconnectionstring@examplemongodb:12345
USER_DB_NAME=example_shopping_user
LIST_DB_NAME=example_shopping_lists
INVENTORY_DB_NAME=example_shopping_inventory
STATS_DB_NAME=example_shopping_stats
RECOMMENDER_DB_NAME=example_shopping_recommender

JWT_SECRET=supersecret
JWT_ALGORITHM=HS256
JWT_EXPIRES_MIN=60

STATS_SERVICE_URL=http://stats_service:8004
```

## Run with Docker Compose
**Prereqs:** Docker + Docker Compose.
```bash
docker-compose up --build
```
Then browse the UI at http://localhost:5173. FastAPI docs live at `http://localhost:<port>/docs` for each service (8001–8005).

## Sample Data (Inventory)
`grocery_store.csv` contains starter catalog items. Import them into the Inventory Service database:
```bash
# from repo root
docker-compose run --rm inventory_service python backend/inventory_service/import_grocery_csv.py
```

## Service Endpoints (high level)
- **User**: `POST /auth/register`, `POST /auth/login` (returns JWT), `GET /users/me`.
- **Lists**: `GET/POST /lists`, `GET/PUT/DELETE /lists/{id}`, item routes under `/lists/{id}/items` (add/update/delete with `checked` flag).
- **Inventory**: `GET /items` (filter by `category`, `text`), `GET /items/suggest?text=`, CRUD on `/items/{id}`, `GET/POST /categories`.
- **Stats**: `POST /metrics` accepts `{service_name, endpoint, method, status_code, latency_ms, timestamp}`; `GET /metrics/summary`; `GET /metrics/method-summary` (used by UI).
- **Recommendations**: `POST /recommendations` with `{user_id, list_id?, current_items[]}`; returns up to 10 ranked suggestions based on co-occurrence + user history.

## Frontend Features
- Auth flows (register/login) with token persisted in `localStorage`; `/stats` route is visible only for `admin: true` users (set manually in DB if needed).
- Lists page (view + delete), create list form, list detail page with inline item add/check/remove and inventory typeahead.
- Recommendations panel calling the recommender service using current list items, plus Stats dashboard rendering method-level aggregations.

## Notes
- Metrics emission is best-effort; services continue running if the Stats Service is offline.
- List Service data are user-scoped via JWT `sub`; Inventory data are global in this starter.
- Recommendation responses are heuristic; replace with a real model by swapping logic in `backend/recommender_service/main.py`.
- `python stress.py` runs a simple test (when the app is running) which runs a workload of opperations with an increasingly larger number concurrent opperations. The latency of these operations is recorded in order to measure how differing amounts of concurrent requests/API calls effects the latency of these calls. 
