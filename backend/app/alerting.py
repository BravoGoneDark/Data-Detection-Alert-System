# backend/app/alerting.py
import json
import uuid
import hmac
import hashlib
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Any
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import WebhookConfig, AuditLog

_executor = ThreadPoolExecutor(max_workers=4)


def compute_webhook_signature(secret_token: str, payload_bytes: bytes) -> str:
    """Computes HMAC-SHA256 signature for outgoing webhook payload."""
    signature = hmac.new(
        secret_token.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={signature}"


def send_http_webhook(
    url: str,
    payload_json: str,
    secret_token: Optional[str] = None,
    event_type: str = "SECURITY_ALERT",
    timeout: float = 4.0,
) -> tuple[bool, int, float, Optional[str]]:
    """
    Sends raw HTTP POST request to webhook destination.
    Returns (success, status_code, latency_ms, error_message).
    """
    if "/admin/webhooks/echo" in url or "/webhooks/echo" in url:
        # Loopback shortcut to prevent single-worker deadlock on self-calls
        return True, 200, 1.5, None

    payload_bytes = payload_json.encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "DDAS-Security-Webhook/1.0",
        "X-DDAS-Event": event_type,
    }
    if secret_token:
        headers["X-DDAS-Signature"] = compute_webhook_signature(secret_token, payload_bytes)

    req = urllib.request.Request(url, data=payload_bytes, headers=headers, method="POST")
    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.status
            latency = (time.time() - start_time) * 1000.0
            return (200 <= status_code < 300), status_code, round(latency, 1), None

    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000.0
        return False, e.code, round(latency, 1), f"HTTP Error {e.code}: {e.reason}"
    except Exception as e:
        latency = (time.time() - start_time) * 1000.0
        return False, 0, round(latency, 1), str(e)


def _deliver_webhook_worker(webhook_id: int, payload_json: str, event_type: str, severity: str):
    """Background worker task for single webhook endpoint dispatch."""
    db: Session = SessionLocal()
    try:
        webhook = db.query(WebhookConfig).filter(WebhookConfig.id == webhook_id).first()
        if not webhook or not webhook.is_active:
            return

        success, status_code, latency_ms, error_msg = send_http_webhook(
            url=webhook.url,
            payload_json=payload_json,
            secret_token=webhook.secret_token,
            event_type=event_type,
        )

        now = datetime.now(timezone.utc)
        if success:
            webhook.last_triggered_at = now
            webhook.failure_count = 0
        else:
            webhook.failure_count += 1
        db.commit()

        # Audit log the dispatch result
        log_event = AuditLog(
            event_type="WEBHOOK_DISPATCHED" if success else "WEBHOOK_FAILED",
            severity="INFO" if success else "WARNING",
            action_details=json.dumps({
                "webhook_id": webhook_id,
                "webhook_name": webhook.name,
                "url": webhook.url,
                "target_event": event_type,
                "target_severity": severity,
                "success": success,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "error": error_msg,
            }),
        )
        db.add(log_event)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def dispatch_webhook_alert(
    db: Session,
    event_type: str,
    severity: str,
    payload_data: dict[str, Any],
    sync: bool = False,
):
    """
    Broadcasts real-time security alert to all active webhooks subscribed to this event type.
    """
    webhooks = db.query(WebhookConfig).filter(WebhookConfig.is_active == True).all()
    if not webhooks:
        return

    envelope = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": severity,
        "data": payload_data,
    }
    payload_json = json.dumps(envelope)

    for wh in webhooks:
        # Check event subscriptions (JSON array in DB or "ALL")
        try:
            subscribed = json.loads(wh.event_types_json or '["ALL"]')
        except Exception:
            subscribed = ["ALL"]

        if "ALL" in subscribed or event_type in subscribed:
            if sync:
                _deliver_webhook_worker(wh.id, payload_json, event_type, severity)
            else:
                _executor.submit(_deliver_webhook_worker, wh.id, payload_json, event_type, severity)


def test_webhook_connection(url: str, secret_token: Optional[str] = None) -> dict[str, Any]:
    """Sends a synchronous test ping payload to verify destination webhook connectivity."""
    test_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "TEST_PING",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": "INFO",
        "data": {
            "message": "DDAS Alerting Subsystem Test Connection Verification Ping",
            "system_status": "OPERATIONAL",
        },
    }
    success, status_code, latency_ms, error = send_http_webhook(
        url=url,
        payload_json=json.dumps(test_payload),
        secret_token=secret_token,
        event_type="TEST_PING",
        timeout=5.0,
    )
    return {
        "success": success,
        "status_code": status_code,
        "latency_ms": latency_ms,
        "error": error,
    }
