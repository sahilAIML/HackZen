import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config.config import DEFAULT_SAFETY_BUFFER_PERCENTAGE, RISK_THRESHOLDS

class RiskEngine:
    def __init__(self, safety_percentage=DEFAULT_SAFETY_BUFFER_PERCENTAGE, thresholds=None):
        self.safety_percentage = float(safety_percentage)
        self.thresholds = thresholds or RISK_THRESHOLDS

    def calculate_risk(self, current_cash, predicted_demand, safety_percentage=None):
        safety_pct = float(safety_percentage if safety_percentage is not None else self.safety_percentage)
        current_cash = max(0.0, float(current_cash))
        predicted_demand = max(0.0, float(predicted_demand))

        # 1. Safety buffer
        safety_buffer = predicted_demand * (safety_pct / 100.0)

        # 2. Total required cash
        required_cash = predicted_demand + safety_buffer

        # 3. Shortage & Surplus
        shortage = max(0.0, required_cash - current_cash)
        surplus = max(0.0, current_cash - required_cash)

        # 4. Risk percentage
        if required_cash > 0:
            risk_percentage = (shortage / required_cash) * 100.0
        else:
            risk_percentage = 0.0

        # 5. Risk classification
        if risk_percentage >= self.thresholds.get("HIGH", 50.0):
            risk_level = "CRITICAL"
        elif risk_percentage >= self.thresholds.get("MEDIUM", 25.0):
            risk_level = "HIGH"
        elif shortage > 0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # 6. Estimated stockout time (based on 2-hour / 120-minute horizon)
        if predicted_demand > 0 and current_cash < required_cash:
            # Fraction of demand covered
            ratio = min(1.0, current_cash / predicted_demand)
            stockout_minutes = int(round(max(10, min(120, ratio * 120))))
        else:
            stockout_minutes = None

        # 7. AI Explanation
        if risk_level == "CRITICAL":
            explanation = (
                f"CRITICAL RISK: Predicted 2-hr withdrawal demand (₹{predicted_demand:,.0f}) "
                f"exceeds current cash (₹{current_cash:,.0f}) plus safety buffer (₹{safety_buffer:,.0f}). "
                f"Net shortage of ₹{shortage:,.0f} triggers stockout hazard in ~{stockout_minutes or 40} mins."
            )
        elif risk_level == "HIGH":
            explanation = (
                f"HIGH RISK: Current cash balance (₹{current_cash:,.0f}) will dip into the safety buffer "
                f"(₹{safety_buffer:,.0f}) under expected demand (₹{predicted_demand:,.0f}). Shortage: ₹{shortage:,.0f}."
            )
        elif risk_level == "MEDIUM":
            explanation = (
                f"MEDIUM RISK: Minor cash deficit of ₹{shortage:,.0f} against projected demand + 30% reserve buffer."
            )
        else:
            explanation = (
                f"LOW RISK: Cash reserves (₹{current_cash:,.0f}) comfortably cover predicted demand "
                f"(₹{predicted_demand:,.0f}) and safety reserve (₹{safety_buffer:,.0f}) with ₹{surplus:,.0f} surplus."
            )

        return {
            "current_cash": round(current_cash, 2),
            "predicted_demand": round(predicted_demand, 2),
            "safety_buffer": round(safety_buffer, 2),
            "safety_percentage": safety_pct,
            "required_cash": round(required_cash, 2),
            "shortage": round(shortage, 2),
            "surplus": round(surplus, 2),
            "risk_percentage": round(risk_percentage, 1),
            "risk_level": risk_level,
            "stockout_minutes": stockout_minutes,
            "explanation": explanation
        }
