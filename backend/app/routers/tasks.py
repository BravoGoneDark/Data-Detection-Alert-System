# backend/app/routers/tasks.py
"""
DDAS Asynchronous Background Task Management Router.
Provides endpoints to poll task progress, list active/historical jobs,
and cancel long-running worker operations.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.authorization import require_permission
from app.models import User
from app.task_queue import get_task, list_tasks, cancel_task, get_task_stats

router = APIRouter(prefix="", tags=["Async Background Tasks"])


class TaskStatusOut(BaseModel):
    task_id: str
    task_type: str
    name: str
    status: str
    progress: int
    message: str
    created_by: str
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    execution_time_seconds: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TaskStatsOut(BaseModel):
    total_tasks: int
    active_tasks: int
    processing_tasks: int
    pending_tasks: int
    completed_tasks: int
    failed_tasks: int
    cancelled_tasks: int


@router.get("/tasks/{task_id}", response_model=TaskStatusOut)
def poll_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Polls the real-time execution status, progress percentage, and results
    of an asynchronous background worker task.
    """
    task = get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found in registry.",
        )
    return task


@router.post("/tasks/{task_id}/cancel")
def cancel_running_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Cancels a pending or running background worker task.
    """
    task = get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    # Allow user who created the task or admin to cancel
    if task.get("created_by") != current_user.username and current_user.role.name not in ("ADMIN", "ANALYST"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this task.",
        )

    success = cancel_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task '{task_id}' cannot be cancelled (current state: {task.get('status')}).",
        )
    return {"message": f"Task '{task_id}' cancelled successfully.", "task_id": task_id}


@router.get("/admin/tasks", response_model=List[TaskStatusOut])
def get_admin_task_list(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_permission("security:view")),
):
    """
    Lists background tasks in the system with optional status filtering.
    """
    return list_tasks(limit=limit, offset=offset, status=status_filter)


@router.get("/admin/tasks/stats", response_model=TaskStatsOut)
def get_admin_task_telemetry(
    current_user: User = Depends(require_permission("security:view")),
):
    """
    Returns aggregate operational telemetry on active, processing, and completed background tasks.
    """
    return get_task_stats()
