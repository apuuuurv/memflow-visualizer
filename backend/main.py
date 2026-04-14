import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import algorithms
from schemas import AlgorithmResult, SimulationRequest, SimulationResponse

app = FastAPI()

# Configure CORS
# We read origins from ENV. If not set, we default to "*" for flexibility.
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _build_result(steps, faults, total_pages):
    hit_rate, fault_rate = algorithms.calculate_metrics(faults, total_pages)
    return AlgorithmResult(
        steps=steps,
        faults=faults,
        hits=total_pages - faults,
        hitRate=hit_rate,
        faultRate=fault_rate
    )

@app.post("/simulate", response_model=SimulationResponse)
async def simulate(request: SimulationRequest):
    # Use the correct function names from algorithms.py
    fifo_steps, fifo_faults = algorithms.get_fifo_steps(request.pages, request.capacity)
    lru_steps, lru_faults = algorithms.get_lru_steps(request.pages, request.capacity)
    optimal_steps, optimal_faults = algorithms.get_optimal_steps(request.pages, request.capacity)

    total_pages = len(request.pages)

    return SimulationResponse(
        fifo=_build_result(fifo_steps, fifo_faults, total_pages),
        lru=_build_result(lru_steps, lru_faults, total_pages),
        optimal=_build_result(optimal_steps, optimal_faults, total_pages)
    )

if __name__ == "__main__":
    import uvicorn
    # Make sure to listen on 0.0.0.0 for Docker/Render
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
