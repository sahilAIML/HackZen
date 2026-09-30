from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class ATM:
    id: int
    atm_code: str
    original_atm_id: str
    name: str
    city: str
    address: str
    latitude: float
    longitude: float
    capacity: float
    current_cash: float
    predicted_demand: float = 0.0
    safety_buffer: float = 0.0
    required_cash: float = 0.0
    shortage: float = 0.0
    surplus: float = 0.0
    risk_percentage: float = 0.0
    criticality: str = "LOW"
    status: str = "NORMAL"  # NORMAL, LOW, HIGH, CRITICAL, FAILED, OFFLINE
    last_refill: Optional[str] = None
    stockout_minutes: Optional[int] = None
    explanation: Optional[str] = None

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_row(cls, row):
        return cls(
            id=row["id"],
            atm_code=row["atm_code"],
            original_atm_id=row["original_atm_id"],
            name=row["name"],
            city=row["city"],
            address=row["address"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            capacity=row["capacity"],
            current_cash=row["current_cash"],
            predicted_demand=row.get("predicted_demand", 0.0) or 0.0,
            safety_buffer=row.get("safety_buffer", 0.0) or 0.0,
            required_cash=row.get("required_cash", 0.0) or 0.0,
            shortage=row.get("shortage", 0.0) or 0.0,
            surplus=row.get("surplus", 0.0) or 0.0,
            risk_percentage=row.get("risk_percentage", 0.0) or 0.0,
            criticality=row.get("criticality", "LOW") or "LOW",
            status=row.get("status", "NORMAL") or "NORMAL",
            last_refill=row.get("last_refill", None),
            stockout_minutes=row.get("stockout_minutes", None),
            explanation=row.get("explanation", None)
        )
