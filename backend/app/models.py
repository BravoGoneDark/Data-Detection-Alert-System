from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
)

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    sha256 = Column(String(64), index=True, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    classification = Column(String, nullable=True)   # PUBLIC, INTERNAL, RESTRICTED, CONFIDENTIAL
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    storage_path = Column(String, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    description = Column(String, nullable=True)
    columns_json = Column(String, nullable=True)   # JSON-serialized list of column names
    row_count = Column(Integer, nullable=True)
    col_count = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    text_preview = Column(String, nullable=True)   # First 500 chars / summary of content
    top_keywords_json = Column(String, nullable=True)  # JSON-serialized list of top TF-IDF keywords
    simhash = Column(String(18), index=True, nullable=True)  # 64-bit hex fingerprint (e.g. '0xa4f2819c90234bd1')
    minhash_json = Column(String, nullable=True)  # JSON-serialized 64-int signature

    uploader = relationship("User", back_populates="datasets")
    lsh_buckets = relationship("LSHBucket", back_populates="dataset", cascade="all, delete-orphan")


class LSHBucket(Base):
    __tablename__ = "lsh_buckets"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    band_type = Column(String(10), nullable=False)  # 'SIMHASH' or 'MINHASH'
    band_index = Column(Integer, nullable=False)
    bucket_key = Column(String(64), index=True, nullable=False)

    dataset = relationship("Dataset", back_populates="lsh_buckets")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)   # NEW
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = relationship("Role")   # NEW
    datasets = relationship("Dataset", back_populates="uploader")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)   # e.g. "dataset:upload"
    description = Column(String, nullable=True)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)   # e.g. "STUDENT"
    description = Column(String, nullable=True)

    permissions = relationship("Permission", secondary=role_permissions, backref="roles")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String, nullable=True, index=True)
    event_type = Column(String(32), nullable=False, index=True)  # LOGIN_SUCCESS, LOGIN_FAILED, USER_SIGNUP, DATASET_UPLOAD, DUPLICATE_DETECTED, DUPLICATE_OVERRIDE, DATASET_DOWNLOAD, ACCESS_DENIED, LSH_BACKFILL
    severity = Column(String(10), nullable=False, index=True)    # INFO, WARNING, CRITICAL
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    dataset_filename = Column(String, nullable=True)
    classification = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    action_details = Column(String, nullable=True)  # JSON-encoded event details

    user = relationship("User")
    dataset = relationship("Dataset")


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String, nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    dataset_filename = Column(String, nullable=True)
    anomaly_type = Column(String(32), nullable=False, index=True)  # Z_SCORE_SPIKE, BURST_EXFILTRATION, OFF_HOURS_ACCESS, CLASSIFICATION_DRIFT
    severity = Column(String(10), nullable=False, index=True)      # LOW, MEDIUM, HIGH, CRITICAL
    z_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False, default=0.0)        # 0.0 - 100.0
    status = Column(String(16), nullable=False, default="ACTIVE", index=True)  # ACTIVE, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    details_json = Column(String, nullable=True)                   # JSON context payload

    user = relationship("User")
    dataset = relationship("Dataset")


