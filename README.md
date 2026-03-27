# SmartCalorie AI

Smart Fitness Tracking meets AI-Driven Nutrition by turning workouts into personalized calorie targets and agentic meal recommendations.

## Architecture Overview

### Fortress: Dockerized Microservices

SmartCalorie AI runs as a set of containerized services orchestrated by `docker-compose`:
- a PostgreSQL database for relational persistence
- a FastAPI backend that exposes authenticated REST endpoints
- a React/Vite frontend for the user interface
- MLflow for experiment tracking
- Prometheus and Grafana for monitoring and observability

### Brain: XGBoost + Gemini Agent

The system combines:
- **XGBoost regression** for workout calorie prediction (served via an MLflow model)
- a **Google Gemini agentic recommendation engine** to generate meal blueprints
- **USDA FoodData Central** lookups to resolve ingredients and support meal construction

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Frontend:** React, Tailwind CSS, Vite
- **Database:** PostgreSQL (7-table relational schema)
- **AI/ML:**
  - XGBoost (regression-based calorie prediction)
  - Google Gemini (agentic meal blueprint generation)
  - USDA FoodData API (ingredient resolution and harvesting support)
- **MLOps & Monitoring:** MLflow, Prometheus, Grafana
- **DevOps:** Docker Compose, GitHub Actions, GHCR

## Key Features

- Secure **JWT authentication** and **physical profile management** (`/auth/*`, `/users/me`)
- **Multi-exercise workout logging** with ML-powered calorie prediction (`/predict/*`)
- Agentic **meal recommendation engine** backed by:
  - Gemini blueprint generation
  - USDA-backed ingredient resolution
  - deterministic calorie/math scaling for portion construction
- **Relational history tracking** for both workouts and nutrition plans (`/predict/history`, `/recommend/history`)
- Admin “control tower” with system-wide **analytics and statistics dashboards** (`/admin/stats`, `/admin/analytics`)

## Project Structure

```text
SmartCalorie_AI/
├─ backend/
│  ├─ api/                  # FastAPI routes (auth, users, predict, recommend, admin)
│  ├─ core/                 # Configuration, security, dependencies, metrics
│  ├─ db/                   # SQLAlchemy session + Base
│  ├─ models/               # SQLAlchemy table models (User, Ingredient, Workout, ...)
│  ├─ schemas/              # Pydantic request/response models
│  ├─ services/             # Business logic (prediction, recommendation, repository, ...)
│  ├─ scripts/              # USDA harvesting and related utilities
│  ├─ alembic/              # DB migrations
│  ├─ tests/
│  ├─ Dockerfile
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ pages/            # Routed UI pages (dashboard, history, admin, profile, ...)
│  │  ├─ components/       # UI components (MealPlanDisplay, AdminLayout, Modal, ...)
│  │  ├─ context/          # AuthContext
│  │  ├─ api/               # Axios client + API baseURL handling
│  │  └─ utils/
│  ├─ tailwind.config.js
│  └─ Dockerfile
├─ monitoring/
│  ├─ prometheus.yml
│  └─ mlflow.Dockerfile
├─ artifacts/              # ML artifacts (e.g., preprocessing metadata)
├─ data/                   # Dataset or supporting project data (if present)
├─ notebooks/              # Training and analysis notebooks
├─ .github/
│  └─ workflows/
│     └─ pipeline.yml      # CI: tests + GHCR image publishing
├─ docker-compose.yml
├─ .env                     # Required runtime configuration (API keys, secrets)
└─ README.md
```

## Setup & Installation

### Docker-first (Recommended)

1. Ensure `.env` is configured with required keys (at minimum: `USDA_API_KEY`, `GOOGLE_API_KEY`).
2. Build and start all containers:

```bash
docker-compose up --build
```

### Expected Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`
- MLflow UI: `http://localhost:5000`
- Grafana: `http://localhost:3000`

## Monitoring

- **MLflow:** access the tracking UI at `http://localhost:5000`
- **Grafana dashboards:** access at `http://localhost:3000` (powered by Prometheus)
- **Prometheus:** available on `http://localhost:9090` (scrapes metrics from the stack)