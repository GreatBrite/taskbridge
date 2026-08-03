from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models import JobStatus, OfferStatus, UserRole


class ContractorProfileOut(BaseModel):
    categories: list[str] = []
    districts: list[str] = []
    languages: list[str] = ["ru"]
    description: str = ""
    is_active: bool = True
    is_verified: bool = False
    rating: int = 0
    completed_jobs: int = 0


class ContractorProfileIn(BaseModel):
    categories: list[str] = []
    districts: list[str] = []
    languages: list[str] = ["ru"]
    description: str = ""
    is_active: bool = True


class UserOut(BaseModel):
    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    language_code: str
    role: UserRole
    city: str
    contractor_profile: ContractorProfileOut | None = None

    model_config = {"from_attributes": True}


class TelegramAuthIn(BaseModel):
    init_data: str = ""
    dev_telegram_id: int | None = None
    username: str | None = None
    first_name: str | None = None
    language_code: str = "ru"


class UserPatch(BaseModel):
    role: UserRole | None = None
    city: str | None = None
    language_code: str | None = None
    contractor_profile: ContractorProfileIn | None = None


class JobDraftIn(BaseModel):
    category: str = Field(min_length=2, max_length=64)
    description: str = Field(min_length=4, max_length=4000)
    city: str | None = None
    district: str = ""
    time_window: str = ""
    budget: str = ""


class BriefOut(BaseModel):
    title: str
    structured_brief: dict[str, Any]
    missing_fields: list[str]
    score: int
    questions: list[str]


class JobOut(BaseModel):
    id: int
    customer_id: int
    category: str
    title: str
    description: str
    city: str
    district: str
    time_window: str
    budget: str
    currency: str
    status: JobStatus
    structured_brief: dict[str, Any]
    missing_fields: list[str]
    selected_offer_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OfferIn(BaseModel):
    price: str = Field(min_length=1, max_length=96)
    eta: str = Field(default="", max_length=160)
    text: str = Field(default="", max_length=2000)


class OfferOut(BaseModel):
    id: int
    job_id: int
    contractor_id: int
    price: str
    eta: str
    text: str
    translated_text: str
    target_lang: str
    status: OfferStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatOut(BaseModel):
    id: int
    job_id: int
    customer_id: int
    contractor_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    original_lang: str = "auto"


class MessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    original_text: str
    original_lang: str
    translated_text: str
    target_lang: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RatingIn(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1200)


class RatingOut(BaseModel):
    id: int
    job_id: int
    reviewer_id: int
    reviewee_id: int
    score: int
    comment: str

    model_config = {"from_attributes": True}


class AdminComplaintIn(BaseModel):
    user_id: int
    reason: str = Field(min_length=3, max_length=1200)


class HealthOut(BaseModel):
    status: Literal["ok"]
    app: str
    environment: str
