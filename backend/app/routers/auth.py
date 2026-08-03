from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas import TelegramAuthIn, UserOut
from app.security import get_user_from_init_data, upsert_user_from_telegram

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=UserOut)
def auth_telegram(payload: TelegramAuthIn, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> UserOut:
    if payload.init_data:
        return get_user_from_init_data(db, payload.init_data, settings)
    if settings.dev_auth_enabled and payload.dev_telegram_id:
        return upsert_user_from_telegram(
            db,
            telegram_id=payload.dev_telegram_id,
            username=payload.username,
            first_name=payload.first_name,
            language_code=payload.language_code,
        )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="init_data or dev_telegram_id is required")
