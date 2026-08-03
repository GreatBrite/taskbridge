from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database import Base


JsonDict = MutableDict.as_mutable(JSON().with_variant(JSONB, "postgresql"))
JsonList = MutableList.as_mutable(JSON().with_variant(JSONB, "postgresql"))


class UserRole(StrEnum):
    customer = "customer"
    contractor = "contractor"
    both = "both"
    admin = "admin"


class JobStatus(StrEnum):
    draft = "draft"
    published = "published"
    offer_received = "offer_received"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class OfferStatus(StrEnum):
    pending = "pending"
    selected = "selected"
    declined = "declined"


class NotificationStatus(StrEnum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(128))
    first_name: Mapped[str | None] = mapped_column(String(128))
    language_code: Mapped[str] = mapped_column(String(8), default="ru")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.customer)
    city: Mapped[str] = mapped_column(String(96), default="Tbilisi")
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contractor_profile: Mapped["ContractorProfile | None"] = relationship(back_populates="user", uselist=False)


class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    categories: Mapped[list[str]] = mapped_column(JsonList, default=list)
    districts: Mapped[list[str]] = mapped_column(JsonList, default=list)
    languages: Mapped[list[str]] = mapped_column(JsonList, default=lambda: ["ru"])
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    rating: Mapped[int] = mapped_column(Integer, default=0)
    completed_jobs: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship(back_populates="contractor_profile")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(160), default="")
    description: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(96), default="Tbilisi")
    district: Mapped[str] = mapped_column(String(96), default="")
    time_window: Mapped[str] = mapped_column(String(160), default="")
    budget: Mapped[str] = mapped_column(String(96), default="")
    currency: Mapped[str] = mapped_column(String(8), default="GEL")
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.draft, index=True)
    structured_brief: Mapped[dict] = mapped_column(JsonDict, default=dict)
    missing_fields: Mapped[list[str]] = mapped_column(JsonList, default=list)
    selected_offer_id: Mapped[int | None] = mapped_column(ForeignKey("offers.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class JobTranslation(Base):
    __tablename__ = "job_translations"
    __table_args__ = (UniqueConstraint("job_id", "target_lang", name="uq_job_translation_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    target_lang: Mapped[str] = mapped_column(String(8), index=True)
    translated_title: Mapped[str] = mapped_column(String(160))
    translated_brief: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(32), default="mock")


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    contractor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    price: Mapped[str] = mapped_column(String(96))
    eta: Mapped[str] = mapped_column(String(160), default="")
    text: Mapped[str] = mapped_column(Text, default="")
    translated_text: Mapped[str] = mapped_column(Text, default="")
    target_lang: Mapped[str] = mapped_column(String(8), default="ru")
    status: Mapped[OfferStatus] = mapped_column(Enum(OfferStatus), default=OfferStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Chat(Base):
    __tablename__ = "chats"
    __table_args__ = (UniqueConstraint("job_id", "customer_id", "contractor_id", name="uq_job_chat_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    contractor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    original_text: Mapped[str] = mapped_column(Text)
    original_lang: Mapped[str] = mapped_column(String(8), default="auto")
    translated_text: Mapped[str] = mapped_column(Text, default="")
    target_lang: Mapped[str] = mapped_column(String(8), default="ru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reviewee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JsonDict, default=dict)
    status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus), default=NotificationStatus.pending)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(96), index=True)
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict] = mapped_column(JsonDict, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
