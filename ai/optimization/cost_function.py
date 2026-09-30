import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config.config import OPTIMIZATION_CONFIG

class CostFunction:
    def __init__(self, weights=None):
        self.weights = weights or OPTIMIZATION_CONFIG.get("weights", {
            "stockout_risk": 100.0,
            "distance": 1.5,
            "idle_cash": 0.05,
            "delay": 2.0,
            "route_risk": 50.0
        })

    def calculate_cost(self, distance_km, travel_time_mins, cash_delivered, unserved_risk, delay_mins=0.0):
        # Alpha: stockout risk
        c_risk = self.weights["stockout_risk"] * unserved_risk
        # Beta: distance cost
        c_dist = self.weights["distance"] * distance_km
        # Gamma: idle capital cost (carrying excess cash)
        c_idle = self.weights["idle_cash"] * max(0.0, cash_delivered * 0.01)
        # Delta: delay penalty
        c_delay = self.weights["delay"] * delay_mins
        # Epsilon: route risk (safety on route)
        c_route = self.weights["route_risk"] * (distance_km * 0.1)

        total_cost = c_risk + c_dist + c_idle + c_delay + c_route
        return {
            "total_cost": round(total_cost, 2),
            "stockout_risk_cost": round(c_risk, 2),
            "distance_cost": round(c_dist, 2),
            "idle_capital_cost": round(c_idle, 2),
            "delay_cost": round(c_delay, 2),
            "route_risk_cost": round(c_route, 2)
        }
