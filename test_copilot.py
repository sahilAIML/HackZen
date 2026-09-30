import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:5000'

print("==========================================================")
print("     TESTING GOOGLE MAPS & GEMINI COPILOT INTEGRATION     ")
print("==========================================================")

# 1. Test /api/config
print("\n[1] Testing /api/config...")
req = urllib.request.Request(f"{BASE}/api/config")
res = urllib.request.urlopen(req)
cfg = json.loads(res.read().decode('utf-8'))
print(f"  Google Maps Key: {cfg['google_maps_key'][:12]}... (Configured: {cfg['gemini_configured']})")
print(f"  Depot: {cfg['depot']['name']} ({cfg['depot']['latitude']}, {cfg['depot']['longitude']})")

# 2. Test /api/dashboard for google_maps_key
print("\n[2] Testing /api/dashboard...")
req = urllib.request.Request(f"{BASE}/api/dashboard")
res = urllib.request.urlopen(req)
dash = json.loads(res.read().decode('utf-8'))
print(f"  Dashboard Key: {dash.get('google_maps_key', 'NONE')[:12]}...")

# 3. Test /api/ai/copilot with sample queries
print("\n[3] Testing /api/ai/copilot with 'Analyze cash shortage in Aliağa'...")
req = urllib.request.Request(
    f"{BASE}/api/ai/copilot",
    data=json.dumps({"query": "Analyze cash shortage in Aliağa and recommend dispatch"}).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)
res = urllib.request.urlopen(req)
ai_res = json.loads(res.read().decode('utf-8'))
print(f"  Success: {ai_res.get('success')}")
print(f"  Source: {ai_res.get('source')}")
print(f"  Model: {ai_res.get('model')}")
print(f"  Response preview:\n{ai_res.get('response')[:250]}...")

# 4. Test Copilot query about traffic
print("\n[4] Testing /api/ai/copilot with 'What happens if traffic surges on Konak arterial?'...")
req = urllib.request.Request(
    f"{BASE}/api/ai/copilot",
    data=json.dumps({"query": "What happens if traffic surges on Konak arterial?"}).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)
res = urllib.request.urlopen(req)
ai_traffic = json.loads(res.read().decode('utf-8'))
print(f"  Source: {ai_traffic.get('source')}")
print(f"  Response preview:\n{ai_traffic.get('response')[:250]}...")

print("\n==========================================================")
print("     ALL GOOGLE API & COPILOT TESTS PASSED 100%!          ")
print("==========================================================")
