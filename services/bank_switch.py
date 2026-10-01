import os
import sys
import json
import random
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.db_manager import get_connection
from services.risk_engine import RiskEngine
from services.audit_service import AuditService

DEFAULT_MOCK_ACCOUNTS = [
    {
        "card_number": "4591-1234-5678-3456",
        "card_type": "HDFC Millennia Platinum Debit",
        "bank_code": "HDFC",
        "bank_name": "HDFC Bank",
        "account_number": "HDFC00010928374",
        "holder_name": "Aarav Sharma",
        "pin": "1234",
        "balance": 52400.0,
        "daily_limit": 50000.0
    },
    {
        "card_number": "5044-8765-4321-9012",
        "card_type": "SBI Global International Debit",
        "bank_code": "SBI",
        "bank_name": "State Bank of India",
        "account_number": "SBIN00084729103",
        "holder_name": "Priya Patel",
        "pin": "4321",
        "balance": 35000.0,
        "daily_limit": 40000.0
    },
    {
        "card_number": "4111-2222-3333-4444",
        "card_type": "ICICI Coral Chip Debit Card",
        "bank_code": "ICICI",
        "bank_name": "ICICI Bank",
        "account_number": "ICIC00055443322",
        "holder_name": "Rohan Verma",
        "pin": "1122",
        "balance": 88000.0,
        "daily_limit": 100000.0
    },
    {
        "card_number": "6011-9988-7766-5544",
        "card_type": "Axis Bank Titanium Rewards",
        "bank_code": "AXIS",
        "bank_name": "Axis Bank",
        "account_number": "UTIB00099887766",
        "holder_name": "Ananya Iyer",
        "pin": "9988",
        "balance": 19500.0,
        "daily_limit": 40000.0
    },
    {
        "card_number": "5200-3344-5566-7788",
        "card_type": "PNB RuPay Select Debit",
        "bank_code": "PNB",
        "bank_name": "Punjab National Bank",
        "account_number": "PUNB00012398745",
        "holder_name": "Vikram Singh",
        "pin": "2468",
        "balance": 8200.0,
        "daily_limit": 25000.0
    },
    {
        "card_number": "6521-7788-9900-1122",
        "card_type": "BOB Baroda World Contactless",
        "bank_code": "BOB",
        "bank_name": "Bank of Baroda",
        "account_number": "BARB00077889900",
        "holder_name": "Sneha Kulkarni",
        "pin": "7788",
        "balance": 14800.0,
        "daily_limit": 30000.0
    }
]

class InterbankSwitchService:
    def __init__(self):
        self.risk_engine = RiskEngine()
        self._ensure_bank_accounts_seeded()

    def _ensure_bank_accounts_seeded(self):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM bank_accounts")
            count = cursor.fetchone()["cnt"]
            if count == 0:
                for acc in DEFAULT_MOCK_ACCOUNTS:
                    cursor.execute("""
                        INSERT INTO bank_accounts (
                            card_number, card_type, bank_code, bank_name,
                            account_number, holder_name, pin, balance, daily_limit, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                    """, (
                        acc["card_number"], acc["card_type"], acc["bank_code"], acc["bank_name"],
                        acc["account_number"], acc["holder_name"], acc["pin"], acc["balance"], acc["daily_limit"]
                    ))
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Bank switch seeding notice: {e}")

    def get_supported_banks_and_accounts(self):
        """Returns mock accounts for easy testing in the prototype UI"""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, card_number, card_type, bank_code, bank_name,
                   account_number, holder_name, balance, daily_limit, status, pin
            FROM bank_accounts
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        accounts = []
        for r in rows:
            acc = dict(r)
            # Mask card for security display, but include raw card_number for selection
            acc["masked_card"] = f"•••• •••• •••• {acc['card_number'][-4:]}"
            accounts.append(acc)
        conn.close()
        return accounts

    def get_atm_terminal_info(self, atm_identifier):
        """Retrieve ATM details for the terminal screen"""
        conn = get_connection()
        cursor = conn.cursor()
        if str(atm_identifier).isdigit():
            cursor.execute("SELECT * FROM atms WHERE id = ?", (int(atm_identifier),))
        else:
            cursor.execute("SELECT * FROM atms WHERE atm_code = ?", (str(atm_identifier).upper(),))
        atm = cursor.fetchone()
        conn.close()
        if not atm:
            return None
        return dict(atm)

    def refill_atm_cassette(self, atm_identifier, amount=None):
        """Refills an ATM cassette to full capacity (or specified amount) for prototype testing"""
        conn = get_connection()
        cursor = conn.cursor()
        if str(atm_identifier).isdigit():
            cursor.execute("SELECT * FROM atms WHERE id = ?", (int(atm_identifier),))
        else:
            cursor.execute("SELECT * FROM atms WHERE atm_code = ?", (str(atm_identifier).upper(),))
        atm = cursor.fetchone()
        if not atm:
            conn.close()
            return {"success": False, "error": f"ATM {atm_identifier} not found"}
        
        atm = dict(atm)
        capacity = float(atm.get("capacity", 100000.0))
        refill_cash = float(amount) if amount is not None else capacity
        
        cursor.execute("""
            UPDATE atms
            SET current_cash = ?, shortage = 0, criticality = 'LOW', status = 'NORMAL',
                last_refill = ?
            WHERE id = ?
        """, (refill_cash, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), atm["id"]))
        conn.commit()
        conn.close()
        
        AuditService.log_event(
            event_type="CASSETTE_REFILLED",
            description=f"ATM {atm['atm_code']} cash cassette refilled to ₹{refill_cash:,.0f} (Full Vault Capacity).",
            old_value=f"Cassette: ₹{atm['current_cash']:,.0f}",
            new_value=f"Cassette: ₹{refill_cash:,.0f}",
            decision_reason="Interactive prototype vault reset & replenishment."
        )
        return {"success": True, "atm_code": atm["atm_code"], "current_cash": refill_cash, "capacity": capacity}

    def calculate_dispensed_denominations(self, amount):
        """Calculate realistic cash cassette dispense breakdown (₹500, ₹200, ₹100 notes)"""
        remaining = int(amount)
        notes_500 = remaining // 500
        remaining %= 500

        notes_200 = remaining // 200
        remaining %= 200

        notes_100 = remaining // 100
        remaining %= 100

        return {
            "500": notes_500,
            "200": notes_200,
            "100": notes_100,
            "total_notes": notes_500 + notes_200 + notes_100
        }

    def process_withdrawal(self, atm_identifier, card_number, pin, amount):
        """
        Executes an end-to-end Interbank Switch cash withdrawal:
        1. Validates PIN and card identity.
        2. Verifies customer bank account balance & daily limits.
        3. Verifies ATM physical cash reserves.
        4. Atomically deducts customer balance & ATM machine cash.
        5. Recalculates ATM shortage/criticality risk in CashRouteAI engine.
        6. Logs audit trail & transaction records.
        """
        try:
            amount = float(amount)
        except (ValueError, TypeError):
            return {"success": False, "error": "Invalid withdrawal amount format."}

        if amount <= 0:
            return {"success": False, "error": "Withdrawal amount must be greater than zero."}

        if amount % 100 != 0:
            return {"success": False, "error": "Amount must be a multiple of ₹100 (ATM cassette note sizes)."}

        if amount > 25000:
            return {"success": False, "error": "Per-transaction limit exceeded. Maximum single withdrawal is ₹25,000."}

        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Look up card in bank_accounts
            clean_card = card_number.strip().replace(" ", "").replace("-", "")
            cursor.execute("SELECT * FROM bank_accounts WHERE REPLACE(REPLACE(card_number, '-', ''), ' ', '') = ?", (clean_card,))
            account = cursor.fetchone()

            if not account:
                conn.close()
                return {"success": False, "error": "Card not recognized by Interbank Switch (NFS / NPCI)."}

            account = dict(account)

            if account.get("status") != "ACTIVE":
                conn.close()
                return {"success": False, "error": f"Card is currently {account.get('status')}. Contact issuer bank."}

            if str(account.get("pin")).strip() != str(pin).strip():
                conn.close()
                return {"success": False, "error": "Incorrect ATM PIN. Authorization rejected by issuer bank CBS."}

            if float(account["balance"]) < amount:
                conn.close()
                return {
                    "success": False,
                    "error": f"Insufficient funds in {account['bank_name']} account. Available balance: ₹{account['balance']:,.2f}."
                }

            # 2. Look up ATM machine
            if str(atm_identifier).isdigit():
                cursor.execute("SELECT * FROM atms WHERE id = ?", (int(atm_identifier),))
            else:
                cursor.execute("SELECT * FROM atms WHERE atm_code = ?", (str(atm_identifier).upper(),))
            atm = cursor.fetchone()

            if not atm:
                conn.close()
                return {"success": False, "error": f"ATM Terminal '{atm_identifier}' not found in network."}

            atm = dict(atm)

            if atm.get("status") == "FAILED":
                conn.close()
                return {"success": False, "error": f"ATM {atm['atm_code']} is currently OUT OF SERVICE (Hardware Failure)."}

            atm_cash = float(atm["current_cash"])
            if atm_cash < amount:
                conn.close()
                return {
                    "success": False,
                    "error": f"ATM {atm['atm_code']} cash cassette reserve too low to dispense ₹{amount:,.0f}."
                }

            # 3. Perform atomic deduction
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            now_stamp = datetime.now().strftime("%Y%m%d%H%M%S")
            ref_num = f"NFS-{account['bank_code']}-{now_stamp}-{random.randint(1000, 9999)}"
            auth_code = f"AUTH{random.randint(100000, 999999)}"

            new_customer_balance = float(account["balance"]) - amount
            new_atm_cash = atm_cash - amount

            # Deduct from customer bank account
            cursor.execute("""
                UPDATE bank_accounts
                SET balance = ?
                WHERE id = ?
            """, (new_customer_balance, account["id"]))

            # Recalculate ATM stockout risk via RiskEngine
            predicted_demand = float(atm.get("predicted_demand", 0.0))
            safety_buffer = float(atm.get("safety_buffer", 0.0))
            required_cash = float(atm.get("required_cash", 0.0))
            
            risk_calc = self.risk_engine.calculate_risk(
                current_cash=new_atm_cash,
                predicted_demand=predicted_demand
            )

            # Update ATM balance and updated risk
            cursor.execute("""
                UPDATE atms
                SET current_cash = ?,
                    shortage = ?,
                    surplus = ?,
                    risk_percentage = ?,
                    criticality = ?,
                    explanation = ?,
                    stockout_minutes = ?
                WHERE id = ?
            """, (
                new_atm_cash,
                risk_calc["shortage"],
                risk_calc["surplus"],
                risk_calc["risk_percentage"],
                risk_calc["risk_level"],
                risk_calc["explanation"],
                risk_calc["stockout_minutes"],
                atm["id"]
            ))

            # Record in transactions table
            cursor.execute("""
                INSERT INTO transactions (atm_id, timestamp, withdrawal, deposit, balance)
                VALUES (?, ?, ?, 0.0, ?)
            """, (atm["id"], now_str, amount, new_atm_cash))

            # Record in atm_withdrawals table
            dispensed_notes = self.calculate_dispensed_denominations(amount)
            cursor.execute("""
                INSERT INTO atm_withdrawals (
                    atm_id, atm_code, card_number, bank_code, bank_name,
                    holder_name, amount, dispensed_notes, timestamp,
                    switch_reference, auth_code, status,
                    account_balance_after, atm_cash_after
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?)
            """, (
                atm["id"], atm["atm_code"], account["card_number"], account["bank_code"],
                account["bank_name"], account["holder_name"], amount, json.dumps(dispensed_notes),
                now_str, ref_num, auth_code, new_customer_balance, new_atm_cash
            ))
            withdrawal_id = cursor.lastrowid

            conn.commit()
            conn.close()

            # Log audit event
            AuditService.log_event(
                event_type="ATM_WITHDRAWAL_SUCCESS",
                description=(
                    f"Customer {account['holder_name']} withdrew ₹{amount:,.0f} from {atm['atm_code']} "
                    f"via {account['bank_name']}. NFS Switch Auth: {auth_code}."
                ),
                old_value=f"ATM Cash: ₹{atm_cash:,.0f} | Account: ₹{account['balance']:,.0f}",
                new_value=f"ATM Cash: ₹{new_atm_cash:,.0f} | Account: ₹{new_customer_balance:,.0f}",
                decision_reason=f"Interbank switch 0200 Financial Request validated. ATM risk updated to {risk_calc['risk_level']}."
            )

            return {
                "success": True,
                "withdrawal_id": withdrawal_id,
                "atm_code": atm["atm_code"],
                "atm_name": atm.get("name", f"ATM {atm['atm_code']}"),
                "atm_city": atm.get("city", "Izmir"),
                "bank_code": account["bank_code"],
                "bank_name": account["bank_name"],
                "card_number_masked": f"•••• •••• •••• {account['card_number'][-4:]}",
                "holder_name": account["holder_name"],
                "amount": amount,
                "dispensed_notes": dispensed_notes,
                "switch_reference": ref_num,
                "auth_code": auth_code,
                "interbank_switch": "National Financial Switch (NFS / NPCI)",
                "account_balance_after": new_customer_balance,
                "atm_cash_after": new_atm_cash,
                "atm_risk_level": risk_calc["risk_level"],
                "atm_shortage": risk_calc["shortage"],
                "stockout_minutes": risk_calc["stockout_minutes"],
                "timestamp": now_str,
                "iso_message": "0210 FINANCIAL TRANSACTION RESPONSE - 00 APPROVED"
            }

        except Exception as e:
            if conn:
                conn.rollback()
                conn.close()
            return {"success": False, "error": f"Switch processing error: {str(e)}"}

    def get_recent_withdrawals(self, limit=20):
        """Retrieve recent withdrawal activity"""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM atm_withdrawals
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
