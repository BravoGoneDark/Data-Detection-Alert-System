# backend/app/task_queue.py
"""
DDAS Distributed Async Task Queue & Worker Engine.
Enables asynchronous offloading of computationally intensive operations (e.g.
heavy feature extraction, multi-band LSH indexing, bulk backfills, and batch webhooks)
with real-time state tracking, progress telemetry, cancellation, and Redis Pub/Sub events.
"""
import uuid
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any, Optional, Dict, List
from app.redis_client import get_redis_client, get_cached_json, set_cached_json

logger = logging.getLogger("ddas.tasks")

# Thread pool for asynchronous background worker jobs
_worker_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="ddas-worker")

# Local in-memory task registry (fallback if Redis is unavailable)
_local_task_registry: Dict[str, Dict[str, Any]] = {}
_task_cancellation_flags: Dict[str, bool] = {}


def _make_task_key(task_id: str) -> str:
    return f"ddas:task:{task_id}"


def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full task state dictionary by ID."""
    cached = get_cached_json(_make_task_key(task_id))
    if cached:
        return cached
    return _local_task_registry.get(task_id)


def update_task_progress(
    task_id: str,
    progress: int,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """Updates progress (0-100) and milestone status message for a running task."""
    task = get_task(task_id)
    if not task:
        return

    task["progress"] = min(100, max(0, progress))
    task["message"] = message
    task["status"] = "PROCESSING"
    task["updated_at"] = time.time()
    if details:
        task.setdefault("details", {}).update(details)

    # Persist in Redis and local memory
    _local_task_registry[task_id] = task
    set_cached_json(_make_task_key(task_id), task, ttl_seconds=86400)

    # Broadcast on Redis Pub/Sub if available
    _publish_task_event("PROGRESS", task)


def complete_task(task_id: str, result: Any = None) -> None:
    """Marks a task as COMPLETED with its final result payload."""
    task = get_task(task_id)
    if not task:
        return

    task["status"] = "COMPLETED"
    task["progress"] = 100
    task["message"] = "Execution completed successfully."
    task["result"] = result
    task["completed_at"] = time.time()
    task["updated_at"] = time.time()
    task["execution_time_seconds"] = round(task["completed_at"] - task["started_at"], 3) if task.get("started_at") else 0

    _local_task_registry[task_id] = task
    set_cached_json(_make_task_key(task_id), task, ttl_seconds=86400)
    _publish_task_event("COMPLETED", task)


def fail_task(task_id: str, error: str) -> None:
    """Marks a task as FAILED with error diagnostic info."""
    task = get_task(task_id)
    if not task:
        return

    task["status"] = "FAILED"
    task["error"] = str(error)
    task["message"] = f"Failed: {error}"
    task["completed_at"] = time.time()
    task["updated_at"] = time.time()

    _local_task_registry[task_id] = task
    set_cached_json(_make_task_key(task_id), task, ttl_seconds=86400)
    _publish_task_event("FAILED", task)


def is_task_cancelled(task_id: str) -> bool:
    """Checks whether cancellation was requested for this task."""
    return _task_cancellation_flags.get(task_id, False)


def cancel_task(task_id: str) -> bool:
    """Requests cancellation of a pending or running task."""
    task = get_task(task_id)
    if not task or task["status"] in ("COMPLETED", "FAILED", "CANCELLED"):
        return False

    _task_cancellation_flags[task_id] = True
    task["status"] = "CANCELLED"
    task["message"] = "Task was cancelled by user/admin."
    task["completed_at"] = time.time()
    task["updated_at"] = time.time()

    _local_task_registry[task_id] = task
    set_cached_json(_make_task_key(task_id), task, ttl_seconds=86400)
    _publish_task_event("CANCELLED", task)
    return True


def _publish_task_event(event_type: str, task: Dict[str, Any]) -> None:
    """Emits task state change to Redis Pub/Sub."""
    client = get_redis_client()
    if client:
        try:
            payload = json.dumps({"event": event_type, "task_id": task["task_id"], "status": task["status"], "progress": task["progress"], "message": task["message"]})
            client.publish("ddas:tasks:events", payload)
        except Exception:
            pass


def _worker_wrapper(task_id: str, func: Callable, *args: Any, **kwargs: Any) -> None:
    """Thread wrapper that manages execution lifecycle, exception safety, and completion."""
    task = get_task(task_id)
    if not task:
        return

    task["status"] = "PROCESSING"
    task["started_at"] = time.time()
    task["updated_at"] = time.time()
    _local_task_registry[task_id] = task
    set_cached_json(_make_task_key(task_id), task, ttl_seconds=86400)

    try:
        if is_task_cancelled(task_id):
            return

        result = func(task_id, *args, **kwargs)

        if not is_task_cancelled(task_id):
            complete_task(task_id, result)
    except Exception as e:
        logger.exception("Async background worker error in task %s: %s", task_id, e)
        fail_task(task_id, str(e))
    finally:
        _task_cancellation_flags.pop(task_id, None)


def enqueue_task(
    task_type: str,
    func: Callable,
    *args: Any,
    name: Optional[str] = None,
    created_by: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> str:
    """
    Submits a callable to the background worker pool and initializes its task state.
    Returns:
        task_id: UUID string tracking the queued execution.
    """
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task_name = name or f"{task_type}_{task_id[:8]}"

    task_record: Dict[str, Any] = {
        "task_id": task_id,
        "task_type": task_type,
        "name": task_name,
        "status": "PENDING",
        "progress": 0,
        "message": "Task queued in worker pool.",
        "created_by": created_by or "SYSTEM",
        "created_at": time.time(),
        "started_at": None,
        "completed_at": None,
        "updated_at": time.time(),
        "metadata": metadata or {},
        "result": None,
        "error": None,
    }

    _local_task_registry[task_id] = task_record
    set_cached_json(_make_task_key(task_id), task_record, ttl_seconds=86400)

    # Track in tasks index list in Redis
    client = get_redis_client()
    if client:
        try:
            client.lpush("ddas:tasks:index", task_id)
            client.ltrim("ddas:tasks:index", 0, 99)  # Keep latest 100 tasks
        except Exception:
            pass

    # Dispatch to thread worker
    _worker_pool.submit(_worker_wrapper, task_id, func, *args, **kwargs)
    return task_id


def list_tasks(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lists registered background tasks with optional status filter."""
    task_ids: List[str] = []
    client = get_redis_client()
    if client:
        try:
            raw_ids = client.lrange("ddas:tasks:index", 0, 100)
            task_ids = [tid for tid in raw_ids if tid]
        except Exception:
            pass

    if not task_ids:
        task_ids = list(_local_task_registry.keys())

    all_tasks = []
    for tid in task_ids:
        t = get_task(tid)
        if t:
            if status and t.get("status") != status.upper():
                continue
            all_tasks.append(t)

    # Sort descending by created_at
    all_tasks.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return all_tasks[offset : offset + limit]


def get_task_stats() -> Dict[str, Any]:
    """Returns summary telemetry on active and completed background tasks."""
    tasks = list_tasks(limit=100)
    total = len(tasks)
    pending = sum(1 for t in tasks if t.get("status") == "PENDING")
    processing = sum(1 for t in tasks if t.get("status") == "PROCESSING")
    completed = sum(1 for t in tasks if t.get("status") == "COMPLETED")
    failed = sum(1 for t in tasks if t.get("status") == "FAILED")
    cancelled = sum(1 for t in tasks if t.get("status") == "CANCELLED")

    return {
        "total_tasks": total,
        "active_tasks": pending + processing,
        "processing_tasks": processing,
        "pending_tasks": pending,
        "completed_tasks": completed,
        "failed_tasks": failed,
        "cancelled_tasks": cancelled,
    }
