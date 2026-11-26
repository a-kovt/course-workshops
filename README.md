# Workshops

Hands-on workshops for university courses. Each workshop is a self-contained project that runs
with Docker Compose and has its own README.

## Workshops

| Workshop                                        | Course           | Topic                                                               |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| [Race Conditions](01-race-conditions/README.md) | Web Interactions | Race conditions on a shared resource: locks, atomic updates, queues |

## Repository layout

<pre>
.
├── <a href="01-race-conditions/README.md">01-race-conditions/</a>
│   ├── backend/
│   ├── frontend/
│   ├── infra/
│   └── load/
└── .github/
    ├── workflows/      one CI workflow per workshop
    └── dependabot.yml
</pre>

## Requirements

- Docker with Compose to run a workshop.
- [uv](https://docs.astral.sh/uv/) and Node.js 26 for local development.

## Conventions

- Each workshop has its own folder with a `README.md`, a `compose.yaml` and a CI workflow in
  `.github/workflows/<workshop>.yml` that runs when the folder changes.
- Python projects use uv, Ruff and ty, frontend projects use npm, ESLint, Prettier and Vitest.
- Dependencies are pinned in lock files and updated by Dependabot.
