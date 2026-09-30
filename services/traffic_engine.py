import os
import sys
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.db_manager import get_connection
from services.audit_service import AuditService

class TrafficEngine:
    @staticmethod
    def get_active_events():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM traffic_events WHERE status = 'ACTIVE' ORDER BY id DESC")
        events = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return events

    @staticmethod
    def clear_events():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE traffic_events SET status = 'RESOLVED'")
        conn.commit()
        conn.close()

    @staticmethod
    def trigger_traffic_surge(severity="HIGH", delay_multiplier=1.45, description="Traffic surge detected on Collectorate - Brodipet corridor (+45% congestion)"):
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO traffic_events (event_type, road_id, severity, delay_multiplier, start_time, status, description, affected_route_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("TRAFFIC_SURGE", "CORRIDOR-GT-ROAD", severity, delay_multiplier, now_str, "ACTIVE", description, 1))
        event_id = cursor.lastrowid
        conn.commit()
        conn.close()

        AuditService.log_event(
            event_type="TRAFFIC_EVENT",
            description=description,
            old_value="Normal Traffic (1.0x)",
            new_value=f"Congestion ({delay_multiplier:.2f}x delay)",
            decision_reason="Intraday traffic telemetry flagged severe arterial slowdown. Re-evaluating ETAs."
        )
        return {"event_id": event_id, "type": "TRAFFIC_SURGE", "delay_multiplier": delay_multiplier, "description": description}

    @staticmethod
    def trigger_road_closure(road_id="BRIDGE-KRISHNA-01", description="Emergency maintenance closure on Main Canal Bridge (Road Segment Closed)"):
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO traffic_events (event_type, road_id, severity, delay_multiplier, start_time, status, description, affected_route_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("ROAD_CLOSURE", road_id, "CRITICAL", 99.0, now_str, "ACTIVE", description, 1))
        event_id = cursor.lastrowid
        conn.commit()
        conn.close()

        AuditService.log_event(
            event_type="ROAD_CLOSURE",
            description=description,
            old_value="Open Corridor",
            new_value="Road Blocked",
            decision_reason="Municipal bridge closure detected. Hard constraint violated; rerouting required."
        )
        return {"event_id": event_id, "type": "ROAD_CLOSURE", "road_id": road_id, "description": description}

    @staticmethod
    def trigger_cash_spike(atm_code="ATM-103", spike_amount=32000.0):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM atms WHERE atm_code = ?", (atm_code,))
        atm = cursor.fetchone()
        
        if atm:
            atm_id = atm["id"]
            old_demand = atm["predicted_demand"]
            old_risk = atm["criticality"]
            new_cash = max(5000.0, float(atm["current_cash"]) - 10000.0) # rapid withdrawals depleted cash to ₹18,500
            
            cursor.execute("""
                UPDATE atms
                SET current_cash = ?, predicted_demand = ?, criticality = 'CRITICAL', status = 'CRITICAL'
                WHERE id = ?
            """, (18500.0, spike_amount, atm_id))
            conn.commit()

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO traffic_events (event_type, road_id, severity, delay_multiplier, start_time, status, description, affected_route_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, ("CASH_SPIKE", f"ATM-{atm_code}", "CRITICAL", 1.0, now_str, "ACTIVE",
                  f"Intraday withdrawal spike at {atm_code}. Demand jumped to ₹{spike_amount:,.0f}.", 1))
            conn.commit()

            AuditService.log_event(
                event_type="RISK_UPDATED",
                description=f"Withdrawal surge at {atm_code} ({atm['name']}). Balance depleted to ₹18,500.",
                old_value=f"Demand ₹{old_demand:,.0f} ({old_risk})",
                new_value=f"Demand ₹{spike_amount:,.0f} (CRITICAL)",
                decision_reason="Predicted withdrawal rate exceeds cash in cassette. Immediate cash replenishment triggered."
            )
        conn.close()
        return {"atm_code": atm_code, "spike_amount": spike_amount, "new_risk": "CRITICAL"}

    @staticmethod
    def trigger_atm_failure(atm_code="ATM-117"):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM atms WHERE atm_code = ?", (atm_code,))
        atm = cursor.fetchone()
        if atm:
            cursor.execute("UPDATE atms SET status = 'FAILED', criticality = 'FAILED' WHERE id = ?", (atm["id"],))
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO traffic_events (event_type, road_id, severity, delay_multiplier, start_time, status, description, affected_route_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, ("ATM_FAILURE", f"ATM-{atm_code}", "HIGH", 1.0, now_str, "ACTIVE",
                  f"Dispenser hardware fault reported at {atm_code} ({atm['name']}). ATM offline.", 1))
            conn.commit()

            AuditService.log_event(
                event_type="ATM_FAILURE",
                description=f"Hardware failure at {atm_code}: Cash dispenser jammed. Offline.",
                old_value="Operational",
                new_value="FAILED",
                decision_reason="ATM cannot dispense cash. Dropped from delivery route to prevent idle cash trap."
            )
        conn.close()
        return {"atm_code": atm_code, "status": "FAILED"}

    @staticmethod
    def trigger_vehicle_unavailable(vehicle_code="VAN-01"):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vehicles WHERE vehicle_code = ?", (vehicle_code,))
        veh = cursor.fetchone()
        if veh:
            old_status = veh["status"]
            cursor.execute("UPDATE vehicles SET status = 'MAINTENANCE' WHERE id = ?", (veh["id"],))
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO traffic_events (event_type, road_id, severity, delay_multiplier, start_time, status, description, affected_route_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, ("VEHICLE_UNAVAILABLE", vehicle_code, "HIGH", 1.0, now_str, "ACTIVE",
                  f"CIT Armored Vehicle {vehicle_code} flagged for brake maintenance. Taken off duty.", 1))
            conn.commit()

            AuditService.log_event(
                event_type="VEHICLE_ASSIGNED",
                description=f"CIT Vehicle {vehicle_code} entered emergency maintenance.",
                old_value=old_status,
                new_value="MAINTENANCE",
                decision_reason="Vehicle safety fault. Hard constraint: Maintenance vehicle blocked from dispatch. Reassigning stops."
            )
        conn.close()
        return {"vehicle_code": vehicle_code, "status": "MAINTENANCE"}
