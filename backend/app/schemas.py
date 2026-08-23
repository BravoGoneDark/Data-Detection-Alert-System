# backend/app/schemas.py
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class ScoreBreakdown(BaseModel):
    filename_similarity: float
    schema_similarity: float
    size_proximity: float
    row_proximity: float | None = None


class ExistingDataset(BaseModel):
    id: int
    filename: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime
    classification: str | None = "INTERNAL"
    uploader_username: str | None = None
    download_count: int = 0
    description: str | None = None
    columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    mime_type: str | None = None
    top_keywords: list[str] = []
    text_preview: str | None = None
    simhash: str | None = None
    hamming_distance: int | None = None

    class Config:
        from_attributes = True


class UploadResult(BaseModel):
    id: int | None = None
    filename: str
    sha256: str
    size_bytes: int
    duplicate: bool
    match_type: str = "UNIQUE"  # "UNIQUE", "EXACT", "FUZZY_SIMILAR", "CONTENT_SIMILAR", "METADATA_SIMILAR"
    similarity_score: float = 0.0
    hamming_distance: int | None = None
    simhash: str | None = None
    score_breakdown: ScoreBreakdown | None = None
    classification: str | None = None
    extracted_columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    top_keywords: list[str] = []
    shared_keywords: list[str] = []
    text_preview: str | None = None
    existing: ExistingDataset | None = None


class DatasetOut(BaseModel):
    id: int
    filename: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime
    classification: str | None = "INTERNAL"
    uploader_username: str | None = None
    download_count: int = 0
    description: str | None = None
    columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    mime_type: str | None = None
    top_keywords: list[str] = []
    text_preview: str | None = None
    simhash: str | None = None

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: Optional[str] = None
    event_type: str
    severity: str
    dataset_id: Optional[int] = None
    dataset_filename: Optional[str] = None
    classification: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    action_details: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogsResponse(BaseModel):
    total: int
    count: int
    logs: list[AuditLogOut]


class AuditStatsResponse(BaseModel):
    total_events: int
    severity_breakdown: dict[str, int]
    event_type_breakdown: dict[str, int]
    top_denied_users: list[dict[str, Any]]


class AnomalyEventOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: str
    dataset_id: Optional[int] = None
    dataset_filename: Optional[str] = None
    anomaly_type: str
    severity: str
    z_score: Optional[float] = None
    risk_score: float
    status: str
    details_json: Optional[str] = None

    class Config:
        from_attributes = True


class AnomalyEventsResponse(BaseModel):
    total: int
    count: int
    anomalies: list[AnomalyEventOut]


class AnomalyStatsResponse(BaseModel):
    total_anomalies: int
    active_threats: int
    severity_breakdown: dict[str, int]
    anomaly_type_breakdown: dict[str, int]
    status_breakdown: dict[str, int]
    highest_risk_users: list[dict[str, Any]]


class AnomalyResolveRequest(BaseModel):
    status: str  # "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"
    notes: Optional[str] = None


class QuarantineRecordOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    ip_address: Optional[str] = None
    reason: str
    trigger_anomaly_id: Optional[int] = None
    risk_score: float
    status: str
    quarantined_at: datetime
    released_at: Optional[datetime] = None
    released_by: Optional[str] = None
    release_notes: Optional[str] = None

    class Config:
        from_attributes = True


class QuarantineListResponse(BaseModel):
    total: int
    count: int
    records: list[QuarantineRecordOut]


class QuarantineStatsResponse(BaseModel):
    active_quarantines: int
    total_quarantined_all_time: int
    status_breakdown: dict[str, int]


class ManualQuarantineRequest(BaseModel):
    username: str
    reason: str
    risk_score: Optional[float] = 85.0


class QuarantineReleaseRequest(BaseModel):
    release_notes: str


class QuarantineStatusResponse(BaseModel):
    is_quarantined: bool
    record: Optional[QuarantineRecordOut] = None


class WebhookConfigCreate(BaseModel):
    name: str
    url: str
    secret_token: Optional[str] = None
    event_types: list[str] = ["ALL"]


class WebhookConfigOut(BaseModel):
    id: int
    name: str
    url: str
    event_types: list[str] = []
    is_active: bool
    created_at: datetime
    last_triggered_at: Optional[datetime] = None
    failure_count: int = 0

    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    url: str
    secret_token: Optional[str] = None


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: int
    latency_ms: float
    error: Optional[str] = None


