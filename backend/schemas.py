from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    pages: List[int] = Field(..., min_length=1)
    capacity: int = Field(..., ge=1, le=10)


class SimulationStep(BaseModel):
    page: int
    memory: List[Optional[int]]
    status: Literal["Hit", "Miss"]
    insertedIndex: Optional[int] = None
    replacedPage: Optional[int] = None
    evictedIndex: Optional[int] = None
    beforeMemory: Optional[List[Optional[int]]] = None
    explanation: Optional[str] = None


class AlgorithmResult(BaseModel):
    steps: List[SimulationStep]
    faults: int
    hits: int
    hitRate: float
    faultRate: float


class SimulationResponse(BaseModel):
    fifo: AlgorithmResult
    lru: AlgorithmResult
    optimal: AlgorithmResult
