from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class Vehicle:
    id: int
    vehicle_code: str
    driver_name: str
    latitude: float
    longitude: float
    cash_capacity: float
    current_cash: float
    insurance_limit: float
    status: str = "AVAILABLE"  # AVAILABLE, EN_ROUTE, LOADING, MAINTENANCE, UNAVAILABLE
    current_route_id: Optional[int] = None
    assigned_stops: int = 0
    allocated_cash: float = 0.0

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_row(cls, row):
        return cls(
            id=row["id"],
            vehicle_code=row["vehicle_code"],
            driver_name=row.get("driver_name", "CIT Operative"),
            latitude=row["latitude"],
            longitude=row["longitude"],
            cash_capacity=row["cash_capacity"],
            current_cash=row["current_cash"],
            insurance_limit=row["insurance_limit"],
            status=row.get("status", "AVAILABLE") or "AVAILABLE",
            current_route_id=row.get("current_route_id"),
            assigned_stops=row.get("assigned_stops", 0) or 0,
            allocated_cash=row.get("allocated_cash", 0.0) or 0.0
        )
