import os
import sys
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.db_manager import get_connection

class AuditService:
    @staticmethod
    def log_event(event_type, description, old_value=None, new_value=None, decision_reason=None):
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, event_type, description, old_value, new_value, decision_reason)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now_str, event_type, description, str(old_value) if old_value is not None else None,
              str(new_value) if new_value is not None else None, decision_reason))
        conn.commit()
        conn.close()

    @staticmethod
    def get_logs(limit=50, event_type=None):
        conn = get_connection()
        cursor = conn.cursor()
        if event_type:
            cursor.execute("""
                SELECT * FROM audit_logs
                WHERE event_type = ?
                ORDER BY id DESC LIMIT ?
            """, (event_type, limit))
        else:
            cursor.execute("""
                SELECT * FROM audit_logs
                ORDER BY id DESC LIMIT ?
            """, (limit,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
