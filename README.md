# MemFlow Engine · Memory Visualization & Analytics

<div align="center">

**A high-fidelity, interactive simulator for OS Page Replacement Algorithms — built for engineers, students, and educators.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://memflow-visualizer.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://memflow-visualizer.onrender.com)

---

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python_3.9-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## Overview

**MemFlow Engine** is a production-grade, full-stack analytics platform that simulates and benchmarks three classical **Virtual Memory Page Replacement Algorithms**:

| Algorithm | Strategy |
|-----------|----------|
| **FIFO** (First-In, First-Out) | Evicts the page that has been in memory the longest |
| **LRU** (Least Recently Used) | Evicts the page that was accessed the least recently |
| **Optimal (OPT)** | Looks ahead and evicts the page used farthest in the future |

The platform is architected for **academic benchmarking**, **live classroom demonstrations**, and **OS concept exploration**. It provides a step-by-step execution engine with animated memory frames, real-time performance metrics, and a comparative analytics dashboard.

---

## ✦ Features

### 🖥️ Real-Time Memory Grid Visualization
Each simulation step renders a live memory frame grid. Pages entering memory are highlighted with an "Inserted" indicator, while evicted pages are shown with a "Victim" tag — making every replacement decision immediately legible.

### 🎬 Step-by-Step Presentation Mode
A dedicated presentation workflow allows you to reveal one reference step at a time. Each new step animates into view while the viewport automatically scrolls to the latest frame, making it ideal for live lectures and walkthroughs.

### 📊 Live Comparative Analytics Dashboard
A real-time performance dashboard tracks accumulated page faults, hit count, and hit rate for all three algorithms simultaneously. Progress bars update dynamically as steps are revealed, clearly showing which algorithm is performing best at any given moment.

### ⚠️ Belady's Anomaly Demonstration
A dedicated mode compares FIFO performance with **3 frames vs. 4 frames** on a classic reference string. The counter-intuitive result — more frames yielding *more* faults — is presented clearly with highlighted diff cards.

### 🌗 Dark & Light Mode
Full theme support with a persistent preference, designed with HSL-calibrated color palettes for a premium visual experience in any environment.

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (Vercel)                │
│                                                 │
│   React 19 + Vite 6   ─────  Tailwind CSS v4   │
│   framer-motion animations   lucide-react icons │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / REST (Axios)
                       │ POST /simulate
┌──────────────────────▼──────────────────────────┐
│                  API (Render)                   │
│                                                 │
│   FastAPI  ──  Uvicorn  ──  Pydantic v2        │
│   CORS-aware   │ FIFO  │ LRU  │ Optimal        │
└──────────────────────────────────────────────────┘
                 Docker (Local Dev)
        docker-compose orchestrates both services
```

### Frontend (`/frontend`)
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/) for instant HMR and optimized production builds
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS custom properties for dynamic theming
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for fluid, spring-based micro-interactions
- **HTTP Client**: [Axios](https://axios-http.com/) with environment-variable-driven API base URL (`VITE_API_URL`)

### Backend (`/backend`)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) — async, OpenAPI-documented, production-grade
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) for strict request/response schema enforcement
- **Server**: [Uvicorn](https://www.uvicorn.org/) with configurable host and port via environment variables

### DevOps
- **Containerization**: Multi-stage Docker builds — Node 20 build stage + Nginx serve stage for the frontend; slim Python 3.9 image for the backend
- **Orchestration**: `docker-compose.yml` for single-command local deployment
- **Deployment**: Frontend → [Vercel](https://vercel.com/), Backend → [Render](https://render.com/)

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recommended)
- *Or* Node.js 20+ and Python 3.9+ for manual setup

---

### 🐳 Option A: Docker (Recommended)

The simplest way to run the full stack locally with a single command.

```bash
# 1. Clone the repository
git clone https://github.com/apuuuurv/memflow-visualizer.git
cd memflow-visualizer

# 2. Start both services
docker-compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:8000   |
| API Docs | http://localhost:8000/docs |

---

### ⚙️ Option B: Manual Local Setup

#### Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
# Navigate to the frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Create a local environment file
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Deployment

### Backend → Render
1. Create a new **Web Service** on [Render](https://dashboard.render.com/).
2. Connect your GitHub repository.
3. Set **Language** to `Docker` and **Dockerfile Path** to `backend/Dockerfile`.
4. Add the following environment variable:

| Key | Value |
|-----|-------|
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

### Frontend → Vercel
1. Import your GitHub repository on [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Add the following environment variable under **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` |

---

## Visual Reference

> **Memory Grid: Hits vs. Misses**

```
Step  │ T1    T2    T3    T4    T5    T6
──────┼─────────────────────────────────
Ref   │  7     0     1     2     0     3
──────┼─────────────────────────────────
F1    │ [7]   [7]   [7]  [2]✗  [2]   [2]
F2    │  -    [0]   [0]  [0]   [0]✓  [0]
F3    │  -     -    [1]  [1]   [1]   [3]✗
──────┼─────────────────────────────────
      │ Miss  Miss  Miss  Miss  Hit   Miss
```

*`✗` indicates a page fault (victim evicted). `✓` indicates a cache hit.*

---

## API Reference

### `POST /simulate`

Runs all three algorithms against the provided reference string and returns step-by-step execution data.

**Request Body:**
```json
{
  "pages": [7, 0, 1, 2, 0, 3, 0, 4],
  "capacity": 3
}
```

**Response:**
```json
{
  "fifo": {
    "faults": 6,
    "hits": 2,
    "hitRate": 25.0,
    "faultRate": 75.0,
    "steps": [...]
  },
  "lru": { ... },
  "optimal": { ... }
}
```

Full interactive API documentation is available at `/docs` (Swagger UI) when the backend is running.

---

## Academic Value

MemFlow Engine is designed to serve as a **benchmarking and teaching tool** for the following academic areas:

- **Operating Systems**: Virtual Memory Management, Page Replacement Policy Analysis
- **Computer Architecture**: Understanding the impact of locality of reference on cache/memory performance
- **Algorithm Analysis**: Empirical comparison of greedy (OPT) vs. practical (FIFO, LRU) strategies
- **Belady's Anomaly**: Live demonstration of a counter-intuitive result in computer science — adding more memory frames can increase page faults with FIFO

The step-by-step presentation mode is specifically designed for **classroom instruction**, allowing an instructor to pause, explain, and discuss each individual memory access decision with their audience.

---

## Project Structure

```
memflow-visualizer/
├── backend/
│   ├── algorithms.py       # FIFO, LRU, Optimal simulation logic
│   ├── main.py             # FastAPI app, CORS, endpoints
│   ├── schemas.py          # Pydantic request/response models
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container definition
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application component
│   │   ├── index.css       # Global styles & design tokens
│   │   └── main.jsx        # React entry point
│   ├── public/
│   │   └── favicon.png     # Application icon
│   ├── index.html          # HTML entry point, SEO meta
│   ├── .npmrc              # Peer dependency resolution
│   └── Dockerfile          # Multi-stage frontend container
│
└── docker-compose.yml      # Full-stack orchestration
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with precision by <a href="https://github.com/apuuuurv">apuuuurv</a></sub>
</div>
