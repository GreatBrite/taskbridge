import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import Settings, get_settings
from app.database import get_db
from app.models import User


def validate_telegram_init_data(init_data: str, bot_token: str) -> dict[str, object]:
    if not bot_token:
        raise ValueError("Telegram bot token is not configured")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing Telegram hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("Invalid Telegram signature")

    user_raw = parsed.get("user")
    parsed["user"] = json.loads(user_raw) if user_raw else {}
    return parsed


def get_user_from_init_data(db: Session, init_data: str, settings: Settings) -> User:
    try:
        parsed = validate_telegram_init_data(init_data, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_data = parsed.get("user")
    if not isinstance(user_data, dict) or not user_data.get("id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user is missing")

    return upsert_user_from_telegram(
        db,
        telegram_id=int(user_data["id"]),
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        language_code=user_data.get("language_code") or "ru",
    )


def upsert_user_from_telegram(
    db: Session,
    telegram_id: int,
    username: str | None = None,
    first_name: str | None = None,
    language_code: str = "ru",
) -> User:
    user = db.query(User).filter(User.telegram_id == telegram_id).one_or_none()
    if user:
        user.username = username
        user.first_name = first_name
        user.language_code = language_code or user.language_code
        db.commit()
        db.refresh(user)
        return user

    user = User(telegram_id=telegram_id, username=username, first_name=first_name, language_code=language_code)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "tma" and token:
        return get_user_from_init_data(db, token, settings)

    if scheme.lower() == "dev" and settings.dev_auth_enabled and token.isdigit():
        user = db.query(User).options(joinedload(User.contractor_profile)).filter(User.telegram_id == int(token)).one_or_none()
        if user:
            return user
        return upsert_user_from_telegram(db, telegram_id=int(token), first_name=f"Dev {token}", language_code="ru")

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization")


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
