# Race Conditions

**Prize Race** is a live game where many users claim a limited number of prizes at the same moment.
The project implements the same claim operation in four ways and in queue mode, and shows the
result on a live board, in Grafana and in Jaeger.

## Stack

| Layer         | Technology                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Base UI), React Router |
| Backend       | Python 3.15, FastAPI, Pydantic, asyncpg, aio-pika                             |
| Data          | PostgreSQL (state, `LISTEN/NOTIFY`), RabbitMQ (queue mode)                    |
| Observability | OpenTelemetry (OTLP), Prometheus, Grafana, Jaeger                             |
| Tooling       | uv, Ruff, ty, pytest, npm, ESLint, Prettier, Vitest, Docker Compose           |

## Quick start

Requires Docker with Compose.

```sh
cp .env.example .env
docker compose up -d --build                # board, API, Postgres, observability
docker compose --profile broker up -d       # RabbitMQ and the queue worker
```

| Service      | URL                        |
| ------------ | -------------------------- |
| Board        | http://localhost:8080      |
| Host console | http://localhost:8080/host |
| API docs     | http://localhost:8080/docs |
| Grafana      | http://localhost:3000      |
| Jaeger       | http://localhost:16686     |
| Prometheus   | http://localhost:9090      |
| RabbitMQ     | http://localhost:15672     |

Other devices on the same network open the board at `http://<host IP>:8080`.

Bot load with k6.

```sh
docker compose run --rm k6 run /scripts/storm.js
docker compose run --rm -e USERS=300 -e CLICKS=3 k6 run /scripts/storm.js
```

Stop the stack with `docker compose --profile broker down`, and add `-v` to delete the database.

## Configuration

Settings are read from `.env` (see [`.env.example`](.env.example)).

| Variable          | Default     | Purpose                                                         |
| ----------------- | ----------- | --------------------------------------------------------------- |
| `APP_ADDR`        | `0.0.0.0`   | Board bind address                                              |
| `APP_PORT`        | `8080`      | Board port                                                      |
| `TOOLS_ADDR`      | `127.0.0.1` | Bind address of Grafana, Jaeger, Prometheus, RabbitMQ, Postgres |
| `ADMIN_TOKEN`     | `lecturer`  | Host console token, sent in the `X-Admin-Token` header          |
| `PUBLIC_RESET`    | `true`      | Players may start rounds and countdowns                         |
| `WORKER_STRATEGY` | `naive`     | Strategy the queue worker runs                                  |
| `WORKER_PREFETCH` | `1`         | Messages one worker handles at once                             |

## How it works

```mermaid
flowchart LR
    B[Browser] -->|HTTP| N[nginx]
    N --> A1[app1] & A2[app2]
    A1 & A2 -->|strategy| P[(Postgres)]
    A1 & A2 -->|queue mode| R[[RabbitMQ]] --> W[worker] -->|strategy| P
    P -.->|NOTIFY| A1 & A2
    A1 & A2 -.->|SSE| B
```

- nginx balances requests between two API instances, `app1` and `app2`.
- The `game` table holds one row with `prizes_left`, and every prize handed out is a row in `winners`.
- Every change sends `pg_notify` with the event and the game state. Each API instance listens on the
  channel and forwards the event to its Server-Sent Events clients.
- In queue mode `POST /api/game/claims` publishes a message and returns `202 Accepted`. The worker
  runs the strategy, acknowledges the message after commit and the result reaches the browser over SSE.
- The API and the worker send traces to Jaeger and metrics to Prometheus over OTLP. The trace
  context is passed in message headers.

### API

Swagger UI with all operations is at http://localhost:8080/docs. Host-only operations require the
`X-Admin-Token` header.

| Method   | Path                   | Purpose                                                         |
| -------- | ---------------------- | --------------------------------------------------------------- |
| `GET`    | `/api/game`            | Game state and winners of the round                             |
| `GET`    | `/api/game/events`     | Server-Sent Events – a snapshot, then every change              |
| `POST`   | `/api/game/claims`     | Claim a prize – `200` with the result, `202` in queue mode      |
| `POST`   | `/api/game/rounds`     | Start the next round, with new settings for the host only       |
| `POST`   | `/api/game/countdowns` | Show 3-2-1-GO on every board                                    |
| `DELETE` | `/api/game/results`    | Delete all winners and attempts and purge the queue (host-only) |

### Strategies

The strategies are in [`backend/src/race_conditions/strategies.py`](backend/src/race_conditions/strategies.py).
The round's `delay_ms` sets a pause between the check and the write.

| Mode         | Mechanism                                                 | Result                                      |
| ------------ | --------------------------------------------------------- | ------------------------------------------- |
| `naive`      | read, check, write the computed value                     | more winners than prizes                    |
| `lock`       | `asyncio.Lock` around the naive code                      | correct in one process, not across two      |
| `for_update` | `SELECT … FOR UPDATE` until commit                        | correct, claims wait for each other         |
| `atomic`     | `UPDATE … WHERE prizes_left > 0` and one attempt per user | correct, repeated claims return `duplicate` |
| `queue`      | RabbitMQ and a worker running `WORKER_STRATEGY`           | correct with one worker, not with several   |

### Metrics

| Metric                                                 | Meaning                         |
| ------------------------------------------------------ | ------------------------------- |
| `prize_prizes_left`, `prize_winners`, `prize_oversold` | Round state                     |
| `prize_claims_total{mode, result}`                     | Claims by mode and result       |
| `prize_claim_duration_milliseconds`                    | Claim handling time             |
| `prize_queue_wait_milliseconds`                        | Time a claim waits in the queue |
| `prize_sse_clients`                                    | Open SSE connections            |

## Project layout

```
backend/                 FastAPI API and queue worker
  src/race_conditions/
    api/                 routes, schemas, dependencies
    services/            claims, rounds, live events
    strategies.py        claim strategies
    db.py, broker.py     Postgres and RabbitMQ
    main.py, worker.py   entry points
  tests/
frontend/                board and host console
  src/
    api/                 HTTP and SSE clients, types
    model/               board state and texts
    hooks/               React hooks
    components/          components, ui/ is shadcn/ui
    pages/               Board, HostConsole
infra/                   Postgres schema, nginx, observability, RabbitMQ
load/                    k6 script
```

## Development

Backend, from `backend/`.

```sh
uv sync
uv run ruff format --check . && uv run ruff check .
uv run ty check src tests
uv run pytest
uv run fastapi dev   # API on localhost:8000 with the Postgres from Compose
TEST_DATABASE_URL=postgresql://prize:prize@localhost:5432/prize uv run pytest -m integration
```

Integration tests run against the Compose database and start new rounds in it.

Frontend, from `frontend/` with Node 26.

```sh
npm ci
npm run dev        # http://localhost:5173, /api is proxied to localhost:8080 (API_URL to change)
npm run lint && npm run format:check && npm test && npm run build
```

The `backend/src` folder is mounted into the API containers, and the API reloads on save.
