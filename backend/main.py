from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import algorithms
from schemas import AlgorithmResult, SimulationRequest, SimulationResponse

app = FastAPI()

# Enable CORS so React can talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        faultRate=fault_rate,
    )


@app.get("/")
async def healthcheck():
    return {"message": "MemFlow Pro API is running"}


@app.post("/simulate", response_model=SimulationResponse)
async def simulate(data: SimulationRequest):
    total_pages = len(data.pages)
    fifo_steps, fifo_faults = algorithms.get_fifo_steps(data.pages, data.capacity)
    lru_steps, lru_faults = algorithms.get_lru_steps(data.pages, data.capacity)
    opt_steps, opt_faults = algorithms.get_optimal_steps(data.pages, data.capacity)

    return SimulationResponse(
        fifo=_build_result(fifo_steps, fifo_faults, total_pages),
        lru=_build_result(lru_steps, lru_faults, total_pages),
        optimal=_build_result(opt_steps, opt_faults, total_pages),
    )
