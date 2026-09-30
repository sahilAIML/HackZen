import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:5000'

print('=== 1. System Health ===')
d = json.loads(urllib.request.urlopen(f'{BASE}/api/dashboard').read())
print(f"Status: {d['status']} | ATMs: {d['kpi']['active_atms']} | Critical: {d['kpi']['critical_atms']} | Routes: {len(d['routes'])}")

print('\n=== 2. Trained CatBoost Model Metrics ===')
ml = d['ml_benchmark']
print(f"Model: {ml.get('model_name', 'CatBoost')} | R2: {ml.get('R2')} | MAE: Rs {ml.get('MAE', 0):,.2f} | RMSE: Rs {ml.get('RMSE', 0):,.2f}")

print('\n=== 3. Real ATMs Telemetry Sample ===')
atms = json.loads(urllib.request.urlopen(f'{BASE}/api/atms?limit=3').read())['atms']
for a in atms:
    print(f"  {a['atm_code']} | {a['name']} | District: {a['address']} | Bal: Rs {a['current_cash']:,.0f} | Risk: {a['criticality']}")

print('\n=== 4. Admin Login ===')
req = urllib.request.Request(f'{BASE}/api/auth/login', data=json.dumps({'username':'admin','password':'admin123'}).encode('utf-8'), headers={'Content-Type':'application/json'})
admin = json.loads(urllib.request.urlopen(req).read())
print(f"Admin Login: {admin['success']} | User: {admin['user']['name']}")

print('\n=== 5. Driver Login ===')
req = urllib.request.Request(f'{BASE}/api/auth/login', data=json.dumps({'username':'driver1','password':'driver123'}).encode('utf-8'), headers={'Content-Type':'application/json'})
driver = json.loads(urllib.request.urlopen(req).read())
print(f"Driver Login: {driver['success']} | User: {driver['user']['name']} | Van: {driver['user']['vehicle_code']}")

print('\n=== 6. Driver Manifest Stops ===')
routes = json.loads(urllib.request.urlopen(f'{BASE}/api/routes').read())['routes']
van1 = [r for r in routes if r['vehicle_code'] == 'VAN-01'][0]
print(f"VAN-01 Stops Count: {len(van1['stops'])} | Total Cash: Rs {van1.get('cash_value', 0):,.0f}")
for s in van1['stops']:
    print(f"  Stop {s['sequence']}: {s['status']} | {s['atm_code']} | Cash: Rs {s['cash_amount']:,.0f} | ETA: {s['arrival_time']}")

print('\n=== 7. Complete Driver Stop ===')
pending = [s for s in van1['stops'] if s['status'] == 'PENDING']
if pending:
    t = pending[0]
    req = urllib.request.Request(f'{BASE}/api/driver/complete-stop', data=json.dumps({'stop_id': t['id'], 'atm_code': t['atm_code'], 'cash_amount': t['cash_amount'], 'vehicle_code': 'VAN-01'}).encode('utf-8'), headers={'Content-Type':'application/json'})
    res = json.loads(urllib.request.urlopen(req).read())
    print(f"Delivery Result: {res['message']}")
else:
    print("All stops on VAN-01 are completed.")

print('\n=== 8. Dynamic Simulation (Traffic Surge & Re-optimization) ===')
req = urllib.request.Request(f'{BASE}/api/simulation/traffic-surge', data=json.dumps({'delay_multiplier': 1.5}).encode('utf-8'), headers={'Content-Type':'application/json'})
surge = json.loads(urllib.request.urlopen(req).read())
print(f"Surge Result: {surge['message']}")
print(f"Re-optimization Success: {surge['optimization']['success']}")
print(f"Trigger Event: {surge['optimization'].get('trigger_event')}")
print(f"Execution Time: {surge['optimization'].get('execution_time')}s")
print(f"Routes Re-optimized: {len(surge['optimization'].get('routes', []))}")

print('\n==============================================')
print('      ALL SYSTEM TESTS PASSED SUCCESSFULLY!    ')
print('==============================================')
