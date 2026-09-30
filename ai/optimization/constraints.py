import os
import sys
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config.config import TRANSIT_WINDOW

class ConstraintValidator:
    @staticmethod
    def validate_route(route, vehicle, stops, atms_dict, active_traffic_events=None):
        violations = []
        checks = {
            "vehicle_capacity": {"passed": True, "details": ""},
            "insurance_limit": {"passed": True, "details": ""},
            "atm_capacity": {"passed": True, "details": ""},
            "vehicle_availability": {"passed": True, "details": ""},
            "transit_window": {"passed": True, "details": ""},
            "road_availability": {"passed": True, "details": ""}
        }

        # 1. Vehicle operational status and availability
        v_status = vehicle.get("status", "AVAILABLE")
        if v_status in ["MAINTENANCE", "UNAVAILABLE", "FAILED"]:
            msg = f"Vehicle {vehicle.get('vehicle_code')} is currently in {v_status} state. Dispatch prohibited."
            violations.append(msg)
            checks["vehicle_availability"] = {"passed": False, "details": msg}
        else:
            checks["vehicle_availability"] = {
                "passed": True,
                "details": f"Vehicle status is {v_status} (Operational)"
            }

        # 2. Vehicle cash capacity constraint
        total_cash = sum(float(s.get("cash_amount", 0.0)) for s in stops)
        capacity = float(vehicle.get("cash_capacity", 0.0))
        if total_cash > capacity:
            msg = f"Cash payload ₹{total_cash:,.0f} exceeds vehicle capacity limit ₹{capacity:,.0f}."
            violations.append(msg)
            checks["vehicle_capacity"] = {"passed": False, "details": msg}
        else:
            checks["vehicle_capacity"] = {
                "passed": True,
                "details": f"Payload ₹{total_cash:,.0f} within capacity ₹{capacity:,.0f}"
            }

        # 3. Vehicle insurance limit constraint
        insurance_limit = float(vehicle.get("insurance_limit", 0.0))
        if total_cash > insurance_limit:
            msg = f"Cash payload ₹{total_cash:,.0f} breaches CIT transit insurance coverage of ₹{insurance_limit:,.0f}."
            violations.append(msg)
            checks["insurance_limit"] = {"passed": False, "details": msg}
        else:
            checks["insurance_limit"] = {
                "passed": True,
                "details": f"Payload ₹{total_cash:,.0f} insured under limit ₹{insurance_limit:,.0f}"
            }

        # 4. ATM capacity constraint for all stops
        atm_overflows = []
        for stop in stops:
            atm_id = stop.get("atm_id")
            atm = atms_dict.get(atm_id) or atms_dict.get(str(atm_id))
            if atm:
                current_cash = float(atm.get("current_cash", 0.0))
                atm_cap = float(atm.get("capacity", 100000.0))
                refill = float(stop.get("cash_amount", 0.0))
                if current_cash + refill > atm_cap + 1.0: # 1 rupee tolerance
                    atm_overflows.append(f"{atm.get('atm_code')}: total ₹{current_cash+refill:,.0f} > cap ₹{atm_cap:,.0f}")
        
        if atm_overflows:
            msg = f"Refill causes cassette overflow at: {', '.join(atm_overflows)}."
            violations.append(msg)
            checks["atm_capacity"] = {"passed": False, "details": msg}
        else:
            checks["atm_capacity"] = {
                "passed": True,
                "details": f"All {len(stops)} stops respect cassette capacity"
            }

        # 5. Municipal transit window
        now = datetime.now()
        current_hour = now.hour
        if current_hour < TRANSIT_WINDOW["start_hour"] or current_hour >= TRANSIT_WINDOW["end_hour"]:
            msg = f"Current hour {current_hour}:00 is outside permitted municipal CIT transit window ({TRANSIT_WINDOW['start_hour']}:00 - {TRANSIT_WINDOW['end_hour']}:00)."
            violations.append(msg)
            checks["transit_window"] = {"passed": False, "details": msg}
        else:
            checks["transit_window"] = {
                "passed": True,
                "details": f"Active in permitted window ({TRANSIT_WINDOW['start_hour']}:00 - {TRANSIT_WINDOW['end_hour']}:00)"
            }

        # 6. Road closures
        active_traffic_events = active_traffic_events or []
        closed_roads = [e for e in active_traffic_events if e.get("event_type") == "ROAD_CLOSURE" and e.get("status") == "ACTIVE"]
        
        route_blocked = False
        blocked_reasons = []
        for event in closed_roads:
            if event.get("affected_route_id") == route.get("id"):
                route_blocked = True
                blocked_reasons.append(event.get("description", "Road closure detected on planned route segment."))

        if route_blocked:
            msg = f"Route intersects blocked corridor: {'; '.join(blocked_reasons)}."
            violations.append(msg)
            checks["road_availability"] = {"passed": False, "details": msg}
        else:
            checks["road_availability"] = {
                "passed": True,
                "details": "All corridors clear and open"
            }

        is_allowed = len(violations) == 0
        status_label = "SAFE TO DISPATCH" if is_allowed else "DISPATCH BLOCKED"

        return {
            "allowed": is_allowed,
            "status": status_label,
            "violations": violations,
            "checks": checks
        }
