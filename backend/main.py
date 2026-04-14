import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import algorithms
from schemas import AlgorithmResult, SimulationRequest, SimulationResponse

app = FastAPI()

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

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
    fifo_steps, fifo_faults = algorithms.fifo_simulation(request.pages, request.capacity)
    lru_steps, lru_faults = algorithms.lru_simulation(request.pages, request.capacity)
    optimal_steps, optimal_faults = algorithms.optimal_simulation(request.pages, request.capacity)

    total_pages = len(request.pages)

    return SimulationResponse(
        fifo=_build_result(fifo_steps, fifo_faults, total_pages),
        lru=_build_result(lru_steps, lru_faults, total_pages),
        optimal=_build_result(optimal_steps, optimal_faults, total_pages)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
