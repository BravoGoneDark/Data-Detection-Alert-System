from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Table
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
    sha256 = Column(String(64), unique=True, index=True, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    classification = Column(String, nullable=True)   # NEW — unused until Stage 5


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)   # NEW
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = relationship("Role")   # NEW

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
