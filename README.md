# Trading Card Monitor

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2F%20DDD-orange.svg)](#hexagonal-architecture-and-ddd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Track the Magic: The Gathering singles you care about and get a Telegram message when a matching listing appears.**

> **Demo:** Replace this placeholder with a product screenshot or short GIF.
>
> ![Trading Card Monitor demo placeholder](docs/images/demo-placeholder.png)

## Problem and solution

Trading card listings and prices can change quickly, and manually checking marketplaces is easy to forget. Trading Card Monitor lets you define the cards, printings, and listing criteria you care about, then checks the market on a schedule and sends matches to you through Telegram.

## Key features

- Track multiple cards and printings.
- Set a maximum price and optional filters (e.g., condition, language, foil status), including market-specific ones (e.g., want to buy using the CardTrader Zero service).
- Receive Telegram notifications when listings match your criteria.
- Manage monitors through an interactive Telegram bot.

## Architectural highlights

### Hexagonal Architecture and DDD

Market data, Telegram interactions, and persistence have different concerns and change at different rates. The application keeps its business rules separate from those integrations: the domain models cards, monitors, filters, and match events; application use cases coordinate work through interfaces; infrastructure adapters connect those interfaces to external systems.

This separation makes domain behavior easier to test without Telegram, a live marketplace, or a database. It also gives integrations clear seams: adapters can evolve without making marketplace or framework-specific details part of the domain.

```mermaid
flowchart LR
    Telegram["Telegram"]
    Market["CardTrader"]
    Database["SQL database"]
    SessionStore["Valkey"]

    subgraph App["Trading Card Monitor — one Node.js process"]
        subgraph Inbound["Driving adapter"]
            Grammy["grammY webhook controller"]
        end

        subgraph Application["Application layer"]
            BotPort["Bot input / output ports"]
            UseCases["Use cases and command handlers"]
            MarketPort["Card listing catalog port"]
            RepoPort["Monitor and user repository ports"]
            SessionPort["Conversation state storage port"]
        end

        subgraph Domain["Core domain"]
            Entities["Card monitor and listing entities"]
            Rules["Matching and filtering rules"]
            Events["Domain events"]
        end

        subgraph Outbound["Driven adapters"]
            CardTraderAdapter["CardTrader market adapter"]
            DrizzleAdapter["Drizzle persistence adapter"]
            RedisAdapter["Redis-compatible session adapter"]
            Notifier["Telegram notification adapter"]
        end

        Grammy --> BotPort
        BotPort --> UseCases
        UseCases --> Entities
        UseCases --> MarketPort
        UseCases --> RepoPort
        UseCases --> SessionPort
        Entities --> Rules
        Entities --> Events
        MarketPort --> CardTraderAdapter
        RepoPort --> DrizzleAdapter
        SessionPort --> RedisAdapter
        Events --> Notifier
    end

    Telegram --> Grammy
    CardTraderAdapter --> Market
    DrizzleAdapter --> Database
    RedisAdapter --> SessionStore
    Notifier --> Telegram
```

### Modular monolith

The application runs as one process, but its code is divided into focused modules for the domain, use cases, bot UI, marketplace integrations, persistence, and scheduled jobs. This keeps local development and deployment straightforward without giving up clear module boundaries.

The process starts scheduled work alongside the Telegram webhook: active monitors are periodically scanned, and marketplace data is synchronized on a schedule.

## Project structure

The tree below reflects the current codebase. `core/` contains domain concepts, `use-cases/` contains application workflows, and integration modules provide infrastructure adapters.

```text
src/
├── core/                 # Domain entities, value objects, rules, and events
├── use-cases/            # Application workflows
├── bot-ui/               # Core elements of a Bot UI intended as a state machine
├── ui/                   # App-specific state machines and presenters
├── grammy/               # grammY inbound and outbound adapters
├── cardtrader/           # CardTrader models and infrastructure
├── scryfall/             # Scryfall models and adapters
├── drizzle/              # SQL schema, queries, and repository adapters
├── redis/                # Valkey/Redis session storage adapter
├── jobs/                 # Scheduled scanning, synchronization, and cleanup
├── event-bus/            # In-process domain event publisher
├── config/               # Validated application configuration
└── index.ts              # Composition root: wires adapters and starts the app
```

## Tech stack and engineering decisions

| Technology | Purpose | Rationale |
| --- | --- | --- |
| Node.js and TypeScript | Runtime and application language | A single-process runtime with strict types across domain and integration boundaries. |
| grammY and Express | Telegram bot and webhook endpoint | Keeps Telegram transport in an adapter. |
| Drizzle ORM and libSQL | Relational persistence | Typed schema and queries, with a SQLite-compatible local database and libSQL connection support. |
| Valkey / Redis-compatible storage | Bot conversation state | Keeps transient interaction state separate from relational data. |
| CardTrader and Scryfall APIs | Marketplace listings and card search data | Separate market listing retrieval from card discovery and catalog data. |
| XState | Bot conversation workflows | Models multi-step interactions as explicit state machines. |
| `node-cron` | Background scheduled jobs | Runs market scans, catalog synchronization, and data cleanup. |
| Zod and dotenv | Configuration validation | Loads environment settings and reports invalid configuration at startup. |
| Node.js test runner | Automated tests | Uses the built-in test runner for the project’s test suite. |

## Getting started

### Prerequisites

- A current Node.js release and npm.
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- A CardTrader API token.
- A SQL database supported by libSQL, such as a local SQLite file.
- A Valkey or Redis-compatible server.
- An HTTPS-reachable webhook domain for Telegram. For local development, use a secure tunnel or a public HTTPS endpoint that forwards to your local port.

### Install

```bash
git clone https://github.com/ZicNik/trading-card-monitor.git
cd trading-card-monitor
npm install
```

Create a `.env` file in the project root using the configuration reference below. Keep credentials out of version control.

For a local Valkey instance, if the `valkey-server` executable is installed:

```bash
npm run redis:start
```

This starts Valkey on port `6380`.

### Prepare the database

For a local database set `DB_DIALECT=sqlite` and `DB_URL` to a local path, such as `file:local.db`. Then apply the SQLite schema:

```bash
npm run db:push
```

For hosted libSQL databases (see [Turso](https://turso.tech)), configure your host's database dialect, URL, and authentication token.

### Build and run

```bash
npm run build
npm start
```

The app listens on `PORT`, exposes `GET /ping` for a basic health check, and registers a Telegram webhook using `WEBHOOK_DOMAIN`. Configure your HTTPS endpoint or tunnel to forward webhook requests to the app.

### Check the code and run tests

```bash
npm run check
npm run lint
npm test
```

The test script loads `.env.test`. The current suite includes database and live API integration tests, so configure test credentials and services separately from development before running it.

## Configuration

Create `.env` in the repository root. The application validates the required settings at startup.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `BOT_TOKEN` | Yes | `123456:replace-with-your-token` | Telegram bot token from BotFather. |
| `WEBHOOK_DOMAIN` | Yes | `bot.example.com` | Public domain used to register the Telegram HTTPS webhook. Do not include a URL path. |
| `PORT` | Yes | `3000` | Port for the webhook and health-check server. |
| `DB_URL` | Yes | `file:local.db` | libSQL database URL. |
| `DB_TOKEN` | No | — | Authentication token for hosted libSQL databases; omit for local SQLite. |
| `DB_DIALECT` | For database tooling | `sqlite` or `turso` | Drizzle Kit dialect used by `npm run db:push`. |
| `REDIS_URL` | Yes | `redis://localhost:6380` | Valkey/Redis connection URL for conversation state. |
| `CARDTRADER_TOKEN` | Yes | `replace-with-your-token` | CardTrader API token. |
| `DFLT_TIMEZONE` | Yes | `Europe/Rome` | Default timezone used by the application clock. |
| `CERT_PATH` | No | `ssl/cert.pem` | TLS certificate path. Set together with `KEY_PATH` to serve HTTPS directly. |
| `KEY_PATH` | No | `ssl/key.pem` | TLS private key path. Set together with `CERT_PATH` to serve HTTPS directly. |

For local HTTPS termination at a reverse proxy or tunnel, leave `CERT_PATH` and `KEY_PATH` unset and forward traffic to the app’s `PORT`. The webhook server itself uses HTTPS only when both TLS paths are configured.

## Deployment

Deploy the app as a single long-running Node.js service. Provide its required environment variables, a reachable SQL database, and a Valkey/Redis-compatible service. Build the project with `npm run build`, then start it with `npm start`.

Configure the hosting provider or reverse proxy to expose the app through HTTPS, forward webhook traffic to `PORT`, and set `WEBHOOK_DOMAIN` to the public hostname. The `/ping` endpoint can be used for a basic health check. Keep one active application instance unless scheduled jobs are coordinated externally: each process starts its own scans and synchronization jobs.

For local development, use a local database and Valkey instance, and expose the webhook server through an HTTPS tunnel. Telegram webhooks require a publicly reachable HTTPS endpoint; starting the app on localhost alone is not sufficient to receive bot updates.

## Roadmap and trade-offs

The current design favors a maintainable single-process service over the operational overhead of microservices. Module boundaries and ports keep the domain and integrations decoupled, while a single deployment keeps coordination simple.

There are deliberate limits:

- **Scheduled scans, not a streaming feed:** active monitors are checked every ten minutes. Notifications are sent when a subsequent scan finds a match, not at the instant a listing is published.
- **Marketplace scope:** CardTrader is the current listing-market integration. Additional markets can be introduced by adding a corresponding module.
- **Rate limits:** API integrations must respect provider limits. CardTrader requests use rate-limiting support; request volume and scan frequency should be reviewed as usage grows.
- **Single-process scheduling:** running multiple app instances duplicates scheduled work. Horizontal scaling would require a coordinated job runner or distributed scheduling strategy.

Potential next steps include adding marketplace adapters, expanding operational observability, and coordinating scheduled jobs for multi-instance deployments.
