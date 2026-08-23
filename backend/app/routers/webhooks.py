# backend/app/routers/webhooks.py
import json
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, WebhookConfig
from app.authorization import require_permission
from app.alerting import test_webhook_connection
from app.audit_logger import record_audit_event
from app.schemas import (
    WebhookConfigCreate,
    WebhookConfigOut,
    WebhookTestRequest,
    WebhookTestResponse,
)

router = APIRouter(prefix="/admin/webhooks", tags=["Outbound Security Webhooks"])


@router.get("", response_model=list[WebhookConfigOut])
async def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Lists all configured outbound security webhooks."""
    webhooks = db.query(WebhookConfig).order_by(desc(WebhookConfig.created_at)).all()
    results = []
    for wh in webhooks:
        try:
            ev_types = json.loads(wh.event_types_json or '["ALL"]')
        except Exception:
            ev_types = ["ALL"]

        results.append(
            WebhookConfigOut(
                id=wh.id,
                name=wh.name,
                url=wh.url,
                event_types=ev_types,
                is_active=wh.is_active,
                created_at=wh.created_at,
                last_triggered_at=wh.last_triggered_at,
                failure_count=wh.failure_count,
            )
        )
    return results


@router.post("", response_model=WebhookConfigOut)
async def create_webhook(
    payload: WebhookConfigCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    """Registers a new outbound security webhook endpoint."""
    wh = WebhookConfig(
        name=payload.name,
        url=payload.url,
        secret_token=payload.secret_token,
        event_types_json=json.dumps(payload.event_types or ["ALL"]),
        is_active=True,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    record_audit_event(
        db=db,
        event_type="WEBHOOK_CREATED",
        severity="INFO",
        user=current_user,
        request=request,
        details={"webhook_id": wh.id, "name": wh.name, "url": wh.url},
    )

    try:
        ev_types = json.loads(wh.event_types_json)
    except Exception:
        ev_types = ["ALL"]

    return WebhookConfigOut(
        id=wh.id,
        name=wh.name,
        url=wh.url,
        event_types=ev_types,
        is_active=wh.is_active,
        created_at=wh.created_at,
        last_triggered_at=wh.last_triggered_at,
        failure_count=wh.failure_count,
    )


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    """Deletes an outbound security webhook endpoint."""
    wh = db.query(WebhookConfig).filter(WebhookConfig.id == webhook_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook configuration not found")

    wh_name = wh.name
    wh_url = wh.url
    db.delete(wh)
    db.commit()

    record_audit_event(
        db=db,
        event_type="WEBHOOK_DELETED",
        severity="INFO",
        user=current_user,
        request=request,
        details={"webhook_id": webhook_id, "name": wh_name, "url": wh_url},
    )
    return {"detail": f"Webhook '{wh_name}' deleted successfully"}


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_existing_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Triggers an immediate test ping against an existing registered webhook."""
    wh = db.query(WebhookConfig).filter(WebhookConfig.id == webhook_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook configuration not found")

    res = await asyncio.to_thread(test_webhook_connection, url=wh.url, secret_token=wh.secret_token)
    return WebhookTestResponse(
        success=res["success"],
        status_code=res["status_code"],
        latency_ms=res["latency_ms"],
        error=res["error"],
    )


@router.post("/test-connection", response_model=WebhookTestResponse)
async def test_adhoc_connection(
    payload: WebhookTestRequest,
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Verifies connectivity against an arbitrary webhook URL prior to registration."""
    res = await asyncio.to_thread(test_webhook_connection, url=payload.url, secret_token=payload.secret_token)
    return WebhookTestResponse(
        success=res["success"],
        status_code=res["status_code"],
        latency_ms=res["latency_ms"],
        error=res["error"],
    )



@router.post("/echo")
async def webhook_mock_echo(request: Request):
    """Built-in loopback echo receiver for offline/local webhook testing."""
    body_bytes = await request.body()
    return {
        "status": "delivered",
        "message": "DDAS Built-in Webhook Echo Receiver successfully accepted alert payload",
        "signature_received": request.headers.get("x-ddas-signature") or request.headers.get("X-DDAS-Signature"),
        "event_received": request.headers.get("x-ddas-event") or request.headers.get("X-DDAS-Event"),
        "payload_size_bytes": len(body_bytes),
    }

