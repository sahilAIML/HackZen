from dataclasses import dataclass, asdict, field
from typing import List, Optional

@dataclass
class RouteStop:
    id: Optional[int]
    route_id: int
    atm_id: int
    atm_code: str
    atm_name: str
    latitude: float
    longitude: float
    sequence: int
    cash_amount: float
    arrival_time: str
    estimated_minutes: float
    status: str = "PENDING"  # PENDING, ARRIVED, COMPLETED, SKIPPED

    def to_dict(self):
        return asdict(self)

@dataclass
class Route:
    id: int
    route_code: str
    vehicle_id: int
    vehicle_code: str
    created_at: str
    distance: float
    estimated_time: float
    fuel_cost: float
    cash_value: float
    status: str = "ACTIVE"  # ACTIVE, COMPLETED, PENDING, BLOCKED
    dispatch_allowed: bool = True
    constraint_status: str = "SAFE TO DISPATCH"
    blocking_reasons: List[str] = field(default_factory=list)
    stops: List[RouteStop] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)
