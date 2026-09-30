import sys
import os
import json
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:5000"

def get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}")
    with urllib.request.urlopen(req, timeout=10) as resp:
        content_type = resp.headers.get("Content-Type", "")
        body = resp.read()
        if "application/json" in content_type:
            return resp.status, json.loads(body.decode("utf-8"))
        return resp.status, body.decode("utf-8")

def post(path, data):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}{path}", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        content_type = resp.headers.get("Content-Type", "")
        body = resp.read()
        if "application/json" in content_type:
            return resp.status, json.loads(body.decode("utf-8"))
        return resp.status, body.decode("utf-8")

def run_tests():
    print("=" * 65)
    print("  CASHROUTEAI FULL-STACK COMPREHENSIVE VERIFICATION SUITE  ")
    print("=" * 65)
    
    passed = 0
    total = 0
    
    def check(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name} {details}")
        else:
            print(f"  [FAIL] {name} {details}")
            sys.exit(1)

    # 1. HTML Landing Page & Static Assets
    status, html = get("/")
    check("GET / (Landing Page)", status == 200)
    check("Page Title", "CashRouteAI - Intraday Cash Intelligence & Dynamic Route Optimization" in html)
    check("Google Maps Script Tag", "maps.googleapis.com/maps/api/js" in html)
    check("Map Layer Selector", "id=\"mapLayerSelector\"" in html)
    check("CatBoost Model Badge", "CatBoost Demand Model" in html and "R² 0.7593" in html)
    check("AI Copilot Navigation Tab", "id=\"navCopilot\"" in html)
    check("Driver Portal Elements", "id=\"driverStopsChecklist\"" in html and "id=\"driverRemainingCash\"" in html)
    check("Re-optimize Button", "id=\"btnReoptimize\"" in html or "⚡ Optimize Allocations" in html)

    # 2. Check Static Files
    for asset in ["/css/style.css", "/js/dashboard.js", "/js/map.js", "/js/atms.js", 
                  "/js/vehicles.js", "/js/routes.js", "/js/charts.js", "/js/simulation.js"]:
        s, content = get(asset)
        check(f"Static Asset: {asset}", s == 200 and len(content) > 500, f"({len(content)} bytes)")

    # 3. /api/config
    status, cfg = get("/api/config")
    check("API Config Endpoint", status == 200 and cfg.get("configured") is True)
    check("Google Maps API Key Present", bool(cfg.get("google_maps_api_key")))
    check("Depot Coordinates", cfg.get("depot", {}).get("lat") == 38.4237)

    # 4. /api/dashboard Overview
    status, dash = get("/api/dashboard")
    check("Dashboard Overview", status == 200)
    check("KPI Active ATMs", dash["kpi"]["active_atms"] == 359)
    check("Critical Queue Populated", len(dash.get("critical_queue", [])) > 0)
    check("Active Routes Populated", len(dash.get("routes", [])) > 0)
    check("ML Benchmark In Dashboard", dash.get("ml_benchmark", {}).get("R2") == 0.7593)
    check("ML Benchmark MAE", dash.get("ml_benchmark", {}).get("MAE") == 789.60)

    # 5. /api/atms & /api/atms/<id>
    status, atms_resp = get("/api/atms?limit=360")
    atms_list = atms_resp.get("atms", []) if isinstance(atms_resp, dict) else atms_resp
    check("ATMs Count (Real Dataset)", status == 200 and len(atms_list) >= 359, f"({len(atms_list)} ATMs)")
    status, atm_detail = get("/api/atms/ATM-103")
    atm = atm_detail.get("atm", atm_detail) if isinstance(atm_detail, dict) else atm_detail
    check("ATM-103 Detail", status == 200 and atm.get("atm_code") == "ATM-103")
    check("ATM-103 Predicted Demand", atm.get("predicted_demand", 0) > 0)

    # 6. /api/vehicles
    status, vehicles_resp = get("/api/vehicles")
    veh_list = vehicles_resp.get("vehicles", []) if isinstance(vehicles_resp, dict) else vehicles_resp
    check("Vehicles Count", status == 200 and len(veh_list) == 10)

    # 7. /api/analytics
    status, analytics = get("/api/analytics")
    check("Analytics Endpoint", status == 200 and "risk_distribution" in analytics and "hourly_demand" in analytics)

    # 8. /api/audit
    status, audit_resp = get("/api/audit?limit=10")
    audit_list = audit_resp.get("logs", []) if isinstance(audit_resp, dict) else audit_resp
    check("Audit Log Endpoint", status == 200 and len(audit_list) > 0)

    # 9. AI Dispatch Copilot
    status, copilot_res = post("/api/ai/copilot", {"message": "Audit cash shortage in Konak and Balçova"})
    check("AI Copilot Query", status == 200 and copilot_res.get("success") is True)
    check("AI Copilot Message Content", len(copilot_res.get("reply", "")) > 100)

    # 10. Route Optimization
    status, opt_res = post("/api/optimization/run", {"algorithm": "CVRP_TIME_WINDOWS", "safety_buffer": 30.0})
    check("Optimization Trigger", status == 200 and opt_res.get("success") is True)
    check("Routes Generated", len(opt_res.get("routes", [])) > 0)

    # 11. Interactive Simulations
    status, sim_traffic = post("/api/simulation/traffic-surge", {"factor": 1.5})
    check("Simulation: Traffic Surge", status == 200 and sim_traffic.get("success") is True)
    
    status, sim_spike = post("/api/simulation/cash-spike", {"atm_id": "ATM-103", "multiplier": 2.5})
    check("Simulation: Cash Spike", status == 200 and sim_spike.get("success") is True)

    status, sim_reset = post("/api/simulation/reset", {})
    check("Simulation: Reset Baseline", status == 200 and sim_reset.get("success") is True)

    # 12. Cash Allocation Approval
    status, alloc_res = post("/api/cash/allocate", {"allocations": [{"atm_id": "ATM-103", "amount": 25000}]})
    check("Cash Allocation Approval", status == 200 and alloc_res.get("success") is True)

    # 13. Authentication & Driver Workflow
    status, auth_admin = post("/api/auth/login", {"username": "admin", "password": "admin123"})
    check("Admin Auth", status == 200 and auth_admin.get("user", {}).get("role") == "admin")

    status, auth_driver = post("/api/auth/login", {"username": "driver1", "password": "driver123"})
    check("Driver Auth", status == 200 and auth_driver.get("user", {}).get("role") == "driver")
    check("Driver Van Assigned", auth_driver.get("user", {}).get("vehicle_code") == "VAN-01")

    # Complete Driver Stop
    status, stop_res = post("/api/driver/complete-stop", {
        "vehicle_id": "VAN-01",
        "atm_id": "ATM-237",
        "delivered_amount": 2000
    })
    check("Driver Complete Stop", status == 200 and stop_res.get("success") is True)

    print("=" * 65)
    print(f"  ALL {passed}/{total} END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!  ")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
