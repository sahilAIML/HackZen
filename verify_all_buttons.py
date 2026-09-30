import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:5000'

def test_endpoint(name, path, method="GET", body=None):
    try:
        url = f"{BASE}{path}"
        data = json.dumps(body).encode('utf-8') if body else None
        headers = {"Content-Type": "application/json"} if body else {}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        res = urllib.request.urlopen(req)
        code = res.getcode()
        out = json.loads(res.read())
        print(f"  [PASS] {name} ({method} {path}) -> HTTP {code}")
        return True
    except Exception as e:
        print(f"  [FAIL] {name} ({method} {path}) -> {e}")
        return False

print("==========================================================")
print("     VERIFYING ALL BUTTON ENDPOINTS IN CASHROUTEAI        ")
print("==========================================================")

all_passed = True
tests = [
    # Navigation & Core
    ("Sync Network / refreshAll", "/api/dashboard", "GET", None),
    ("ATM Intelligence Table", "/api/atms?limit=10", "GET", None),
    ("ATM Detail Drawer (Inspect/Details)", "/api/atms/ATM-103", "GET", None),
    ("CIT Fleet View", "/api/vehicles", "GET", None),
    ("Operations Analytics View", "/api/analytics", "GET", None),
    ("Audit Log - All Events", "/api/audit?limit=20", "GET", None),
    ("Audit Log - Filter Routing", "/api/audit?type=ROUTE_OPTIMIZED", "GET", None),
    ("Audit Log - Filter Traffic", "/api/audit?type=TRAFFIC_EVENT", "GET", None),
    ("Audit Log - Filter Risk", "/api/audit?type=RISK_UPDATED", "GET", None),

    # Optimization Buttons
    ("Optimize Allocations Button", "/api/optimization/run", "POST", {"trigger": "MANUAL_DISPATCH"}),
    ("Optimize Route Alias (/api/optimize)", "/api/optimize", "POST", {"trigger": "MANUAL_DISPATCH"}),

    # Simulator Buttons
    ("Traffic Surge (+45% Congestion)", "/api/simulation/traffic-surge", "POST", {"delay_multiplier": 1.45}),
    ("ATM Cash Spike (ATM-103)", "/api/simulation/cash-spike", "POST", {"atm_code": "ATM-103", "spike_demand": 32000}),
    ("Cash Surge Alias (/api/simulation/cash-surge)", "/api/simulation/cash-surge", "POST", {"atm_code": "ATM-103", "spike_demand": 32000}),
    ("Road Closure (Konak-Alsancak)", "/api/simulation/road-closure", "POST", {"road_id": "IZMIR-KONAK-ARTERIAL"}),
    ("ATM Hardware Jam Failure (ATM-117)", "/api/simulation/atm-failure", "POST", {"atm_code": "ATM-117"}),
    ("Send Vehicle to Maintenance (VAN-01)", "/api/simulation/vehicle-unavailable", "POST", {"vehicle_code": "VAN-01"}),
    ("Mark Vehicle Available (VAN-01)", "/api/simulation/vehicle-available", "POST", {"vehicle_code": "VAN-01"}),
    ("Reset Baseline Environment", "/api/simulation/reset", "POST", {}),

    # Cash Allocation Actions
    ("Approve Cash Allocation (Table/Drawer)", "/api/cash/allocate", "POST", {"atm_code": "ATM-103"}),

    # Authentication Buttons
    ("Admin Dispatcher Login Form", "/api/auth/login", "POST", {"username": "admin", "password": "admin123"}),
    ("Driver 1 Quick Login Chip", "/api/auth/login", "POST", {"username": "driver1", "password": "driver123"}),
    ("Driver 2 Quick Login Chip", "/api/auth/login", "POST", {"username": "driver2", "password": "driver123"}),

    # Driver Portal Actions
    ("Confirm Cash Delivered Button", "/api/driver/complete-stop", "POST", {"atm_code": "ATM-103", "cash_amount": 25000, "vehicle_code": "VAN-01"}),
]

for name, path, method, body in tests:
    ok = test_endpoint(name, path, method, body)
    if not ok:
        all_passed = False

print("\n==========================================================")
if all_passed:
    print("  RESULT: ALL 23 BUTTON ENDPOINTS PASSED WITH 100% SUCCESS! ")
else:
    print("  RESULT: SOME BUTTON ENDPOINTS FAILED.")
print("==========================================================")
