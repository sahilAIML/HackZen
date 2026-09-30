import os
import sys
import math

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

class CashAllocationEngine:
    def __init__(self, bundle_size=1000):
        self.bundle_size = bundle_size

    def calculate_allocation(self, atm, available_vehicle_cash=None, vehicle_insurance_limit=None):
        shortage = float(atm.get("shortage", 0.0))
        current_cash = float(atm.get("current_cash", 0.0))
        capacity = float(atm.get("capacity", 100000.0))
        criticality = atm.get("criticality", "LOW")

        if shortage <= 0:
            return {
                "atm_id": atm.get("id"),
                "atm_code": atm.get("atm_code"),
                "recommended_refill": 0.0,
                "status": "NO_REFILL_NEEDED",
                "allocation_reason": "ATM has adequate cash reserves to cover forecast demand + safety buffer."
            }

        # Available capacity in the ATM cassette
        atm_headroom = max(0.0, capacity - current_cash)

        # Baseline refill needed to eliminate shortage
        # Round up to nearest bundle size if feasible
        desired_refill = math.ceil(shortage / self.bundle_size) * self.bundle_size

        # Cap by physical ATM headroom
        refill = min(desired_refill, atm_headroom)

        # If vehicle constraints provided
        if available_vehicle_cash is not None:
            refill = min(refill, available_vehicle_cash)

        if vehicle_insurance_limit is not None:
            refill = min(refill, vehicle_insurance_limit)

        refill = round(refill, 2)

        reason = (
            f"Recommended ₹{refill:,.0f} cash injection: Satisfies projected shortfall of ₹{shortage:,.0f} "
            f"while maintaining cassette physical capacity ceiling (Headroom: ₹{atm_headroom:,.0f}). "
            f"Priority: {criticality}."
        )

        return {
            "atm_id": atm.get("id"),
            "atm_code": atm.get("atm_code"),
            "shortage": shortage,
            "current_cash": current_cash,
            "capacity": capacity,
            "recommended_refill": refill,
            "status": "ALLOCATED" if refill > 0 else "CONSTRAINED",
            "allocation_reason": reason
        }

    def allocate_fleet_cash(self, atms, vehicles):
        # Sort ATMs: CRITICAL first, then HIGH, then MEDIUM, then descending shortage
        priority_map = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
        sorted_atms = sorted(
            atms,
            key=lambda a: (priority_map.get(a.get("criticality", "LOW"), 0), a.get("shortage", 0.0)),
            reverse=True
        )

        # Available vehicles (only AVAILABLE status)
        active_vehicles = [v for v in vehicles if v.get("status") == "AVAILABLE"]
        
        allocations = []
        for atm in sorted_atms:
            alloc = self.calculate_allocation(atm)
            allocations.append(alloc)

        return allocations
